import type {
  CancelarConfirmacionResponse,
  ConfirmacionPropiaResponse,
  ConfirmarAsistenciaRequest,
  ConfirmarAsistenciaResponse,
  EditarConfirmacionRequest,
  EditarConfirmacionResponse,
} from "@event-promotion/shared-types";
import { calcularDescuento } from "@event-promotion/shared-types";
import type { PoolClient } from "pg";
import { buscarCatalogoActivoPorIds, leerConfiguracionDescuentoVigente } from "../catalog/service.js";
import { pool } from "../db/pool.js";
import { withTransaction } from "../shared/db-transaction.js";
import { HttpError } from "../shared/http-error.js";
import { enviarEmail } from "../shared/mailer.js";
import { crearNotificacionPendiente, marcarNotificacionEnviada, marcarNotificacionFallida } from "../shared/notificaciones.js";
import { esViolacionDeUnicidad } from "../shared/pg-error.js";
import {
  buscarSlotActivoPorId,
  leerDiasDeadlineEdicion,
  obtenerFechaInicioSlot,
} from "../slots/service.js";
import { dentroDeVentanaEdicion } from "./deadline.js";

// Ediciones cerradas: mensaje compartido por HU-4/HU-5/HU-6 (ADR-010) — mismo teléfono
// ficticio en los 3 endpoints que evalúan la misma ventana de edición.
const EDICIONES_CERRADAS =
  "Ediciones no permitidas — comunicate al departamento de ventas al 5555-5555.";

type ItemResuelto = { categoria: "servicio" | "producto"; precioCents: number; nombreSnapshot: string; idcatalogo: string };

function resultadoDesdeDescuento(descuento: ReturnType<typeof calcularDescuento>): ConfirmarAsistenciaResponse {
  return {
    subtotalServiciosCents: descuento.servicios.subtotalCents,
    descuentoServiciosPct: descuento.servicios.descuentoPct,
    subtotalProductosCents: descuento.productos.subtotalCents,
    descuentoProductosPct: descuento.productos.descuentoPct,
    totalCents: descuento.totalCents,
  };
}

// Se resuelve sobre ids únicos, no sobre los items de entrada — un catalogoItemId repetido
// en el request nunca debe cobrarse ni insertarse dos veces, y categoría/precio siempre
// salen de la DB, nunca de lo que envía el cliente (HU-3). Siempre se llama con el client de
// la transacción vigente — un ítem desactivado a mitad de sesión del cliente no debe poder
// confirmarse/editarse, y eso solo es autoritativo leído bajo el mismo lock que la escritura.
async function resolverSeleccion(items: { catalogoItemId: string }[], client: PoolClient): Promise<ItemResuelto[]> {
  const idsUnicos = [...new Set(items.map((item) => item.catalogoItemId))];
  const itemsCatalogo = await buscarCatalogoActivoPorIds(idsUnicos, client);
  const itemsPorId = new Map(itemsCatalogo.map((item) => [item.id, item]));

  return idsUnicos.map((id) => {
    const encontrado = itemsPorId.get(id);
    if (!encontrado) {
      throw new HttpError(400, "Uno o más ítems seleccionados ya no están disponibles.");
    }
    return { categoria: encontrado.categoria, precioCents: encontrado.precioCents, nombreSnapshot: encontrado.nombre, idcatalogo: encontrado.id };
  });
}

async function reemplazarItemsConfirmacion(
  client: PoolClient,
  idconfirmacion: string,
  items: ItemResuelto[],
): Promise<void> {
  await client.query("DELETE FROM confirmacion_items WHERE idconfirmacion = $1", [idconfirmacion]);
  for (const item of items) {
    await client.query(
      `INSERT INTO confirmacion_items (idconfirmacion, idcatalogo, nombre_snapshot, categoria_snapshot, precio_cents_snapshot)
       VALUES ($1, $2, $3, $4, $5)`,
      [idconfirmacion, item.idcatalogo, item.nombreSnapshot, item.categoria, item.precioCents],
    );
  }
}

