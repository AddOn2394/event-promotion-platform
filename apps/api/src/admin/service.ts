import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type {
  ConfirmacionAdmin,
  CrearInvitacionResponse,
  EstadoInvitacionAdmin,
  InvitacionAdmin,
  ReenviarCodigoResponse,
} from "@event-promotion/shared-types";
import { pool } from "../db/pool.js";
import { withTransaction } from "../shared/db-transaction.js";
import { HttpError } from "../shared/http-error.js";
import { enviarEmail } from "../shared/mailer.js";
import { crearNotificacionPendiente, marcarNotificacionEnviada, marcarNotificacionFallida } from "../shared/notificaciones.js";
import { esViolacionDeUnicidad } from "../shared/pg-error.js";
import { intentosFallidosExcedidos, limpiarIntentosFallidos, registrarIntentoFallido } from "../shared/rate-limit.js";

type AdminUserRow = {
  idusuario: string;
  password_hash: string;
};

export type SesionAdmin = {
  idusuario: string;
  email: string;
};

// Mismo criterio de "no enumeration" que HU-2 (buena práctica de seguridad estándar,
// no una regla de negocio distinta para admin).
const CREDENCIALES_INVALIDAS = "Email o contraseña inválidos.";
const DEMASIADOS_INTENTOS = "Demasiados intentos. Probá de nuevo en unos minutos.";

// ADR-022 (arrastrado explícitamente de Gate 4 a Gate 5): mismo mecanismo que el login de
// cliente (shared/rate-limit.ts), pero con scope="admin" — un ataque contra el email del
// admin en /auth/login no debe poder bloquear /admin/auth/login.
export async function loginAdmin(email: string, password: string): Promise<SesionAdmin> {
  if (await intentosFallidosExcedidos(email, "admin")) {
    throw new HttpError(429, DEMASIADOS_INTENTOS);
  }

  const { rows } = await pool.query<AdminUserRow>(
    "SELECT idusuario, password_hash FROM admin_users WHERE email = $1",
    [email],
  );
  const admin = rows[0];
  if (!admin) {
    await registrarIntentoFallido(email, "admin");
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }
  const passwordValida = await bcrypt.compare(password, admin.password_hash);
  if (!passwordValida) {
    await registrarIntentoFallido(email, "admin");
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }
  await limpiarIntentosFallidos(email, "admin");
  return { idusuario: admin.idusuario, email };
}

function generarCodigoAcceso(): string {
  return randomInt(100_000, 1_000_000).toString();
}

function construirLinkInvitacion(email: string): string {
  const base = process.env.FRONTEND_URL;
  if (!base) {
    throw new Error("FRONTEND_URL no está configurada.");
  }
  return `${base}/login?email=${encodeURIComponent(email)}`;
}

function invitacionEmailHtml(codigo: string, link: string): string {
  return `
    <p>Fuiste invitado a confirmar tu asistencia a la feria de promociones.</p>
    <p>Tu código de acceso es: <strong>${codigo}</strong></p>
    <p><a href="${link}">Ingresá aquí para confirmar tu asistencia</a></p>
  `;
}

