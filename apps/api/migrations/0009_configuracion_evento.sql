-- Deadline de edición configurable (ADR-010). N días es un valor de negocio ajustable
-- desde el admin panel (Gate 5, HU-10) — sin UI de admin todavía, misma situación que
-- configuracion_descuento en Gate 2.
CREATE TABLE configuracion_evento (
  idconfiguracion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dias_deadline_edicion INTEGER NOT NULL CHECK (dias_deadline_edicion >= 0),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila única: mismo patrón que configuracion_descuento_fila_unica.
CREATE UNIQUE INDEX configuracion_evento_fila_unica ON configuracion_evento ((true));
