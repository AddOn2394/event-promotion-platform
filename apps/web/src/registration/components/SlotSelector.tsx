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
  const cupos =
    slot.cuposDisponibles === 0
      ? "sin cupo"
      : `${slot.cuposDisponibles} cupo${slot.cuposDisponibles === 1 ? "" : "s"} disponible${slot.cuposDisponibles === 1 ? "" : "s"}`;
  return `${fecha} — ${horaInicio} a ${horaFin} (${cupos})`;
}

// cuposDisponibles es informativo (ADR-009) — deshabilitar la opción en 0 es solo UX,
// el servidor sigue siendo quien rechaza si el cupo se agota entre cargar y enviar el formulario.
export function SlotSelector({ slots, registration, error }: Props) {
  return (
    <div>
      <label htmlFor="slotId">Horario</label>
      <select id="slotId" {...registration}>
        <option value="">Seleccioná un horario</option>
        {slots.map((slot) => (
          <option key={slot.id} value={slot.id} disabled={slot.cuposDisponibles === 0}>
            {formatearSlot(slot)}
          </option>
        ))}
      </select>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
