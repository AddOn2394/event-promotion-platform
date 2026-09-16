import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// Contrato de HU-3 (spec/SPEC_FUNCIONAL.md) — ver ADR-003, ADR-005, ADR-023.
// Los % de descuento y totales son siempre enteros en centavos (ADR-005 punto 2).

export const ConfirmarAsistenciaItemSchema = z
  .object({
    catalogoItemId: z.string().uuid().openapi({ description: "CATALOGO_ITEM.idcatalogo" }),
    categoria: z.enum(["servicio", "producto"]),
  })
  .openapi("ConfirmarAsistenciaItem");

export const ConfirmarAsistenciaRequestSchema = z
  .object({
    items: z
      .array(ConfirmarAsistenciaItemSchema)
      .min(1, "Debe seleccionar al menos un servicio o producto"),
    slotId: z.string().uuid().openapi({ description: "SLOT.idslot" }),
  })
  .openapi("ConfirmarAsistenciaRequest");

export const ConfirmarAsistenciaResponseSchema = z
  .object({
    subtotalServiciosCents: z.number().int().nonnegative(),
    descuentoServiciosPct: z.number().int(),
    subtotalProductosCents: z.number().int().nonnegative(),
    descuentoProductosPct: z.number().int(),
    totalCents: z.number().int().nonnegative(),
  })
  .openapi("ConfirmarAsistenciaResponse");

export type ConfirmarAsistenciaItem = z.infer<typeof ConfirmarAsistenciaItemSchema>;
export type ConfirmarAsistenciaRequest = z.infer<typeof ConfirmarAsistenciaRequestSchema>;
export type ConfirmarAsistenciaResponse = z.infer<typeof ConfirmarAsistenciaResponseSchema>;
