import { formatearCents } from "@event-promotion/shared-types";

// Entrada de montos en quetzales para formularios (admin: precio de catálogo, monto mínimo del
// descuento). El contrato sigue en centavos enteros (ADR-005): esto solo traduce lo que la
// persona teclea a centavos y de vuelta. Vive en apps/web y no en shared-types porque la API
// nunca parsea texto de un input (criterio de ADR-025/ADR-031: ambas apps necesitan lo mismo).
// Sin Intl y sin float: el parseo compone enteros × 100 + decimales, nunca parseFloat × 100
// (19.99 * 100 da 1998.9999999999998).

const MAX_DIGITOS_ENTEROS = 7; // Q9,999,999.99 = 999,999,999 centavos, dentro del INTEGER de Postgres
const MAX_DECIMALES = 2;

function agrupar(enteros: string): string {
  return enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Formato en vivo: deja dígitos y un solo punto decimal, agrupa los miles y conserva el punto
// final ("1,500." mientras se teclea el decimal).
export function formatearEntradaMonto(crudo: string): string {
  const limpio = crudo.replace(/[^\d.]/g, "");
  const posPunto = limpio.indexOf(".");
  const tienePunto = posPunto !== -1;

  const enterosCrudos = tienePunto ? limpio.slice(0, posPunto) : limpio;
  const decimales = tienePunto ? limpio.slice(posPunto + 1).replace(/\./g, "").slice(0, MAX_DECIMALES) : "";
  const enteros = enterosCrudos.replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITOS_ENTEROS);

  const parteEntera = enteros === "" ? (tienePunto ? "0" : "") : agrupar(enteros);
  return tienePunto ? `${parteEntera}.${decimales}` : parteEntera;
}

const MONTO_VALIDO = /^(\d{1,3}(,\d{3})+|\d+)?(\.\d{0,2})?$/;

// Estricto: null ante cualquier cosa que no sea un monto (vacío, letras, negativo, más de 2
// decimales, comas mal agrupadas). Acepta "Q" inicial, "1,500.50", "1500", "1500.5", ".5".
export function parsearMontoACents(texto: string): number | null {
  const limpio = texto.trim().replace(/^Q/i, "");
  if (limpio === "" || limpio === "." || !MONTO_VALIDO.test(limpio)) return null;

  const [enteros = "", decimales = ""] = limpio.replace(/,/g, "").split(".");
  const centavos = Number(enteros === "" ? "0" : enteros) * 100 + Number(decimales.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

// Texto que se muestra para un valor en centavos: "1,500.50" (sin la "Q", que va como prefijo
// visual fuera del input). Reutiliza formatearCents para no reimplementar la agrupación.
export function textoDesdeCents(cents: number | undefined): string {
  return cents === undefined ? "" : formatearCents(cents).slice(1);
}

function esSignificativo(caracter: string): boolean {
  return /[\d.]/.test(caracter);
}

// El cursor no debe saltar al final cuando el formato inserta o quita una coma: se cuentan los
// dígitos/punto a la izquierda del cursor ANTES de formatear y se recoloca después.
export function significativosAntesDelCursor(texto: string, cursor: number): number {
  return [...texto.slice(0, cursor)].filter(esSignificativo).length;
}

export function posicionCursor(formateado: string, significativosAntes: number): number {
  if (significativosAntes <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < formateado.length; i += 1) {
    if (esSignificativo(formateado.charAt(i))) vistos += 1;
    if (vistos === significativosAntes) return i + 1;
  }
  return formateado.length;
}
