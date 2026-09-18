// ADR-010: la ventana de edición cierra N días antes del slot vigente de la confirmación,
// evaluada contra ese slot antes de cualquier cambio (nunca contra el slot destino de un
// cambio, HU-5). Función pura server-only — apps/web no necesita este resultado
// autoritativo (no aplica el criterio de ADR-025), solo muestra el mensaje que el servidor
// devuelve cuando rechaza.
export function dentroDeVentanaEdicion(fechaHoraInicioSlot: Date, diasDeadline: number, ahora: Date): boolean {
  const corteMs = fechaHoraInicioSlot.getTime() - diasDeadline * 24 * 60 * 60 * 1000;
  return ahora.getTime() < corteMs;
}