function confirmacionEmailHtml(titulo: string, resultado: ConfirmarAsistenciaResponse): string {
  return `
    <p>${titulo}</p>
    <p>Servicios: Q${(resultado.subtotalServiciosCents / 100).toFixed(2)} — descuento ${resultado.descuentoServiciosPct}%</p>
    <p>Productos: Q${(resultado.subtotalProductosCents / 100).toFixed(2)} — descuento ${resultado.descuentoProductosPct}%</p>
    <p>Total: Q${(resultado.totalCents / 100).toFixed(2)}</p>
  `;
}

async function enviarNotificacion(
  emailCliente: string,
  subject: string,
  html: string,
  idnotificacion: string,
): Promise<void> {
  const resultadoEnvio = await enviarEmail({ to: emailCliente, subject, html });
  if (resultadoEnvio.exito) {
    await marcarNotificacionEnviada(pool, idnotificacion, resultadoEnvio.idMensaje);
  } else {
    await marcarNotificacionFallida(pool, idnotificacion);
  }
}

type ConfirmacionExistente = { idconfirmacion: string; estado: "confirmada" | "cancelada"; idslot: string };

async function buscarConfirmacionPorInvitacion(idinvitacion: string): Promise<ConfirmacionExistente | null> {
  const { rows } = await pool.query<{ idconfirmacion: string; estado: "confirmada" | "cancelada"; idslot: string }>(
    "SELECT idconfirmacion, estado, idslot FROM confirmaciones WHERE idinvitacion = $1",
    [idinvitacion],
  );
  const row = rows[0];
  return row ? { idconfirmacion: row.idconfirmacion, estado: row.estado, idslot: row.idslot } : null;
}

async function validarVentanaEdicion(idslotActual: string, client: PoolClient): Promise<void> {
  const fechaInicioActual = await obtenerFechaInicioSlot(idslotActual, client);
  if (!fechaInicioActual) {
    throw new Error("El slot de la confirmación actual ya no existe — estado inconsistente.");
  }
  const diasDeadline = await leerDiasDeadlineEdicion(client);
  if (!dentroDeVentanaEdicion(fechaInicioActual, diasDeadline, new Date())) {
    throw new HttpError(400, EDICIONES_CERRADAS);
  }
}

