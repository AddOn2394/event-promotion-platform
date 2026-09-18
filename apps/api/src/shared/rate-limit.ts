import { pool } from "../db/pool.js";

// ADR-022: máximo N intentos fallidos por email en una ventana de tiempo, sin importar la
// IP de origen. `scope` separa el contador de login de cliente (código de acceso) del de
// login admin (email+password) — comparten tabla/mecanismo, pero un ataque contra el email
// del admin en /auth/login no debe poder bloquear /admin/auth/login (y viceversa).
export type RateLimitScope = "cliente" | "admin";

const MAX_INTENTOS_FALLIDOS = 5;
const VENTANA_INTENTOS_MINUTOS = 15;

export async function intentosFallidosExcedidos(email: string, scope: RateLimitScope): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM intentos_fallidos_login WHERE scope = $1 AND email = $2 AND creado_en > now() - ($3 * interval '1 minute')",
    [scope, email, VENTANA_INTENTOS_MINUTOS],
  );
  return Number(rows[0]?.count ?? 0) >= MAX_INTENTOS_FALLIDOS;
}

export async function registrarIntentoFallido(email: string, scope: RateLimitScope): Promise<void> {
  await pool.query("INSERT INTO intentos_fallidos_login (email, scope) VALUES ($1, $2)", [email, scope]);
}

export async function limpiarIntentosFallidos(email: string, scope: RateLimitScope): Promise<void> {
  await pool.query("DELETE FROM intentos_fallidos_login WHERE email = $1 AND scope = $2", [email, scope]);
}
