const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// Todo dato de usuario que entra a un correo (nombreCliente, nombre de un ítem del snapshot)
// es texto libre — sin escapar, un nombre como <script> o "><b> se interpretaría como HTML en
// el cliente de correo de quien lo recibe. Sirve también dentro de un atributo (href="…"):
// cubre las comillas, no solo los ángulos.
export function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter] ?? caracter);
}
