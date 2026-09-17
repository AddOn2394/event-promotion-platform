import type { Pool, PoolClient } from "pg";

// ADR-024: notificaciones se crea en la misma transacción que el registro que la origina
// (invitación o confirmación); el envío real y la actualización de estado_envio ocurren
// después de que esa transacción ya hizo COMMIT.

export type NotificacionTipo = "invitacion" | "confirmacion" | "edicion" | "cancelacion" | "reconfirmacion";

export async function crearNotificacionPendiente(
  client: PoolClient,
  params: { idinvitacion: string; idconfirmacion: string | null; tipo: NotificacionTipo },
): Promise<string> {
  const { rows } = await client.query<{ idnotificacion: string }>(
    `INSERT INTO notificaciones (idinvitacion, idconfirmacion, tipo)
     VALUES ($1, $2, $3)
     RETURNING idnotificacion`,
    [params.idinvitacion, params.idconfirmacion, params.tipo],
  );
  const idnotificacion = rows[0]?.idnotificacion;
  if (!idnotificacion) {
    throw new Error("No se pudo crear el registro de notificación.");
  }
  return idnotificacion;
}

export async function marcarNotificacionEnviada(
  pool: Pool,
  idnotificacion: string,
  idMensajeResend: string,
): Promise<void> {
  await pool.query(
    `UPDATE notificaciones SET estado_envio = 'enviado', id_mensaje_resend = $1, actualizada_en = now()
     WHERE idnotificacion = $2`,
    [idMensajeResend, idnotificacion],
  );
}

export async function marcarNotificacionFallida(pool: Pool, idnotificacion: string): Promise<void> {
  await pool.query(
    `UPDATE notificaciones SET estado_envio = 'fallido', actualizada_en = now() WHERE idnotificacion = $1`,
    [idnotificacion],
  );
}
