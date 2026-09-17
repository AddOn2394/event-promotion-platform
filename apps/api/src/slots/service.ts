import type { Slot } from "@event-promotion/shared-types";
import { pool } from "../db/pool.js";

type SlotRow = {
  idslot: string;
  fecha_hora_inicio: Date;
  fecha_hora_fin: Date;
  cupos_disponibles: number;
};

// pg devuelve TIMESTAMPTZ como Date nativo, no como string — hay que convertir a ISO
// explícitamente antes de validar contra SlotSchema (z.string().datetime()).
function toSlot(row: SlotRow): Slot {
  return {
    id: row.idslot,
    fechaHoraInicio: row.fecha_hora_inicio.toISOString(),
    fechaHoraFin: row.fecha_hora_fin.toISOString(),
    cuposDisponibles: row.cupos_disponibles,
  };
}

// ADR-007: solo slots activos hacia el formulario del cliente.
export async function listarSlotsActivos(): Promise<Slot[]> {
  const { rows } = await pool.query<SlotRow>(
    "SELECT idslot, fecha_hora_inicio, fecha_hora_fin, cupos_disponibles FROM slots WHERE activo = true ORDER BY fecha_hora_inicio",
  );
  return rows.map(toSlot);
}

export async function buscarSlotActivoPorId(idslot: string): Promise<Slot | null> {
  const { rows } = await pool.query<SlotRow>(
    "SELECT idslot, fecha_hora_inicio, fecha_hora_fin, cupos_disponibles FROM slots WHERE idslot = $1 AND activo = true",
    [idslot],
  );
  const row = rows[0];
  return row ? toSlot(row) : null;
}
