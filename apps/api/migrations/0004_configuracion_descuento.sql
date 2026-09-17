-- Umbrales configurables del motor de descuento (ADR-023). Los % (3/5) quedan fijos en
-- código (packages/shared-types/src/discount-engine.ts) — esta tabla solo guarda los
-- umbrales que los disparan. Sin UI de admin todavía (Gate 5, HU-12).
CREATE TABLE configuracion_descuento (
  idconfiguracion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_servicios_3pct INTEGER NOT NULL CHECK (min_servicios_3pct >= 1),
  min_servicios_5pct INTEGER NOT NULL CHECK (min_servicios_5pct >= 1),
  monto_minimo_5pct_servicios_cents INTEGER NOT NULL CHECK (monto_minimo_5pct_servicios_cents >= 0),
  min_productos_3pct INTEGER NOT NULL CHECK (min_productos_3pct >= 1),
  min_productos_5pct INTEGER NOT NULL CHECK (min_productos_5pct >= 1),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Coherencia HU-12: el umbral de 5% nunca puede ser más débil que el de 3%.
  CHECK (min_servicios_5pct >= min_servicios_3pct),
  CHECK (min_productos_5pct >= min_productos_3pct)
);

-- Fila única: el motor siempre lee "la" configuración vigente (se actualiza in-place,
-- Gate 5 HU-12), nunca hay una segunda fila candidata a "vigente".
CREATE UNIQUE INDEX configuracion_descuento_fila_unica ON configuracion_descuento ((true));
