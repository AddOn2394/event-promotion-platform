-- Rate limiting del login de cliente (ADR-022, HU-2): se cuenta por email, nunca por IP —
-- un atacante real rota de IP para evadir ese límite. Cada fila es un intento fallido
-- (email inexistente o código inválido); se cuentan las de los últimos 15 minutos.
CREATE TABLE intentos_fallidos_login (
  idintento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX intentos_fallidos_login_email_creado_en ON intentos_fallidos_login (email, creado_en);