// HU-3 (primera confirmación) y HU-7 (reconfirmar tras cancelar) comparten este endpoint —
// una invitación sin fila en confirmaciones sigue el camino de INSERT; una con estado
// 'cancelada' reutiliza la misma fila (invitacion_id es UNIQUE, ADR-011) en vez de crear
// una segunda confirmación.
export async function confirmarAsistencia(
  idinvitacion: string,
  emailCliente: string,
  input: ConfirmarAsistenciaRequest,
): Promise<ConfirmarAsistenciaResponse> {
  // Pre-check rápido, no autoritativo — evita el trabajo de resolver catálogo/descuento
  // si evidentemente ya está confirmada. La decisión real (INSERT vs UPDATE de
  // reconfirmación) se re-lee bajo lock dentro de la transacción: dos POST concurrentes
  // sobre una invitación 'cancelada' (dos reconfirmaciones con slots distintos) no deben
  // decidir cada uno sobre esta lectura fuera de la transacción — eso es exactamente el
  // read-then-write con gap que ADR-009/ADR-011 prohíben.
  const previo = await buscarConfirmacionPorInvitacion(idinvitacion);
  if (previo?.estado === "confirmada") {
    throw new HttpError(409, "Ya existe una confirmación para esta invitación.");
  }

  let idnotificacion: string;
  let esReconfirmacion = false;
  let resultado: ConfirmarAsistenciaResponse;
  try {
    ({ idnotificacion, esReconfirmacion, resultado } = await withTransaction(pool, async (client) => {
      if (input.nombreCliente) {
        await client.query("UPDATE invitaciones SET nombre_cliente = $1 WHERE idinvitacion = $2", [
          input.nombreCliente,
          idinvitacion,
        ]);
      }

      // Re-lee y bloquea la fila real (si existe) — autoritativo, nunca la lectura de
      // arriba. Sin fila (primera confirmación): actual es undefined, se sigue el
      // camino de INSERT, protegido por el UNIQUE de idinvitacion (catch de abajo).
      const { rows } = await client.query<{ idconfirmacion: string; estado: "confirmada" | "cancelada" }>(
        "SELECT idconfirmacion, estado FROM confirmaciones WHERE idinvitacion = $1 FOR UPDATE",
        [idinvitacion],
      );
      const actual = rows[0];
      if (actual?.estado === "confirmada") {
        throw new HttpError(409, "Ya existe una confirmación para esta invitación.");
      }
      const reconfirmando = actual?.estado === "cancelada";

      // Slot e ítems se resuelven acá, bajo el client de la transacción — nunca antes de
      // abrirla (código-review Gate 6: antes se leían con el pool, con toda la fase previa
      // a la transacción como ventana para un soft-delete concurrente). El slot queda
      // completamente cerrado: `activo = true` va en el mismo UPDATE atómico que toma el
      // cupo, abajo, nunca en un SELECT separado. Los ítems de catálogo son una lectura
      // plana (buscarCatalogoActivoPorIds no hace SELECT ... FOR SHARE) — queda una ventana
      // residual del tamaño de esta misma transacción hasta reemplazarItemsConfirmacion, no
      // cerrada del todo: no son un recurso contado como el cupo y ADR-009 no los cubre, así
      // que no se agregó un lock explícito para esta sesión.
      const slot = await buscarSlotActivoPorId(input.slotId, client);
      if (!slot) {
        throw new HttpError(400, "El horario seleccionado no está disponible.");
      }
      const itemsResueltos = await resolverSeleccion(input.items, client);
      const config = await leerConfiguracionDescuentoVigente();
      const descuento = calcularDescuento(itemsResueltos, config);
      const resultadoActual = resultadoDesdeDescuento(descuento);

      // ADR-009 punto 2: UPDATE condicional dentro de la misma transacción que la
      // confirmación — única forma de tomar cupo, nunca un read-then-write con gap. En
      // reconfirmación el slot viejo ya se liberó al cancelar (HU-6), así que esto es un
      // -1 fresco, sin liberar nada más. `activo = true` va en la misma condición (no en un
      // SELECT previo) para que un soft-delete concurrente entre la lectura de arriba y este
      // UPDATE no pueda colarse — Postgres serializa ambos UPDATE sobre la misma fila.
      const cupoTomado = await client.query(
        "UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE idslot = $1 AND cupos_disponibles > 0 AND activo = true",
        [input.slotId],
      );
      if (cupoTomado.rowCount === 0) {
        throw new HttpError(400, "Ese horario ya no tiene cupo disponible, elegí otro horario.");
      }

      let idconfirmacion: string;
      if (reconfirmando && actual) {
        idconfirmacion = actual.idconfirmacion;
        await client.query(
          `UPDATE confirmaciones SET
             idslot = $1, estado = 'confirmada',
             subtotal_servicios_cents = $2, descuento_servicios_pct = $3,
             subtotal_productos_cents = $4, descuento_productos_pct = $5, total_cents = $6,
             min_servicios_3pct_snapshot = $7, min_servicios_5pct_snapshot = $8,
             monto_minimo_5pct_servicios_cents_snapshot = $9,
             min_productos_3pct_snapshot = $10, min_productos_5pct_snapshot = $11,
             actualizada_en = now()
           WHERE idconfirmacion = $12`,
          [
            input.slotId,
            resultadoActual.subtotalServiciosCents,
            resultadoActual.descuentoServiciosPct,
            resultadoActual.subtotalProductosCents,
            resultadoActual.descuentoProductosPct,
            resultadoActual.totalCents,
            config.minServicios3pct,
            config.minServicios5pct,
            config.montoMinimo5pctServiciosCents,
            config.minProductos3pct,
            config.minProductos5pct,
            idconfirmacion,
          ],
        );
      } else {
        const { rows: insertadas } = await client.query<{ idconfirmacion: string }>(
          `INSERT INTO confirmaciones (
             idinvitacion, idslot, estado,
             subtotal_servicios_cents, descuento_servicios_pct,
             subtotal_productos_cents, descuento_productos_pct, total_cents,
             min_servicios_3pct_snapshot, min_servicios_5pct_snapshot,
             monto_minimo_5pct_servicios_cents_snapshot,
             min_productos_3pct_snapshot, min_productos_5pct_snapshot
           ) VALUES ($1, $2, 'confirmada', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING idconfirmacion`,
          [
            idinvitacion,
            input.slotId,
            resultadoActual.subtotalServiciosCents,
            resultadoActual.descuentoServiciosPct,
            resultadoActual.subtotalProductosCents,
            resultadoActual.descuentoProductosPct,
            resultadoActual.totalCents,
            config.minServicios3pct,
            config.minServicios5pct,
            config.montoMinimo5pctServiciosCents,
            config.minProductos3pct,
            config.minProductos5pct,
          ],
        );
        const confirmacion = insertadas[0];
        if (!confirmacion) {
          throw new Error("No se pudo crear la confirmación.");
        }
        idconfirmacion = confirmacion.idconfirmacion;
      }

      await reemplazarItemsConfirmacion(client, idconfirmacion, itemsResueltos);

      const idnotif = await crearNotificacionPendiente(client, {
        idinvitacion,
        idconfirmacion,
        tipo: reconfirmando ? "reconfirmacion" : "confirmacion",
      });

      return { idnotificacion: idnotif, esReconfirmacion: reconfirmando, resultado: resultadoActual };
    }));
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      throw new HttpError(409, "Ya existe una confirmación para esta invitación.");
    }
    throw error;
  }

  await enviarNotificacion(
    emailCliente,
    esReconfirmacion
      ? "Reconfirmación de asistencia — Feria de Promociones"
      : "Confirmación de asistencia — Feria de Promociones",
    confirmacionEmailHtml(
      esReconfirmacion ? "Volviste a confirmar tu asistencia a la feria de promociones." : "Confirmamos tu asistencia a la feria de promociones.",
      resultado,
    ),
    idnotificacion,
  );

  return resultado;
}

