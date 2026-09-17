import type {
  ConfirmarAsistenciaRequest,
  ConfirmarAsistenciaResponse,
  ConfiguracionDescuento,
} from "@event-promotion/shared-types";
import { calcularDescuento } from "@event-promotion/shared-types";
import { buscarCatalogoActivoPorIds } from "../catalog/service.js";
import { pool } from "../db/pool.js";
import { withTransaction } from "../shared/db-transaction.js";
import { HttpError } from "../shared/http-error.js";
import { enviarEmail } from "../shared/mailer.js";
import { crearNotificacionPendiente, marcarNotificacionEnviada, marcarNotificacionFallida } from "../shared/notificaciones.js";
import { esViolacionDeUnicidad } from "../shared/pg-error.js";
import { buscarSlotActivoPorId } from "../slots/service.js";

type ConfiguracionDescuentoRow = {
  min_servicios_3pct: number;
  min_servicios_5pct: number;
  monto_minimo_5pct_servicios_cents: number;
  min_productos_3pct: number;
  min_productos_5pct: number;
};

async function leerConfiguracionDescuentoVigente(): Promise<ConfiguracionDescuento> {
  const { rows } = await pool.query<ConfiguracionDescuentoRow>(
    "SELECT min_servicios_3pct, min_servicios_5pct, monto_minimo_5pct_servicios_cents, min_productos_3pct, min_productos_5pct FROM configuracion_descuento",
  );
  const config = rows[0];
  if (!config) {
    throw new Error("configuracion_descuento no tiene ninguna fila — falta seedear (ver apps/api/src/db/seed.ts).");
  }
  return {
    minServicios3pct: config.min_servicios_3pct,
    minServicios5pct: config.min_servicios_5pct,
    montoMinimo5pctServiciosCents: config.monto_minimo_5pct_servicios_cents,
    minProductos3pct: config.min_productos_3pct,
    minProductos5pct: config.min_productos_5pct,
  };
}

function confirmacionEmailHtml(resultado: ConfirmarAsistenciaResponse): string {
  return `
    <p>Confirmamos tu asistencia a la feria de promociones.</p>
    <p>Servicios: Q${(resultado.subtotalServiciosCents / 100).toFixed(2)} — descuento ${resultado.descuentoServiciosPct}%</p>
    <p>Productos: Q${(resultado.subtotalProductosCents / 100).toFixed(2)} — descuento ${resultado.descuentoProductosPct}%</p>
    <p>Total: Q${(resultado.totalCents / 100).toFixed(2)}</p>
  `;
}

export async function confirmarAsistencia(
  idinvitacion: string,
  emailCliente: string,
  input: ConfirmarAsistenciaRequest,
): Promise<ConfirmarAsistenciaResponse> {
  const idsUnicos = [...new Set(input.items.map((item) => item.catalogoItemId))];
  const [slot, itemsCatalogo] = await Promise.all([
    buscarSlotActivoPorId(input.slotId),
    buscarCatalogoActivoPorIds(idsUnicos),
  ]);
  if (!slot) {
    throw new HttpError(400, "El horario seleccionado no está disponible.");
  }

  const itemsPorId = new Map(itemsCatalogo.map((item) => [item.id, item]));

  const itemsResueltos = input.items.map((item) => {
    const encontrado = itemsPorId.get(item.catalogoItemId);
    if (!encontrado) {
      throw new HttpError(400, "Uno o más ítems seleccionados ya no están disponibles.");
    }
    // Categoría/precio siempre resueltos desde la DB — nunca desde lo que envía el cliente.
    return { categoria: encontrado.categoria, precioCents: encontrado.precioCents, nombreSnapshot: encontrado.nombre, idcatalogo: encontrado.id };
  });

  const config = await leerConfiguracionDescuentoVigente();
  const descuento = calcularDescuento(itemsResueltos, config);

  const resultado: ConfirmarAsistenciaResponse = {
    subtotalServiciosCents: descuento.servicios.subtotalCents,
    descuentoServiciosPct: descuento.servicios.descuentoPct,
    subtotalProductosCents: descuento.productos.subtotalCents,
    descuentoProductosPct: descuento.productos.descuentoPct,
    totalCents: descuento.totalCents,
  };

  let idconfirmacion: string;
  let idnotificacion: string;
  try {
    ({ idconfirmacion, idnotificacion } = await withTransaction(pool, async (client) => {
      if (input.nombreCliente) {
        await client.query("UPDATE invitaciones SET nombre_cliente = $1 WHERE idinvitacion = $2", [
          input.nombreCliente,
          idinvitacion,
        ]);
      }

      const { rows } = await client.query<{ idconfirmacion: string }>(
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
        ],
      );
      const confirmacion = rows[0];
      if (!confirmacion) {
        throw new Error("No se pudo crear la confirmación.");
      }

      for (const item of itemsResueltos) {
        await client.query(
          `INSERT INTO confirmacion_items (idconfirmacion, idcatalogo, nombre_snapshot, categoria_snapshot, precio_cents_snapshot)
           VALUES ($1, $2, $3, $4, $5)`,
          [confirmacion.idconfirmacion, item.idcatalogo, item.nombreSnapshot, item.categoria, item.precioCents],
        );
      }

      const idnotif = await crearNotificacionPendiente(client, {
        idinvitacion,
        idconfirmacion: confirmacion.idconfirmacion,
        tipo: "confirmacion",
      });

      return { idconfirmacion: confirmacion.idconfirmacion, idnotificacion: idnotif };
    }));
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      // HU-3: una invitación ya confirmada no puede confirmarse de nuevo por POST —
      // eso es edición/reconfirmación (HU-4/HU-7, PATCH), que es Gate 4.
      throw new HttpError(409, "Ya existe una confirmación para esta invitación.");
    }
    throw error;
  }

  const resultadoEnvio = await enviarEmail({
    to: emailCliente,
    subject: "Confirmación de asistencia — Feria de Promociones",
    html: confirmacionEmailHtml(resultado),
  });

  if (resultadoEnvio.exito) {
    await marcarNotificacionEnviada(pool, idnotificacion, resultadoEnvio.idMensaje);
  } else {
    await marcarNotificacionFallida(pool, idnotificacion);
  }

  return resultado;
}
