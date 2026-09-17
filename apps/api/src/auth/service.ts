import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { HttpError } from "../shared/http-error.js";

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

// HU-2: mensaje genérico en cualquier fallo — nunca revela si el email existe (no
// enumeration). Rate limiting (ADR-022) es exit criterio de Gate 4, no de Gate 2.
const CREDENCIALES_INVALIDAS = "Email o código inválido.";

export async function loginCliente(email: string, codigo: string): Promise<SesionCliente> {
  const { rows } = await pool.query<InvitacionAuthRow>(
    "SELECT idinvitacion, nombre_cliente, codigo_acceso_hash, usada_en FROM invitaciones WHERE email = $1",
    [email],
  );
  const invitacion = rows[0];
  if (!invitacion) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  const codigoValido = await bcrypt.compare(codigo, invitacion.codigo_acceso_hash);
  if (!codigoValido) {
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  if (invitacion.usada_en === null) {
    await pool.query("UPDATE invitaciones SET usada_en = now() WHERE idinvitacion = $1", [
      invitacion.idinvitacion,
    ]);
  }

  return {
    idinvitacion: invitacion.idinvitacion,
    email,
    nombreCliente: invitacion.nombre_cliente,
  };
}