// HU-4/HU-5: reemplazo completo de la selección y, opcionalmente, del slot. La ventana de
// edición se evalúa contra el slot que el cliente tenía antes de cualquier cambio (ADR-010).
export async function editarConfirmacion(
  idinvitacion: string,
  emailCliente: string,
  input: EditarConfirmacionRequest,
): Promise<EditarConfirmacionResponse> {
  // Pre-check rápido, no autoritativo (404/409 tempranos evitan resolver catálogo si es
  // evidentemente inválido) — la decisión real se re-lee bajo lock dentro de la
  // transacción, nunca sobre esta lectura (dos PATCH concurrentes de la misma invitación,
  // ej. dos pestañas, no deben decidir sobre qué slot liberar con datos ya obsoletos).
  const previo = await buscarConfirmacionPorInvitacion(idinvitacion);
  if (!previo) {
    throw new HttpError(404, "No existe una confirmación para editar.");
  }
  if (previo.estado === "cancelada") {
    throw new HttpError(409, "Tu confirmación está cancelada — reconfirmá con POST /confirmaciones en vez de editar.");
  }

  const { idnotificacion, resultado } = await withTransaction(pool, async (client) => {
    // Re-lee y bloquea la fila real — el idslot/estado autoritativos son estos, no los de
    // la lectura de arriba.
    const { rows } = await client.query<ConfirmacionExistente>(
      "SELECT idconfirmacion, idslot, estado FROM confirmaciones WHERE idinvitacion = $1 FOR UPDATE",
      [idinvitacion],
    );
    const actual = rows[0];
    if (!actual) {
      throw new HttpError(404, "No existe una confirmación para editar.");
    }
    if (actual.estado === "cancelada") {
      throw new HttpError(409, "Tu confirmación está cancelada — reconfirmá con POST /confirmaciones en vez de editar.");
    }

    await validarVentanaEdicion(actual.idslot, client);

    // Ítems resueltos acá, bajo el client de la transacción — nunca antes de abrirla, mismo
    // principio que confirmarAsistencia: un ítem desactivado a mitad de sesión no debe poder
    // guardarse en la edición.
    const itemsResueltos = await resolverSeleccion(input.items, client);
    const config = await leerConfiguracionDescuentoVigente();
    const descuento = calcularDescuento(itemsResueltos, config);
    const resultado = resultadoDesdeDescuento(descuento);

    if (input.nombreCliente) {
      await client.query("UPDATE invitaciones SET nombre_cliente = $1 WHERE idinvitacion = $2", [
        input.nombreCliente,
        idinvitacion,
      ]);
    }

    const cambiaDeSlot = input.slotId !== actual.idslot;
    if (cambiaDeSlot) {
      // Validado aquí, contra actual.idslot (no previo.idslot de la lectura de arriba): si
      // un PATCH concurrente ya movió la confirmación a otro slot antes de que esta
      // transacción tomara el lock, cambiaDeSlot se decide sobre el estado fresco — nunca
      // se toma cupo en un slot destino inactivo sin haberlo validado primero.
      const slotDestino = await buscarSlotActivoPorId(input.slotId, client);
      if (!slotDestino) {
        throw new HttpError(400, "El horario seleccionado no está disponible.");
      }

      // ADR-009 punto 3: lock de ambas filas en orden determinista por id ascendente antes
      // de liberar+tomar, para no deadlockear con un intercambio simultáneo en dirección
      // opuesta (A→B y B→A a la vez).
      const idsOrdenados = [actual.idslot, input.slotId].sort();
      await client.query("SELECT idslot FROM slots WHERE idslot = ANY($1) ORDER BY idslot ASC FOR UPDATE", [
        idsOrdenados,
      ]);

      await client.query("UPDATE slots SET cupos_disponibles = cupos_disponibles + 1 WHERE idslot = $1", [
        actual.idslot,
      ]);
      const cupoTomado = await client.query(
        "UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE idslot = $1 AND cupos_disponibles > 0",
        [input.slotId],
      );
      if (cupoTomado.rowCount === 0) {
        // Rollback completo (withTransaction) — el cliente conserva su slot original, el
        // +1 de arriba nunca se confirma.
        throw new HttpError(400, "Ese horario ya no tiene cupo disponible, elegí otro horario.");
      }
    }

    await client.query(
      `UPDATE confirmaciones SET
         idslot = $1,
         subtotal_servicios_cents = $2, descuento_servicios_pct = $3,
         subtotal_productos_cents = $4, descuento_productos_pct = $5, total_cents = $6,
         min_servicios_3pct_snapshot = $7, min_servicios_5pct_snapshot = $8,
         monto_minimo_5pct_servicios_cents_snapshot = $9,
         min_productos_3pct_snapshot = $10, min_productos_5pct_snapshot = $11,
         actualizada_en = now()
       WHERE idconfirmacion = $12`,
      [
        input.slotId,
        resultado.subtotalServiciosCents,
        resultado.descuentoServiciosPct,
        resultado.subtotalProductosCents,
        resultado.descuentoProductosPct,
        resultado.totalCents,
        config.minServicios3pct,
        config.minServicios5pct,
        config.montoMinimo5pctServiciosCents,
        config.minProductos3pct,
        config.minProductos5pct,
        actual.idconfirmacion,
      ],
    );

    await reemplazarItemsConfirmacion(client, actual.idconfirmacion, itemsResueltos);

    const idnotif = await crearNotificacionPendiente(client, {
      idinvitacion,
      idconfirmacion: actual.idconfirmacion,
      tipo: "edicion",
    });

    return { idnotificacion: idnotif, resultado };
  });

  await enviarNotificacion(
    emailCliente,
    "Cambios en tu asistencia — Feria de Promociones",
    confirmacionEmailHtml("Actualizamos tu selección para la feria de promociones.", resultado),
    idnotificacion,
  );

  return resultado;
}

