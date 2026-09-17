import { z } from "zod";
import { CategoriaCatalogoSchema } from "./catalogo.js";
import { CentsSchema, PctSchema, UuidSchema } from "./primitives.js";

// Contrato de HU-3 (spec/SPEC_FUNCIONAL.md) — ver ADR-003, ADR-005, ADR-023.
// Los % de descuento y totales son siempre enteros en centavos (ADR-005 punto 2).
// Sin metadata de zod-to-openapi aquí a propósito: este archivo lo importa apps/web,
// y extender el prototipo de z (extendZodWithOpenApi) arrastraría esa dependencia
// al bundle del cliente. El registro para el OpenAPI vive solo en generate-openapi.ts.

export const ConfirmarAsistenciaItemSchema = z.object({
  catalogoItemId: UuidSchema,
  categoria: CategoriaCatalogoSchema,
});

export const ConfirmarAsistenciaRequestSchema = z.object({
  items: z
    .array(ConfirmarAsistenciaItemSchema)
    .min(1, "Debe seleccionar al menos un servicio o producto"),
  slotId: UuidSchema,
  // Editable al confirmar (ADR-011) — el email de la invitación nunca se edita, solo el
  // nombre. Opcional: si no viene, se conserva el nombre_cliente que ya tenía la invitación.
  nombreCliente: z.string().min(1).optional(),
});

export const ConfirmarAsistenciaResponseSchema = z.object({
  subtotalServiciosCents: CentsSchema,
  descuentoServiciosPct: PctSchema,
  subtotalProductosCents: CentsSchema,
  descuentoProductosPct: PctSchema,
  totalCents: CentsSchema,
});

export type ConfirmarAsistenciaItem = z.infer<typeof ConfirmarAsistenciaItemSchema>;
export type ConfirmarAsistenciaRequest = z.infer<typeof ConfirmarAsistenciaRequestSchema>;
export type ConfirmarAsistenciaResponse = z.infer<typeof ConfirmarAsistenciaResponseSchema>;
