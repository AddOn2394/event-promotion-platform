import type {
  ActualizarSlotRequest,
  ConfiguracionEvento,
  CrearSlotRequest,
  Slot,
  SlotAdmin,
} from "@event-promotion/shared-types";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { HttpError } from "../shared/http-error.js";

// Permite que estas lecturas corran dentro de una transacción abierta (pasando el
// PoolClient de esa transacción) o fuera de una (pool por default) — necesario para que
// editarConfirmacion/cancelarConfirmacion (Gate 4) puedan leer el deadline/fecha de slot
// con la misma conexión que ya tiene el lock de la fila de confirmaciones.
type Queryable = Pool | PoolClient;

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

export async function buscarSlotActivoPorId(idslot: string, db: Queryable = pool): Promise<Slot | null> {
  const { rows } = await db.query<SlotRow>(
    "SELECT idslot, fecha_hora_inicio, fecha_hora_fin, cupos_disponibles FROM slots WHERE idslot = $1 AND activo = true",
    [idslot],
  );
  const row = rows[0];
  return row ? toSlot(row) : null;
}

// ADR-010: la ventana de edición se evalúa contra el slot que el cliente tiene asignado,
// sin filtrar por activo — un slot soft-deleteado después de asignado no debe volverse
// "inexistente" para efectos de calcular el deadline de una confirmación ya hecha.
export async function obtenerFechaInicioSlot(idslot: string, db: Queryable = pool): Promise<Date | null> {
  const { rows } = await db.query<{ fecha_hora_inicio: Date }>(
    "SELECT fecha_hora_inicio FROM slots WHERE idslot = $1",
    [idslot],
  );
  return rows[0]?.fecha_hora_inicio ?? null;
}

// ADR-010: N días de deadline, configurable desde admin (Gate 5) — sin UI todavía, se lee
// de la misma forma que configuracion_descuento (ADR-023, catalog/service.ts).
export async function leerDiasDeadlineEdicion(db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ dias_deadline_edicion: number }>(
    "SELECT dias_deadline_edicion FROM configuracion_evento",
  );
  const config = rows[0];
  if (!config) {
    throw new Error("configuracion_evento no tiene ninguna fila — falta seedear (ver apps/api/src/db/seed.ts).");
  }
  return config.dias_deadline_edicion;
}

// ADR-011: sin una entidad "evento" propia, el fin del evento completo se deriva del
// último slot activo — decisión tomada explícitamente con el usuario en Gate 4 (no hay
// fecha de fin independiente que mantener ni migrar). Caso borde encontrado en el
// code-review de Gate 6, ratificado con el usuario: un slot desactivado por el admin
// después de que un cliente ya confirmó ahí no debe "adelantar" el fin del evento para esa
// invitación — el admin puede desactivar un slot con reservas activas (desactivarSlot no lo
// bloquea) y ese cliente no debe quedar con el código expirado por una limpieza
// administrativa. Un slot inactivo sin ninguna confirmación vigente sí queda excluido.
export async function obtenerFinDelEvento(): Promise<Date | null> {
  const { rows } = await pool.query<{ fin: Date | null }>(
    `SELECT MAX(fecha_hora_fin) AS fin FROM slots
     WHERE activo = true
        OR idslot IN (SELECT idslot FROM confirmaciones WHERE estado = 'confirmada')`,
  );
  return rows[0]?.fin ?? null;
}

// HU-10 (Gate 5): pantalla de admin para editar el N de días — primera escritura sobre
// configuracion_evento (la tabla existe desde Gate 4, ver leerDiasDeadlineEdicion arriba).
export async function actualizarDiasDeadlineEdicion(dias: number): Promise<ConfiguracionEvento> {
  const { rows } = await pool.query<{ dias_deadline_edicion: number }>(
    "UPDATE configuracion_evento SET dias_deadline_edicion = $1, actualizada_en = now() RETURNING dias_deadline_edicion",
    [dias],
  );
  const config = rows[0];
  if (!config) throw new Error("configuracion_evento no tiene ninguna fila — falta seedear.");
  return { diasDeadlineEdicion: config.dias_deadline_edicion };
}

type SlotAdminRow = SlotRow & { cupo_maximo: number; activo: boolean };

function toSlotAdmin(row: SlotAdminRow): SlotAdmin {
  return {
    ...toSlot(row),
    cupoMaximo: row.cupo_maximo,
    activo: row.activo,
  };
}

// HU-10 (Gate 5, ADR-007): el admin panel ve también slots inactivos, para reactivarlos.
export async function listarSlotsAdmin(): Promise<SlotAdmin[]> {
  const { rows } = await pool.query<SlotAdminRow>(
    "SELECT idslot, fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo FROM slots ORDER BY fecha_hora_inicio",
  );
  return rows.map(toSlotAdmin);
}

export async function crearSlot(input: CrearSlotRequest): Promise<SlotAdmin> {
  const { rows } = await pool.query<SlotAdminRow>(
    `INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles)
     VALUES ($1, $2, $3, $3)
     RETURNING idslot, fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo`,
    [input.fechaHoraInicio, input.fechaHoraFin, input.cupoMaximo],
  );
  const slot = rows[0];
  if (!slot) throw new Error("No se pudo crear el slot.");
  return toSlotAdmin(slot);
}

// ADR-009 (impacto, Gate 5): si el nuevo cupoMaximo es menor que las reservas actuales
// (cupo_maximo - cupos_disponibles), se rechaza sin tocar la fila — nunca se ajusta
// cupos_disponibles a negativo. cupoMaximo se mueve por delta en el mismo UPDATE
// condicional (sin read-then-write con gap), igual que el mecanismo de cupo de HU-3/HU-5.
export async function actualizarSlot(idslot: string, input: ActualizarSlotRequest): Promise<SlotAdmin> {
  const { rows } = await pool.query<SlotAdminRow>(
    `UPDATE slots SET
       fecha_hora_inicio = $1, fecha_hora_fin = $2, activo = $3,
       cupos_disponibles = cupos_disponibles + ($4 - cupo_maximo),
       cupo_maximo = $4
     WHERE idslot = $5 AND $4 >= cupo_maximo - cupos_disponibles
     RETURNING idslot, fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo`,
    [input.fechaHoraInicio, input.fechaHoraFin, input.activo, input.cupoMaximo, idslot],
  );
  const slot = rows[0];
  if (slot) return toSlotAdmin(slot);

  const existe = await pool.query("SELECT 1 FROM slots WHERE idslot = $1", [idslot]);
  if (existe.rowCount === 0) {
    throw new HttpError(404, "Slot no encontrado.");
  }
  throw new HttpError(400, "El nuevo cupo máximo es menor que las reservas actuales.");
}

// HU-10: soft-delete — igual que catálogo (ADR-007), nunca borrado físico.
export async function desactivarSlot(idslot: string): Promise<void> {
  const result = await pool.query("UPDATE slots SET activo = false WHERE idslot = $1", [idslot]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "Slot no encontrado.");
  }
}
