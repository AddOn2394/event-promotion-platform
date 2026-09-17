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

// ADR-024: el envío ocurre siempre después de confirmar la transacción de DB que lo
// origina, nunca dentro de ella. Nunca lanza — el resultado se refleja en notificaciones,
// no en una excepción que pueda tumbar la respuesta HTTP de una escritura ya comprometida.
export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EnvioEmailResultado> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    return { exito: false, error: "RESEND_FROM_EMAIL no está configurada." };
  }
  try {
    const { data, error } = await getClient().emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
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
