export const CLIENTE_COOKIE_NAME = "cliente_token";
export const ADMIN_COOKIE_NAME = "admin_token";

const CLIENTE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ADMIN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// httpOnly siempre (ADR-011, ADR-013) — el JS del cliente nunca debe leer el JWT.
// onrender.com está en la Public Suffix List: en producción, event-promotion-web y
// event-promotion-api son *cross-site* entre sí (no solo cross-origin), así que
// sameSite="lax" haría que el navegador nunca mande la cookie en el fetch del
// formulario — necesita "none", que a su vez exige secure=true (HTTPS).
//
// COOKIE_SECURE (no NODE_ENV): el Dockerfile fija NODE_ENV=production siempre,
// incluso en docker-compose local sobre HTTP simple — usar NODE_ENV acá marcaría
// "Secure" en local, y un navegador real descarta silenciosamente una cookie Secure
// servida por HTTP. COOKIE_SECURE es la señal real de "esto corre bajo HTTPS" (true
// en Render vía render.yaml, false en local vía .env/docker-compose).
function baseCookieOptions() {
  const cookieSecure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSecure ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}

export function clienteCookieOptions() {
  return { ...baseCookieOptions(), maxAge: CLIENTE_MAX_AGE_MS };
}

export function adminCookieOptions() {
  return { ...baseCookieOptions(), maxAge: ADMIN_MAX_AGE_MS };
}
