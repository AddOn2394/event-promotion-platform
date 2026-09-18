import { z } from "zod";
import { CentsSchema, UuidSchema } from "./primitives.js";

// Contrato de catálogo (HU-3, ADR-007, ADR-012) — catálogo seedeado, sin CRUD todavía (Gate 5).

export const CategoriaCatalogoSchema = z.enum(["servicio", "producto"]);

export const CatalogoItemSchema = z.object({
  id: UuidSchema,
  nombre: z.string(),
  categoria: CategoriaCatalogoSchema,
  precioCents: CentsSchema,
});

export const CatalogoResponseSchema = z.array(CatalogoItemSchema);

export type CategoriaCatalogo = z.infer<typeof CategoriaCatalogoSchema>;
export type CatalogoItem = z.infer<typeof CatalogoItemSchema>;
export type CatalogoResponse = z.infer<typeof CatalogoResponseSchema>;

// HU-9 (Gate 5, ADR-007): CRUD + soft-delete de catálogo. El admin panel ve también
// ítems inactivos (para poder reactivarlos), a diferencia de GET /catalogo (cliente).
export const CatalogoItemAdminSchema = CatalogoItemSchema.extend({
  activo: z.boolean(),
});

export const CatalogoAdminResponseSchema = z.array(CatalogoItemAdminSchema);

export const CrearCatalogoItemRequestSchema = z.object({
  nombre: z.string().min(1),
  categoria: CategoriaCatalogoSchema,
  precioCents: CentsSchema,
});

// Reemplazo completo (mismo patrón que EditarConfirmacionRequestSchema) — un formulario
// simple siempre envía el estado completo del ítem, `activo` incluido para permitir
// reactivar desde la misma pantalla (ADR-007: "el admin panel puede ver inactivos para
// reactivarlos").
export const ActualizarCatalogoItemRequestSchema = CrearCatalogoItemRequestSchema.extend({
  activo: z.boolean(),
});

export type CatalogoItemAdmin = z.infer<typeof CatalogoItemAdminSchema>;
export type CatalogoAdminResponse = z.infer<typeof CatalogoAdminResponseSchema>;
export type CrearCatalogoItemRequest = z.infer<typeof CrearCatalogoItemRequestSchema>;
export type ActualizarCatalogoItemRequest = z.infer<typeof ActualizarCatalogoItemRequestSchema>;
