import { pool } from "../../db/pool.js";
import { enviarEmail, type EnvioEmailResultado } from "../mailer.js";
import {
  marcarNotificacionEnviada,
  marcarNotificacionFallida,
  type NotificacionTipo,
} from "../notificaciones.js";
import type { CorreoRenderizado } from "./plantillas.js";

// Único punto donde un correo se envía y su notificación se marca (ADR-024): siempre después
// del COMMIT de la transacción que la originó. El motivo del fallo se registra en el log —
// notificaciones solo guarda estado_envio = 'fallido' (sin columna de error), así que
// sin este log la causa (API key inválida, remitente sin verificar…) solo se puede deducir
// inspeccionando la DB y el .env.
//
// `armarCorreo` es una función y no el correo ya armado: renderizar una plantilla también puede
// lanzar (un monto no entero, una fecha inválida), y esa excepción no debe convertirse en un
// 500 sobre una escritura ya comprometida ni dejar la notificación en 'pendiente' para siempre.
// Alcance del "nunca lanza" (ADR-024): armar y enviar el correo. Los UPDATE de marcado de abajo
// SÍ pueden lanzar si la DB cae justo después del COMMIT — hueco heredado (ya existía en el
// enviarNotificacion previo), diferido a propósito: ver spec/todo.md.
export async function enviarCorreoDeNotificacion(params: {
  to: string;
  armarCorreo: () => CorreoRenderizado;
  idnotificacion: string;
  tipo: NotificacionTipo;
}): Promise<void> {
  let resultado: EnvioEmailResultado;
  try {
    resultado = await enviarEmail({ to: params.to, ...params.armarCorreo() });
  } catch (error) {
    resultado = { exito: false, error: `No se pudo armar el correo: ${(error as Error).message}` };
  }
  if (resultado.exito) {
    await marcarNotificacionEnviada(pool, params.idnotificacion, resultado.idMensaje);
    return;
  }
  console.error("[email] envío fallido", {
    tipo: params.tipo,
    idnotificacion: params.idnotificacion,
    motivo: resultado.error,
  });
  await marcarNotificacionFallida(pool, params.idnotificacion);
}
