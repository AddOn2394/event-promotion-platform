import jwt from "jsonwebtoken";

// JWT en cookie httpOnly (ADR-011, ADR-013). Duración de sesión decidida con el usuario
// en Gate 2 sesión B: 24h cliente, 8h admin — no está en ningún ADR, es un default de
// infraestructura, no una regla de negocio.
const CLIENTE_TOKEN_TTL = "24h";
const ADMIN_TOKEN_TTL = "8h";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurada — obligatoria para firmar/verificar sesiones.");
  }
  return secret;
}

// cliente y admin firman con el mismo JWT_SECRET, así que un token de un rol es
// estructuralmente válido para el otro sin este campo `role` — sin él, pasarle por
// error un token de admin a verifyClienteToken devolvería un payload con
// idinvitacion undefined en silencio en vez de rechazarlo.
export type ClienteTokenPayload = {
  role: "cliente";
  idinvitacion: string;
  email: string;
};

export type AdminTokenPayload = {
  role: "admin";
  idusuario: string;
  email: string;
};

export function signClienteToken(payload: Omit<ClienteTokenPayload, "role">): string {
  return jwt.sign({ ...payload, role: "cliente" }, getSecret(), { expiresIn: CLIENTE_TOKEN_TTL });
}

export function verifyClienteToken(token: string): ClienteTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as ClienteTokenPayload;
    return decoded.role === "cliente" ? decoded : null;
  } catch {
    return null;
  }
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "role">): string {
  return jwt.sign({ ...payload, role: "admin" }, getSecret(), { expiresIn: ADMIN_TOKEN_TTL });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as AdminTokenPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}
