-- Confirmación de asistencia (HU-3, ADR-006, ADR-009, ADR-011, ADR-023). Snapshot de
-- precio/descuento y de los umbrales usados — nunca se recalcula al leer.
CREATE TABLE confirmaciones (
  idconfirmacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idinvitacion UUID NOT NULL UNIQUE REFERENCES invitaciones (idinvitacion),
  idslot UUID NOT NULL REFERENCES slots (idslot),
  estado TEXT NOT NULL CHECK (estado IN ('confirmada', 'cancelada')),
  subtotal_servicios_cents INTEGER NOT NULL CHECK (subtotal_servicios_cents >= 0),
  -- Rango de % válido, no la lista exacta (0,3,5): ADR-023 permite agregar un tier nuevo
  -- como cambio de código en el motor (open/closed) sin requerir otra migración de DB.
  descuento_servicios_pct INTEGER NOT NULL CHECK (descuento_servicios_pct BETWEEN 0 AND 100),
  subtotal_productos_cents INTEGER NOT NULL CHECK (subtotal_productos_cents >= 0),
  descuento_productos_pct INTEGER NOT NULL CHECK (descuento_productos_pct BETWEEN 0 AND 100),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  min_servicios_3pct_snapshot INTEGER NOT NULL,
  min_servicios_5pct_snapshot INTEGER NOT NULL,
  monto_minimo_5pct_servicios_cents_snapshot INTEGER NOT NULL,
  min_productos_3pct_snapshot INTEGER NOT NULL,
  min_productos_5pct_snapshot INTEGER NOT NULL,
  confirmada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE confirmacion_items (
  iditem UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idconfirmacion UUID NOT NULL REFERENCES confirmaciones (idconfirmacion),
  idcatalogo UUID REFERENCES catalogo_items (idcatalogo),
  nombre_snapshot TEXT NOT NULL,
  categoria_snapshot TEXT NOT NULL CHECK (categoria_snapshot IN ('servicio', 'producto')),
  precio_cents_snapshot INTEGER NOT NULL CHECK (precio_cents_snapshot >= 0)
);
