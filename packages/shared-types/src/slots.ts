import { z } from "zod";

// Contrato de slots (ADR-008) — Gate 2: día/horario/cupo_maximo ya existen, sin
// cupos_disponibles/mecánica de cupo todavía (exclusivo de Gate 3, ver PLAN_DESARROLLO.md).

export const SlotSchema = z.object({
  id: z.string().uuid(),
  fechaHoraInicio: z.string().datetime(),
  fechaHoraFin: z.string().datetime(),
});

export const SlotsResponseSchema = z.array(SlotSchema);

export type Slot = z.infer<typeof SlotSchema>;
export type SlotsResponse = z.infer<typeof SlotsResponseSchema>;
