import type { UseFormRegisterReturn } from "react-hook-form";
import type { Slot } from "@event-promotion/shared-types";
import { formatearHorario } from "../../shared/format";
import { Field, Select } from "../../shared/ui";

type Props = {
  slots: Slot[];
  registration: UseFormRegisterReturn;
  error?: string;
};

function formatearSlot(slot: Slot): string {
  const cupos =
    slot.cuposDisponibles === 0
      ? "sin cupo"
      : `${slot.cuposDisponibles} cupo${slot.cuposDisponibles === 1 ? "" : "s"} disponible${slot.cuposDisponibles === 1 ? "" : "s"}`;
  return `${formatearHorario(slot)} (${cupos})`;
}

// cuposDisponibles es informativo (ADR-009) — deshabilitar la opción en 0 es solo UX,
// el servidor sigue siendo quien rechaza si el cupo se agota entre cargar y enviar el formulario.
export function SlotSelector({ slots, registration, error }: Props) {
  return (
    <Field
      label="Horario"
      htmlFor="slotId"
      error={error}
      hint="Elija el día y la hora a la que asistirá. Los horarios sin cupo no se pueden seleccionar."
    >
      <Select {...registration}>
        <option value="">Seleccione un horario</option>
        {slots.map((slot) => (
          <option key={slot.id} value={slot.id} disabled={slot.cuposDisponibles === 0}>
            {formatearSlot(slot)}
          </option>
        ))}
      </Select>
    </Field>
  );
}
