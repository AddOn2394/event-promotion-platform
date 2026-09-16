import { z } from "zod";

// Contrato del motor de descuento (ADR-004, ADR-005, ADR-023) — umbrales configurables
// desde configuracion_descuento; los porcentajes 3/5 son fijos en código, no en este schema.

export const ConfiguracionDescuentoSchema = z.object({
  minServicios3pct: z.number().int().positive(),
  minServicios5pct: z.number().int().positive(),
  montoMinimo5pctServiciosCents: z.number().int().positive(),
  minProductos3pct: z.number().int().positive(),
  minProductos5pct: z.number().int().positive(),
});

export type ConfiguracionDescuento = z.infer<typeof ConfiguracionDescuentoSchema>;

export const ResultadoDescuentoCategoriaSchema = z.object({
  subtotalCents: z.number().int().nonnegative(),
  descuentoPct: z.number().int(),
  descuentoCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export type ResultadoDescuentoCategoria = z.infer<typeof ResultadoDescuentoCategoriaSchema>;
