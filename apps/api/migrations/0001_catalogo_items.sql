-- Catálogo de servicios/productos (ADR-007). Soft-delete vía activo=false, sin CRUD todavía (Gate 5).
CREATE TABLE catalogo_items (
  idcatalogo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('servicio', 'producto')),
  precio_cents INTEGER NOT NULL CHECK (precio_cents >= 0),
  activo BOOLEAN NOT NULL DEFAULT true
);
