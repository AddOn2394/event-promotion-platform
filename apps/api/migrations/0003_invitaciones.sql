-- Invitaciones de cliente (ADR-011). Existe antes de que exista una confirmación —
-- una invitación sin confirmación es "sin respuesta" (usada_en IS NULL), ver HU-8.
CREATE TABLE invitaciones (
  idinvitacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre_cliente TEXT,
  codigo_acceso_hash TEXT NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  usada_en TIMESTAMPTZ
);
