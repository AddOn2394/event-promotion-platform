import { z } from "zod";

// Contrato de HU-3 (spec/SPEC_FUNCIONAL.md) — ver ADR-003, ADR-005, ADR-023.
// Los % de descuento y totales son siempre enteros en centavos (ADR-005 punto 2).
// Sin metadata de zod-to-openapi aquí a propósito: este archivo lo importa apps/web,
// y extender el prototipo de z (extendZodWithOpenApi) arrastraría esa dependencia
// al bundle del cliente. El registro para el OpenAPI vive solo en generate-openapi.ts.

export const ConfirmarAsistenciaItemSchema = z.object({
  catalogoItemId: z.string().uuid(),
  categoria: z.enum(["servicio", "producto"]),
});

export const ConfirmarAsistenciaRequestSchema = z.object({
  items: z
    .array(ConfirmarAsistenciaItemSchema)
    .min(1, "Debe seleccionar al menos un servicio o producto"),
  slotId: z.string().uuid(),
});

export const ConfirmarAsistenciaResponseSchema = z.object({
  subtotalServiciosCents: z.number().int().nonnegative(),
  descuentoServiciosPct: z.number().int(),
  subtotalProductosCents: z.number().int().nonnegative(),
  descuentoProductosPct: z.number().int(),
  totalCents: z.number().int().nonnegative(),
});

export type ConfirmarAsistenciaItem = z.infer<typeof ConfirmarAsistenciaItemSchema>;
export type ConfirmarAsistenciaRequest = z.infer<typeof ConfirmarAsistenciaRequestSchema>;
export type ConfirmarAsistenciaResponse = z.infer<typeof ConfirmarAsistenciaResponseSchema>;
