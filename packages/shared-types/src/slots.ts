import { z } from "zod";
import { DatetimeSchema, UuidSchema } from "./primitives.js";

// Contrato de slots (ADR-008). cupos_disponibles (Gate 3, ADR-009) es informativo para el
// cliente — el servidor siempre revalida con el UPDATE condicional, nunca es autoritativo aquí.

export const SlotSchema = z.object({
  id: UuidSchema,
  fechaHoraInicio: DatetimeSchema,
  fechaHoraFin: DatetimeSchema,
  cuposDisponibles: z.number().int().nonnegative(),
});

export const SlotsResponseSchema = z.array(SlotSchema);

export type Slot = z.infer<typeof SlotSchema>;
export type SlotsResponse = z.infer<typeof SlotsResponseSchema>;

// HU-10 (Gate 5, ADR-007/ADR-009): CRUD + soft-delete de slots. El admin panel expone
// cupoMaximo y activo, que GET /slots (cliente) no expone.
export const SlotAdminSchema = z.object({
  id: UuidSchema,
  fechaHoraInicio: DatetimeSchema,
  fechaHoraFin: DatetimeSchema,
  cupoMaximo: z.number().int().positive(),
  cuposDisponibles: z.number().int().nonnegative(),
  activo: z.boolean(),
});

export const SlotsAdminResponseSchema = z.array(SlotAdminSchema);

const CupoMaximoSchema = z
  .number({ required_error: "Ingrese el cupo máximo", invalid_type_error: "El cupo debe ser un número entero mayor que 0" })
  .int("El cupo debe ser un número entero mayor que 0")
  .positive("El cupo debe ser un número entero mayor que 0");

function fechaFinDespuesDeInicio(data: { fechaHoraInicio: string; fechaHoraFin: string }): boolean {
  return new Date(data.fechaHoraFin) > new Date(data.fechaHoraInicio);
}

export const CrearSlotRequestSchema = z
  .object({
    fechaHoraInicio: DatetimeSchema,
    fechaHoraFin: DatetimeSchema,
    cupoMaximo: CupoMaximoSchema,
  })
  .refine(fechaFinDespuesDeInicio, {
    message: "La fecha y hora de fin debe ser posterior a la de inicio",
    path: ["fechaHoraFin"],
  });

// Reemplazo completo, mismo patrón que ActualizarCatalogoItemRequestSchema — `activo`
// incluido para reactivar desde la misma pantalla. Reducir cupoMaximo por debajo de las
// reservas actuales se valida en apps/api (ADR-009), no aquí: depende de cupos_disponibles
// vigente en la DB, que este schema no conoce.
export const ActualizarSlotRequestSchema = z
  .object({
    fechaHoraInicio: DatetimeSchema,
    fechaHoraFin: DatetimeSchema,
    cupoMaximo: CupoMaximoSchema,
    activo: z.boolean(),
  })
  .refine(fechaFinDespuesDeInicio, {
    message: "La fecha y hora de fin debe ser posterior a la de inicio",
    path: ["fechaHoraFin"],
  });

export type SlotAdmin = z.infer<typeof SlotAdminSchema>;
export type SlotsAdminResponse = z.infer<typeof SlotsAdminResponseSchema>;
export type CrearSlotRequest = z.infer<typeof CrearSlotRequestSchema>;
export type ActualizarSlotRequest = z.infer<typeof ActualizarSlotRequestSchema>;
