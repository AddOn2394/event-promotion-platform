import { z } from "zod";
import { DatetimeSchema, UuidSchema } from "./primitives.js";

// Contrato de slots (ADR-008) — Gate 2: día/horario/cupo_maximo ya existen, sin
// cupos_disponibles/mecánica de cupo todavía (exclusivo de Gate 3, ver PLAN_DESARROLLO.md).

export const SlotSchema = z.object({
  id: UuidSchema,
  fechaHoraInicio: DatetimeSchema,
  fechaHoraFin: DatetimeSchema,
});

export const SlotsResponseSchema = z.array(SlotSchema);

export type Slot = z.infer<typeof SlotSchema>;
export type SlotsResponse = z.infer<typeof SlotsResponseSchema>;
