import { z } from "zod";
import { DatetimeSchema, EmailSchema, UuidSchema } from "./primitives.js";

// Contrato del admin panel — Gate 2 (ADR-011, ADR-013): login admin + crear invitación.
// El resto del admin panel (catálogo, slots, export) es Gate 5.

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
