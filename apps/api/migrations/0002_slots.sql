-- Slots del evento (ADR-008). Sin cupos_disponibles todavía — exclusivo de Gate 3
-- (spec/PLAN_DESARROLLO.md), para no construir el formulario dos veces.
CREATE TABLE slots (
  idslot UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_hora_inicio TIMESTAMPTZ NOT NULL,
  fecha_hora_fin TIMESTAMPTZ NOT NULL,
  cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  CHECK (fecha_hora_fin > fecha_hora_inicio)
);