// HU-6: libera el cupo del slot y marca la confirmación como cancelada sin borrar la fila
// (el snapshot se conserva para el historial de ventas, ADR-006/ADR-009).
export async function cancelarConfirmacion(
  idinvitacion: string,
  emailCliente: string,
): Promise<CancelarConfirmacionResponse> {
  // Pre-check rápido, no autoritativo — igual que editarConfirmacion, re-leído bajo lock
  // dentro de la transacción.
  const previo = await buscarConfirmacionPorInvitacion(idinvitacion);
  if (!previo) {
    throw new HttpError(404, "No existe una confirmación para cancelar.");
  }
  if (previo.estado === "cancelada") {
    throw new HttpError(409, "Tu confirmación ya está cancelada.");
  }

  const idnotificacion = await withTransaction(pool, async (client) => {
    const { rows } = await client.query<ConfirmacionExistente>(
      "SELECT idconfirmacion, idslot, estado FROM confirmaciones WHERE idinvitacion = $1 FOR UPDATE",
      [idinvitacion],
    );
    const actual = rows[0];
    if (!actual) {
      throw new HttpError(404, "No existe una confirmación para cancelar.");
    }
    if (actual.estado === "cancelada") {
      throw new HttpError(409, "Tu confirmación ya está cancelada.");
    }

    await validarVentanaEdicion(actual.idslot, client);

    await client.query("UPDATE slots SET cupos_disponibles = cupos_disponibles + 1 WHERE idslot = $1", [
      actual.idslot,
    ]);
    await client.query("UPDATE confirmaciones SET estado = 'cancelada', actualizada_en = now() WHERE idconfirmacion = $1", [
      actual.idconfirmacion,
    ]);
    return crearNotificacionPendiente(client, {
      idinvitacion,
      idconfirmacion: actual.idconfirmacion,
      tipo: "cancelacion",
    });
  });

  await enviarNotificacion(
    emailCliente,
    "Cancelación de asistencia — Feria de Promociones",
    "<p>Confirmamos que cancelaste tu asistencia a la feria de promociones. Podés reconfirmar cuando quieras con tu mismo código.</p>",
    idnotificacion,
  );

  return { estado: "cancelada" };
}

