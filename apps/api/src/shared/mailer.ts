import { randomUUID } from "node:crypto";
import { Resend } from "resend";

let client: Resend | undefined;

function getClient(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }
  client = new Resend(apiKey);
  return client;
}

export type EnvioEmailResultado =
  | { exito: true; idMensaje: string }
  | { exito: false; error: string };

const NOMBRE_REMITENTE = "Feria de Promociones";

// RESEND_FROM_EMAIL suele ser solo la dirección (onboarding@resend.dev) — el nombre legible
// se agrega acá para que el cliente vea "Feria de Promociones" en su bandeja en vez de una
// dirección pelada. Si ya viene con formato "Nombre <dirección>", se respeta tal cual.
function construirRemitente(from: string): string {
  return from.includes("<") ? from : `${NOMBRE_REMITENTE} <${from}>`;
}

// ADR-024: el envío ocurre siempre después de confirmar la transacción de DB que lo
// origina, nunca dentro de ella. Nunca lanza — el resultado se refleja en notificaciones,
// no en una excepción que pueda tumbar la respuesta HTTP de una escritura ya comprometida.
export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EnvioEmailResultado> {
  // Los tests de integración ejecutan el flujo real de invitar/confirmar/editar: sin este
  // corte, una suite corrida con el .env completo exportado mandaría correos reales a los
  // emails de prueba. Simula un envío exitoso (no un fallo) para que el estado_envio de los
  // tests refleje el camino feliz — los casos 'fallido'/'rebotado' se siembran por SQL.
  if (process.env.NODE_ENV === "test") {
    return { exito: true, idMensaje: `test-${randomUUID()}` };
  }
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    return { exito: false, error: "RESEND_FROM_EMAIL no está configurada." };
  }
  try {
    const { data, error } = await getClient().emails.send({
      from: construirRemitente(from),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) {
      return { exito: false, error: error.message };
    }
    if (!data) {
      return { exito: false, error: "Resend no devolvió id de mensaje." };
    }
    return { exito: true, idMensaje: data.id };
  } catch (err) {
    return { exito: false, error: (err as Error).message };
  }
}
