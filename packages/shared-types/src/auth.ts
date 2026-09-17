import { z } from "zod";
import { EmailSchema } from "./primitives.js";

// Contrato de login de cliente (HU-2, ADR-011) — email + código de 6 dígitos numéricos.

export const LoginClienteRequestSchema = z.object({
  email: EmailSchema,
  codigo: z.string().regex(/^\d{6}$/, "El código debe tener exactamente 6 dígitos numéricos"),
});

export const LoginClienteResponseSchema = z.object({
  email: EmailSchema,
  nombreCliente: z.string().nullable(),
});

export type LoginClienteRequest = z.infer<typeof LoginClienteRequestSchema>;
export type LoginClienteResponse = z.infer<typeof LoginClienteResponseSchema>;
