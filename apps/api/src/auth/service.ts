import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { HttpError } from "../shared/http-error.js";
import { intentosFallidosExcedidos, limpiarIntentosFallidos, registrarIntentoFallido } from "../shared/rate-limit.js";
import { obtenerFinDelEvento } from "../slots/service.js";

type InvitacionAuthRow = {
  idinvitacion: string;
  nombre_cliente: string | null;
  codigo_acceso_hash: string;
  usada_en: Date | null;
};

export type SesionCliente = {
  idinvitacion: string;
  email: string;
  nombreCliente: string | null;
};

// HU-2: mensaje genérico en cualquier fallo (email inexistente, código inválido o código
// expirado) — nunca revela cuál de los tres pasó (no enumeration, ADR-011).
const CREDENCIALES_INVALIDAS = "El correo electrónico o el código de acceso no son correctos. Verifique los datos e intente de nuevo.";
const DEMASIADOS_INTENTOS = "Demasiados intentos. Intente de nuevo en unos minutos.";

// ADR-011, párrafo "Vigencia del código" (resolvido con el usuario en Gate 4 tras un
// contradicción textual dentro del propio ADR): el código vive mientras viva la
// invitación y expira únicamente cuando termina el evento completo — el slot de una
// confirmación individual nunca gobierna la vigencia de la sesión, solo el deadline de
// edición (ADR-010). Sin una entidad "evento" propia, el fin del evento se deriva de
// MAX(fecha_hora_fin) de slots activos (decidido con el usuario en Gate 4).
async function codigoExpirado(): Promise<boolean> {
  const finEvento = await obtenerFinDelEvento();
  if (!finEvento) {
    // Sin slots activos no hay forma de determinar expiración — no bloquea el login
    // (evitar que la ausencia de slots deje a todos los clientes sin acceso).
    return false;
  }
  return new Date() > finEvento;
}

export async function loginCliente(email: string, codigo: string): Promise<SesionCliente> {
  if (await intentosFallidosExcedidos(email, "cliente")) {
    throw new HttpError(429, DEMASIADOS_INTENTOS);
  }

  const { rows } = await pool.query<InvitacionAuthRow>(
    "SELECT idinvitacion, nombre_cliente, codigo_acceso_hash, usada_en FROM invitaciones WHERE email = $1",
    [email],
  );
  const invitacion = rows[0];
  if (!invitacion) {
    await registrarIntentoFallido(email, "cliente");
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  const codigoValido = await bcrypt.compare(codigo, invitacion.codigo_acceso_hash);
  if (!codigoValido) {
    await registrarIntentoFallido(email, "cliente");
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  // ADR-028: email+código correctos pero evento ya terminado NO cuenta como intento
  // fallido — a diferencia de las dos ramas de arriba (email inexistente, código
  // incorrecto), este caso ya exige conocer el código real, que es el objetivo de un
  // ataque de fuerza bruta y no un paso hacia él, así que exentarlo no debilita el
  // rate limiting de ADR-022 ni el no-enumeration de ADR-011 (mismo mensaje genérico).
  if (await codigoExpirado()) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  if (invitacion.usada_en === null) {
    await pool.query("UPDATE invitaciones SET usada_en = now() WHERE idinvitacion = $1", [
      invitacion.idinvitacion,
    ]);
  }

  await limpiarIntentosFallidos(email, "cliente");

  return {
    idinvitacion: invitacion.idinvitacion,
    email,
    nombreCliente: invitacion.nombre_cliente,
  };
}
