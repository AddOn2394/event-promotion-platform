-- Gate 5: login admin también necesita rate limiting (ADR-022 dice explícitamente
-- "Gate 4 (código de acceso) y Gate 5 (login admin)"). Reutilizar la tabla tal cual
-- (sin `scope`) permitiría que alguien spamee POST /auth/login con el email del admin
-- y bloquee login admin por 15 minutos — un lockout cruzado de rol que ADR-022 nunca
-- pidió. `scope` mantiene "mismo mecanismo" (una sola tabla, mismo conteo por email)
-- sin compartir el contador entre los dos endpoints.
ALTER TABLE intentos_fallidos_login ADD COLUMN scope TEXT NOT NULL DEFAULT 'cliente' CHECK (scope IN ('cliente', 'admin'));

DROP INDEX intentos_fallidos_login_email_creado_en;
CREATE INDEX intentos_fallidos_login_scope_email_creado_en ON intentos_fallidos_login (scope, email, creado_en);
