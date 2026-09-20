// Fechas y horas de cara al cliente, siempre en America/Guatemala — la misma zona que fijan los
// correos (el servidor corre en UTC) — para que pantalla y correo muestren la misma hora aunque
// el navegador esté en otra zona (viaje, VPN). Los montos no viven acá: formatearCents es
// compartido con la API (ADR-031, shared-types).
const ZONA_HORARIA = "America/Guatemala";
export function formatearHorario(slot: { fechaHoraInicio: string; fechaHoraFin: string }): string {
  const inicio = new Date(slot.fechaHoraInicio);
  const fin = new Date(slot.fechaHoraFin);
  const fecha = inicio.toLocaleDateString("es-GT", { dateStyle: "medium", timeZone: ZONA_HORARIA });
  const horaInicio = inicio.toLocaleTimeString("es-GT", { timeStyle: "short", timeZone: ZONA_HORARIA });
  const horaFin = fin.toLocaleTimeString("es-GT", { timeStyle: "short", timeZone: ZONA_HORARIA });
  return `${fecha} — ${horaInicio} a ${horaFin}`;
}

export function formatearFechaLimite(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { dateStyle: "full", timeStyle: "short", timeZone: ZONA_HORARIA });
}