export async function crearInvitacion(params: {
  email: string;
  nombreCliente: string | null;
}): Promise<CrearInvitacionResponse> {
  const codigo = generarCodigoAcceso();
  const codigoHash = await bcrypt.hash(codigo, 10);

  let creado: { idinvitacion: string; creadaEn: Date; idnotificacion: string };
  try {
    creado = await withTransaction(pool, async (client) => {
      const { rows } = await client.query<{ idinvitacion: string; creada_en: Date }>(
        `INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash)
         VALUES ($1, $2, $3)
         RETURNING idinvitacion, creada_en`,
        [params.email, params.nombreCliente, codigoHash],
      );
      const invitacion = rows[0];
      if (!invitacion) {
        throw new Error("No se pudo crear la invitación.");
      }
      const idnotificacion = await crearNotificacionPendiente(client, {
        idinvitacion: invitacion.idinvitacion,
        idconfirmacion: null,
        tipo: "invitacion",
      });
      return { idinvitacion: invitacion.idinvitacion, creadaEn: invitacion.creada_en, idnotificacion };
    });
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      // HU-1: no se crea una invitación duplicada. El reenvío (HU-11, ADR-026: genera
      // código nuevo, no recupera el original) es una pantalla de Gate 5 — por ahora
      // se rechaza explícitamente.
      throw new HttpError(409, "Ya existe una invitación para este email.");
    }
    throw error;
  }

  const link = construirLinkInvitacion(params.email);
  const resultadoEnvio = await enviarEmail({
    to: params.email,
    subject: "Tu código de acceso — Feria de Promociones",
    html: invitacionEmailHtml(codigo, link),
  });

  if (resultadoEnvio.exito) {
    await marcarNotificacionEnviada(pool, creado.idnotificacion, resultadoEnvio.idMensaje);
  } else {
    await marcarNotificacionFallida(pool, creado.idnotificacion);
  }

  return {
    idinvitacion: creado.idinvitacion,
    email: params.email,
    nombreCliente: params.nombreCliente,
    creadaEn: creado.creadaEn.toISOString(),
  };
}

type InvitacionConEstadoRow = {
  idinvitacion: string;
  email: string;
  nombre_cliente: string | null;
  creada_en: Date;
  usada_en: Date | null;
  confirmacion_estado: "confirmada" | "cancelada" | null;
  invitacion_estado_envio: "pendiente" | "enviado" | "fallido" | "rebotado" | null;
};

// HU-8: los 4 estados nunca se agrupan (ADR-024) — una fila con confirmación usa su
// propio estado; sin confirmación, un rebote de la notificación de invitación es
// "rebotada", y su ausencia es "sin respuesta" (independiente de usada_en: ADR-024
// distingue "rebotada" de "sin respuesta" incluso si el cliente sí llegó a loguearse
// después de que el correo original rebotó — el rebote es del correo, no de la sesión).
function calcularEstadoInvitacion(row: InvitacionConEstadoRow): EstadoInvitacionAdmin {
  if (row.confirmacion_estado) return row.confirmacion_estado;
  if (row.invitacion_estado_envio === "rebotado") return "rebotada";
  return "sin_respuesta";
}

// HU-11: lista sobre la que ventas cuelga el botón "Reenviar código" — no hay endpoint
// dedicado en spec/SPEC_FUNCIONAL.md §8, pero HU-11 dice "mismo botón/pantalla que HU-1",
// que hoy solo tiene un formulario de creación (InvitacionesPage.tsx no lista nada).
export async function listarInvitaciones(): Promise<InvitacionAdmin[]> {
  const { rows } = await pool.query<InvitacionConEstadoRow>(
    `SELECT i.idinvitacion, i.email, i.nombre_cliente, i.creada_en, i.usada_en,
            c.estado AS confirmacion_estado,
            latest_notif.estado_envio AS invitacion_estado_envio
     FROM invitaciones i
     LEFT JOIN confirmaciones c ON c.idinvitacion = i.idinvitacion
     LEFT JOIN LATERAL (
       SELECT n.estado_envio FROM notificaciones n
       WHERE n.idinvitacion = i.idinvitacion AND n.tipo = 'invitacion'
       ORDER BY n.creada_en DESC LIMIT 1
     ) latest_notif ON true
     ORDER BY i.creada_en DESC`,
  );
  return rows.map((row) => ({
    idinvitacion: row.idinvitacion,
    email: row.email,
    nombreCliente: row.nombre_cliente,
    creadaEn: row.creada_en.toISOString(),
    estado: calcularEstadoInvitacion(row),
  }));
}

