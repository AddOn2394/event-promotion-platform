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
