// Los montos siempre llegan en centavos enteros (CLAUDE.md, ADR-005) — esta es la única
// conversión a texto legible, nunca se opera en float sobre el resultado.
export function formatearCents(cents: number): string {
  return `Q${(cents / 100).toFixed(2)}`;
}
