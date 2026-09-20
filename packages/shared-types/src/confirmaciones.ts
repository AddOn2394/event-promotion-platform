import { z } from "zod";
import { CategoriaCatalogoSchema } from "./catalogo.js";
import { CentsSchema, DatetimeSchema, PctSchema, UuidSchema } from "./primitives.js";

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

// Los cinco números que el motor de descuento produce (ADR-004/ADR-005). Lo usan también los
// correos, que no necesitan la fecha límite de la respuesta HTTP.
export const TotalesConfirmacionSchema = z.object({
  subtotalServiciosCents: CentsSchema,
  descuentoServiciosPct: PctSchema,
  subtotalProductosCents: CentsSchema,
  descuentoProductosPct: PctSchema,
  totalCents: CentsSchema,
});

export const ConfirmarAsistenciaResponseSchema = TotalesConfirmacionSchema.extend({
  // ADR-010: hasta cuándo puede editar o cancelar (N días antes del slot vigente). Lo calcula
  // el servidor — pantalla y correo muestran exactamente la misma fecha.
  editableHastaEn: DatetimeSchema,
  // Horario del slot vigente, leído por el servidor sin filtrar por activo (ADR-029): el recibo
  // de pantalla y el correo salen de la misma fuente, aunque el slot se haya desactivado después.
  horario: z.object({ fechaHoraInicio: DatetimeSchema, fechaHoraFin: DatetimeSchema }),
});

export type TotalesConfirmacion = z.infer<typeof TotalesConfirmacionSchema>;
export type ConfirmarAsistenciaItem = z.infer<typeof ConfirmarAsistenciaItemSchema>;
export type ConfirmarAsistenciaRequest = z.infer<typeof ConfirmarAsistenciaRequestSchema>;
export type ConfirmarAsistenciaResponse = z.infer<typeof ConfirmarAsistenciaResponseSchema>;

// HU-4/HU-5 (Gate 4): editar selección y/o cambiar de slot es un reemplazo completo de la
// selección vigente, misma forma que confirmar por primera vez — se reutiliza el mismo
// schema de request/response en vez de duplicar la validación (ADR-003).
export const EditarConfirmacionRequestSchema = ConfirmarAsistenciaRequestSchema;
export type EditarConfirmacionRequest = ConfirmarAsistenciaRequest;

export const EditarConfirmacionResponseSchema = ConfirmarAsistenciaResponseSchema;
export type EditarConfirmacionResponse = ConfirmarAsistenciaResponse;

// HU-6: respuesta mínima de cancelar — no hay snapshot nuevo que devolver, solo el estado.
export const CancelarConfirmacionResponseSchema = z.object({
  estado: z.literal("cancelada"),
});
export type CancelarConfirmacionResponse = z.infer<typeof CancelarConfirmacionResponseSchema>;

// GET /confirmaciones/mia: lo que la pantalla de edición necesita para precargar el
// formulario (HU-4/HU-5) — selección actual + slot + snapshot de descuento vigente.
export const ConfirmacionPropiaItemSchema = z.object({
  catalogoItemId: UuidSchema,
  categoria: CategoriaCatalogoSchema,
  nombre: z.string(),
  precioCents: CentsSchema,
});

export const ConfirmacionPropiaResponseSchema = z.object({
  estado: z.enum(["confirmada", "cancelada"]),
  slotId: UuidSchema,
  nombreCliente: z.string().nullable(),
  items: z.array(ConfirmacionPropiaItemSchema),
  subtotalServiciosCents: CentsSchema,
  descuentoServiciosPct: PctSchema,
  subtotalProductosCents: CentsSchema,
  descuentoProductosPct: PctSchema,
  totalCents: CentsSchema,
  editableHastaEn: DatetimeSchema,
});
export type ConfirmacionPropiaItem = z.infer<typeof ConfirmacionPropiaItemSchema>;
export type ConfirmacionPropiaResponse = z.infer<typeof ConfirmacionPropiaResponseSchema>;
