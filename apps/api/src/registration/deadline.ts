const MS_POR_DIA = 24 * 60 * 60 * 1000;

// ADR-010: la ventana de edición cierra N días antes del slot vigente de la confirmación.
// Es la misma fecha que se le muestra al cliente (correo y pantalla) y contra la que se
// evalúa el rechazo — un solo cálculo, nunca dos que puedan divergir.
export function calcularFechaLimiteEdicion(fechaHoraInicioSlot: Date, diasDeadline: number): Date {
  return new Date(fechaHoraInicioSlot.getTime() - diasDeadline * MS_POR_DIA);
}

// ADR-010: la ventana de edición cierra N días antes del slot vigente de la confirmación,
// evaluada contra ese slot antes de cualquier cambio (nunca contra el slot destino de un
// cambio, HU-5). Función pura server-only — apps/web no necesita este resultado
// autoritativo (no aplica el criterio de ADR-025), solo muestra el mensaje que el servidor
// devuelve cuando rechaza.
export function dentroDeVentanaEdicion(fechaHoraInicioSlot: Date, diasDeadline: number, ahora: Date): boolean {
  return ahora.getTime() < calcularFechaLimiteEdicion(fechaHoraInicioSlot, diasDeadline).getTime();
}
