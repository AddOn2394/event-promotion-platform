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
