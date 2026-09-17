import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { CrearInvitacionResponse } from "@event-promotion/shared-types";
import { pool } from "../db/pool.js";
import { withTransaction } from "../shared/db-transaction.js";
import { HttpError } from "../shared/http-error.js";
import { enviarEmail } from "../shared/mailer.js";
import { crearNotificacionPendiente, marcarNotificacionEnviada, marcarNotificacionFallida } from "../shared/notificaciones.js";
import { esViolacionDeUnicidad } from "../shared/pg-error.js";

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

export async function loginAdmin(email: string, password: string): Promise<SesionAdmin> {
  const { rows } = await pool.query<AdminUserRow>(
    "SELECT idusuario, password_hash FROM admin_users WHERE email = $1",
    [email],
  );
  const admin = rows[0];
  if (!admin) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }
  const passwordValida = await bcrypt.compare(password, admin.password_hash);
  if (!passwordValida) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }
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
