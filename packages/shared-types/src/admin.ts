import { z } from "zod";
import { CategoriaCatalogoSchema } from "./catalogo.js";
import { CentsSchema, DatetimeSchema, EmailSchema, PctSchema, UuidSchema } from "./primitives.js";

// Contrato del admin panel. Gate 2 (ADR-011, ADR-013): login admin + crear invitación.
// Gate 5 (ADR-013, HU-8/HU-11): listar invitaciones, reenviar código, ver/exportar
// confirmaciones.

export const AdminLoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

export const AdminLoginResponseSchema = z.object({
  email: EmailSchema,
});

export const CrearInvitacionRequestSchema = z.object({
  email: EmailSchema,
  nombreCliente: z.string().min(1).optional(),
});

export const CrearInvitacionResponseSchema = z.object({
  idinvitacion: UuidSchema,
  email: EmailSchema,
  nombreCliente: z.string().nullable(),
  creadaEn: DatetimeSchema,
});

export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;
export type CrearInvitacionRequest = z.infer<typeof CrearInvitacionRequestSchema>;
export type CrearInvitacionResponse = z.infer<typeof CrearInvitacionResponseSchema>;

// HU-8: los 5 estados nunca se agrupan entre sí (ADR-024, ADR-030) — "rebotada" es un rebote
// de la notificación tipo=invitacion y "fallida" es que el correo nunca salió; ambos distintos
// de "sin respuesta" (el correo salió, el cliente simplemente no entró) y de "cancelada"
// (tuvo una confirmación previa).
export const EstadoInvitacionAdminSchema = z.enum(["confirmada", "cancelada", "sin_respuesta", "rebotada", "fallida"]);

export const InvitacionAdminSchema = z.object({
  idinvitacion: UuidSchema,
  email: EmailSchema,
  nombreCliente: z.string().nullable(),
  creadaEn: DatetimeSchema,
  estado: EstadoInvitacionAdminSchema,
});

export const ListarInvitacionesResponseSchema = z.array(InvitacionAdminSchema);

export type EstadoInvitacionAdmin = z.infer<typeof EstadoInvitacionAdminSchema>;
export type InvitacionAdmin = z.infer<typeof InvitacionAdminSchema>;
export type ListarInvitacionesResponse = z.infer<typeof ListarInvitacionesResponseSchema>;

// HU-11 (ADR-026): reenviar genera un código nuevo — la respuesta no incluye el código en
// ningún formato, solo confirma que se generó y envió uno nuevo. Sin timestamp propio: no
// existe una columna persistida que lo respalde (no un valor fabricado en memoria).
export const ReenviarCodigoResponseSchema = z.object({
  idinvitacion: UuidSchema,
});
export type ReenviarCodigoResponse = z.infer<typeof ReenviarCodigoResponseSchema>;

// HU-8: ítem de la selección de una confirmación, para el listado admin y el CSV — viene
// del snapshot (ADR-006), nunca de un join contra el catálogo vigente.
export const ConfirmacionAdminItemSchema = z.object({
  nombre: z.string(),
  categoria: CategoriaCatalogoSchema,
});

export const ConfirmacionAdminSchema = z.object({
  idinvitacion: UuidSchema,
  email: EmailSchema,
  nombreCliente: z.string().nullable(),
  estado: EstadoInvitacionAdminSchema,
  slot: z.object({ fechaHoraInicio: DatetimeSchema, fechaHoraFin: DatetimeSchema }).nullable(),
  items: z.array(ConfirmacionAdminItemSchema),
  subtotalServiciosCents: CentsSchema.nullable(),
  descuentoServiciosPct: PctSchema.nullable(),
  subtotalProductosCents: CentsSchema.nullable(),
  descuentoProductosPct: PctSchema.nullable(),
  totalCents: CentsSchema.nullable(),
});

export const ListarConfirmacionesAdminResponseSchema = z.array(ConfirmacionAdminSchema);

export const ListarConfirmacionesAdminQuerySchema = z.object({
  estado: EstadoInvitacionAdminSchema.optional(),
});

export type ConfirmacionAdminItem = z.infer<typeof ConfirmacionAdminItemSchema>;
export type ConfirmacionAdmin = z.infer<typeof ConfirmacionAdminSchema>;
export type ListarConfirmacionesAdminResponse = z.infer<typeof ListarConfirmacionesAdminResponseSchema>;
export type ListarConfirmacionesAdminQuery = z.infer<typeof ListarConfirmacionesAdminQuerySchema>;