// GET /confirmaciones/mia (pantalla de edición, HU-4/HU-5): la selección/slot/estado
// vigentes de la propia invitación autenticada.
export async function obtenerConfirmacionPropia(idinvitacion: string): Promise<ConfirmacionPropiaResponse> {
  const { rows } = await pool.query<{
    idconfirmacion: string;
    estado: "confirmada" | "cancelada";
    idslot: string;
    nombre_cliente: string | null;
    subtotal_servicios_cents: number;
    descuento_servicios_pct: number;
    subtotal_productos_cents: number;
    descuento_productos_pct: number;
    total_cents: number;
  }>(
    `SELECT c.idconfirmacion, c.estado, c.idslot, i.nombre_cliente,
            c.subtotal_servicios_cents, c.descuento_servicios_pct,
            c.subtotal_productos_cents, c.descuento_productos_pct, c.total_cents
     FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion
     WHERE c.idinvitacion = $1`,
    [idinvitacion],
  );
  const confirmacion = rows[0];
  if (!confirmacion) {
    throw new HttpError(404, "No existe una confirmación para esta invitación.");
  }

  const { rows: itemRows } = await pool.query<{
    idcatalogo: string;
    categoria_snapshot: "servicio" | "producto";
    nombre_snapshot: string;
    precio_cents_snapshot: number;
  }>(
    "SELECT idcatalogo, categoria_snapshot, nombre_snapshot, precio_cents_snapshot FROM confirmacion_items WHERE idconfirmacion = $1",
    [confirmacion.idconfirmacion],
  );

  return {
    estado: confirmacion.estado,
    slotId: confirmacion.idslot,
    nombreCliente: confirmacion.nombre_cliente,
    items: itemRows.map((item) => ({
      catalogoItemId: item.idcatalogo,
      categoria: item.categoria_snapshot,
      nombre: item.nombre_snapshot,
      precioCents: item.precio_cents_snapshot,
    })),
    subtotalServiciosCents: confirmacion.subtotal_servicios_cents,
    descuentoServiciosPct: confirmacion.descuento_servicios_pct,
    subtotalProductosCents: confirmacion.subtotal_productos_cents,
    descuentoProductosPct: confirmacion.descuento_productos_pct,
    totalCents: confirmacion.total_cents,
  };
}