// HU-11 (ADR-026): genera un código nuevo, lo hashea y sobreescribe codigo_acceso_hash —
// reutiliza generarCodigoAcceso/invitacionEmailHtml/construirLinkInvitacion, el mismo
// patrón de crearInvitacion, sin reimplementarlo. No revoca JWTs ya emitidos (ADR-026):
// invalidar el código solo impide un login *nuevo* con el código viejo.
export async function reenviarCodigo(idinvitacion: string): Promise<ReenviarCodigoResponse> {
  const { rows } = await pool.query<{ email: string }>(
    "SELECT email FROM invitaciones WHERE idinvitacion = $1",
    [idinvitacion],
  );
  const invitacion = rows[0];
  if (!invitacion) {
    throw new HttpError(404, "Invitación no encontrada.");
  }

  const codigo = generarCodigoAcceso();
  const codigoHash = await bcrypt.hash(codigo, 10);

  const idnotificacion = await withTransaction(pool, async (client) => {
    await client.query("UPDATE invitaciones SET codigo_acceso_hash = $1 WHERE idinvitacion = $2", [
      codigoHash,
      idinvitacion,
    ]);
    return crearNotificacionPendiente(client, {
      idinvitacion,
      idconfirmacion: null,
      tipo: "invitacion",
    });
  });

  const link = construirLinkInvitacion(invitacion.email);
  const resultadoEnvio = await enviarEmail({
    to: invitacion.email,
    subject: "Tu nuevo código de acceso — Feria de Promociones",
    html: invitacionEmailHtml(codigo, link),
  });

  if (resultadoEnvio.exito) {
    await marcarNotificacionEnviada(pool, idnotificacion, resultadoEnvio.idMensaje);
  } else {
    await marcarNotificacionFallida(pool, idnotificacion);
  }

  // Un reenvío entrega un código válido nuevo — un lockout de ADR-022 causado por
  // intentos fallidos con el código viejo/perdido no debe seguir bloqueando al cliente
  // ahora que tiene uno correcto en la mano.
  await limpiarIntentosFallidos(invitacion.email, "cliente");

  return { idinvitacion };
}

type ConfirmacionAdminRow = InvitacionConEstadoRow & {
  idslot: string | null;
  fecha_hora_inicio: Date | null;
  fecha_hora_fin: Date | null;
  subtotal_servicios_cents: number | null;
  descuento_servicios_pct: number | null;
  subtotal_productos_cents: number | null;
  descuento_productos_pct: number | null;
  total_cents: number | null;
  items: { nombre: string; categoria: "servicio" | "producto" }[];
};

function toConfirmacionAdmin(row: ConfirmacionAdminRow): ConfirmacionAdmin {
  return {
    idinvitacion: row.idinvitacion,
    email: row.email,
    nombreCliente: row.nombre_cliente,
    estado: calcularEstadoInvitacion(row),
    slot:
      row.fecha_hora_inicio && row.fecha_hora_fin
        ? { fechaHoraInicio: row.fecha_hora_inicio.toISOString(), fechaHoraFin: row.fecha_hora_fin.toISOString() }
        : null,
    items: row.items,
    subtotalServiciosCents: row.subtotal_servicios_cents,
    descuentoServiciosPct: row.descuento_servicios_pct,
    subtotalProductosCents: row.subtotal_productos_cents,
    descuentoProductosPct: row.descuento_productos_pct,
    totalCents: row.total_cents,
  };
}

