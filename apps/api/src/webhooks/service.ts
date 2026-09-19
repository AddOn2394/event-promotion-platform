import { ResendWebhookEventSchema, type ResendWebhookEvent } from "@event-promotion/shared-types";
import { Webhook } from "svix";
import { pool } from "../db/pool.js";
import { HttpError } from "../shared/http-error.js";

// ADR-024: el webhook lo llama Resend, no un usuario con sesión — no hay auth de cookie.
// La autenticidad del payload se verifica con la firma Svix de Resend (headers
// svix-id/svix-timestamp/svix-signature + RESEND_WEBHOOK_SECRET), nunca confiando en el
// payload sin verificar.
function getWebhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET no está configurada.");
  }
  return secret;
}

// `payload` debe ser el body crudo (string/Buffer), nunca JSON ya parseado — la firma es
// sensible a cualquier cambio, incluyendo el que introduciría re-serializar el objeto. La
// firma prueba que el payload vino de Resend, no que tenga la forma esperada (ver
// ResendWebhookEventSchema) — eso se valida aparte, después de verificar.
export function verificarFirmaWebhook(
  payload: string | Buffer,
  headers: { "svix-id"?: string; "svix-timestamp"?: string; "svix-signature"?: string },
): unknown {
  const webhook = new Webhook(getWebhookSecret());
  try {
    return webhook.verify(payload, {
      "svix-id": headers["svix-id"] ?? "",
      "svix-timestamp": headers["svix-timestamp"] ?? "",
      "svix-signature": headers["svix-signature"] ?? "",
    });
  } catch {
    throw new HttpError(400, "Firma de webhook inválida.");
  }
}

type EstadoNotificacion = "enviado" | "fallido" | "rebotado";

// Nombres de evento confirmados contra la documentación real de Resend
// (resend.com/docs/dashboard/webhooks/event-types) — solo 3 se traducen a un estado de
// notificaciones.estado_envio; el resto (sent, delivery_delayed, complained, opened,
// clicked, scheduled, received, suppressed) no tiene equivalente en nuestras 4 columnas
// y se ignora (200 OK, sin actualizar nada).
function estadoDesdeEvento(tipo: string): EstadoNotificacion | null {
  switch (tipo) {
    case "email.delivered":
      return "enviado";
    case "email.bounced":
      return "rebotado";
    case "email.failed":
      return "fallido";
    default:
      return null;
  }
}

// Un rebote/fallo es la señal proactiva que ADR-024 existe para dar a ventas (HU-8,
// filtro "rebotada") — un evento reordenado/reentregado no debe pisarlo. "rebotado" y
// "fallido" son terminales entre sí (ninguno sobreescribe al otro ni a sí mismo con un
// duplicado) — solo "enviado" puede quedar sobreescrito por cualquiera de los dos.
async function actualizarEstadoSiNoEsRetroceso(idMensajeResend: string, estado: EstadoNotificacion): Promise<void> {
  await pool.query(
    `UPDATE notificaciones
     SET estado_envio = $2, actualizada_en = now()
     WHERE id_mensaje_resend = $1
       AND NOT (estado_envio IN ('rebotado', 'fallido') AND estado_envio != $2)`,
    [idMensajeResend, estado],
  );
}

// `crudo` es el resultado ya verificado por firma de verificarFirmaWebhook, todavía sin
// validar su forma — un evento correctamente firmado pero con un `data` inesperado (cambio
// futuro del payload de Resend) se trata igual que un tipo de evento sin mapeo: 200 OK sin
// tocar nada, nunca un TypeError no controlado.
export async function procesarEventoResend(crudo: unknown): Promise<void> {
  const resultado = ResendWebhookEventSchema.safeParse(crudo);
  if (!resultado.success) return;
  const evento: ResendWebhookEvent = resultado.data;

  const estado = estadoDesdeEvento(evento.type);
  if (!estado || !evento.data?.email_id) return;
  await actualizarEstadoSiNoEsRetroceso(evento.data.email_id, estado);
}
