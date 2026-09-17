import type { UseFormRegisterReturn } from "react-hook-form";
import type { Slot } from "@event-promotion/shared-types";

type Props = {
  slots: Slot[];
  registration: UseFormRegisterReturn;
  error?: string;
};

function formatearSlot(slot: Slot): string {
  const inicio = new Date(slot.fechaHoraInicio);
  const fin = new Date(slot.fechaHoraFin);
  const fecha = inicio.toLocaleDateString("es-GT", { dateStyle: "medium" });
  const horaInicio = inicio.toLocaleTimeString("es-GT", { timeStyle: "short" });
  const horaFin = fin.toLocaleTimeString("es-GT", { timeStyle: "short" });
  return `${fecha} — ${horaInicio} a ${horaFin}`;
}

// Cupos disponibles no se muestran todavía (Gate 3) — solo el horario en sí.
export function SlotSelector({ slots, registration, error }: Props) {
  return (
    <div>
      <label htmlFor="slotId">Horario</label>
      <select id="slotId" {...registration}>
        <option value="">Seleccioná un horario</option>
        {slots.map((slot) => (
          <option key={slot.id} value={slot.id}>
            {formatearSlot(slot)}
          </option>
        ))}
      </select>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