// HU-8: invitacion-centrico (LEFT JOIN confirmaciones), no confirmacion-centrico — "sin
// respuesta" y "rebotada" son estados de invitaciones SIN fila en confirmaciones, así que
// partir de confirmaciones las dejaría estructuralmente fuera del listado. Los ítems y
// montos vienen del snapshot congelado (confirmacion_items / confirmaciones.*_snapshot,
// ADR-006) — nunca un join contra catalogo_items ni un recálculo contra la configuración
// de descuento vigente (ADR-023, HU-8 último criterio).
export async function listarConfirmacionesAdmin(filtroEstado?: EstadoInvitacionAdmin): Promise<ConfirmacionAdmin[]> {
  const { rows } = await pool.query<ConfirmacionAdminRow>(
    `SELECT i.idinvitacion, i.email, i.nombre_cliente, i.creada_en, i.usada_en,
            c.estado AS confirmacion_estado, c.idslot,
            s.fecha_hora_inicio, s.fecha_hora_fin,
            c.subtotal_servicios_cents, c.descuento_servicios_pct,
            c.subtotal_productos_cents, c.descuento_productos_pct, c.total_cents,
            latest_notif.estado_envio AS invitacion_estado_envio,
            COALESCE(items.items, '[]'::json) AS items
     FROM invitaciones i
     LEFT JOIN confirmaciones c ON c.idinvitacion = i.idinvitacion
     LEFT JOIN slots s ON s.idslot = c.idslot
     LEFT JOIN LATERAL (
       SELECT n.estado_envio FROM notificaciones n
       WHERE n.idinvitacion = i.idinvitacion AND n.tipo = 'invitacion'
       ORDER BY n.creada_en DESC LIMIT 1
     ) latest_notif ON true
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object('nombre', ci.nombre_snapshot, 'categoria', ci.categoria_snapshot)) AS items
       FROM confirmacion_items ci
       WHERE ci.idconfirmacion = c.idconfirmacion
     ) items ON true
     ORDER BY i.creada_en DESC`,
  );
  const confirmaciones = rows.map(toConfirmacionAdmin);
  return filtroEstado ? confirmaciones.filter((c) => c.estado === filtroEstado) : confirmaciones;
}

function centsAQuetzales(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

// nombreCliente es texto libre que el propio cliente controla (HU-3/HU-4) — un valor que
// empieza con =/+/-/@ se interpreta como fórmula al abrir el CSV en Excel/Sheets (CSV
// injection). Se neutraliza con un apóstrofe inicial, el mitigante estándar, antes del
// escapado de comillas/comas que ya existía.
// OWASP CSV injection: además de =/+/-/@, un tab o un retorno de carro al inicio también
// dispara una fórmula en algunos importadores de hoja de cálculo (los strippean antes de
// parsear la celda, dejando expuesto el caracter que sigue).
function csvEscapar(valorOriginal: string): string {
  const valor = /^[=+\-@\t\r]/.test(valorOriginal) ? `'${valorOriginal}` : valorOriginal;
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

// HU-8/ADR-013: columnas fijas del CSV. ADR-013 pedía "nombre, apellidos" pero el modelo
// de datos (invitaciones.nombre_cliente) solo tiene un campo libre de nombre completo
// desde Gate 2 — no existe un campo apellidos que separar sin inventar una regla de split
// no pedida por el spec. Ratificado con el líder del proyecto: una sola columna "nombre"
// con el valor completo, "apellidos" se omite (ver spec/todo.md walkthrough de Gate 5).
const CSV_ENCABEZADOS = [
  "nombre",
  "email",
  "slot",
  "servicios",
  "productos",
  "subtotal servicios",
  "% descuento servicios",
  "subtotal productos",
  "% descuento productos",
  "total",
  "estado",
];

export async function exportarConfirmacionesCsv(): Promise<string> {
  const confirmaciones = await listarConfirmacionesAdmin();
  const filas = confirmaciones.map((c) => {
    const servicios = c.items.filter((item) => item.categoria === "servicio").map((item) => item.nombre);
    const productos = c.items.filter((item) => item.categoria === "producto").map((item) => item.nombre);
    return [
      c.nombreCliente ?? "",
      c.email,
      c.slot ? new Date(c.slot.fechaHoraInicio).toISOString() : "",
      servicios.join("; "),
      productos.join("; "),
      centsAQuetzales(c.subtotalServiciosCents),
      c.descuentoServiciosPct?.toString() ?? "",
      centsAQuetzales(c.subtotalProductosCents),
      c.descuentoProductosPct?.toString() ?? "",
      centsAQuetzales(c.totalCents),
      c.estado,
    ]
      .map((valor) => csvEscapar(String(valor)))
      .join(",");
  });
  return [CSV_ENCABEZADOS.join(","), ...filas].join("\n");
}
