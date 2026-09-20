// ADR-031 (extiende ADR-025): formateador de montos compartido — web y api muestran el mismo
// texto exacto para un mismo monto en centavos. Formato explícito (coma de miles, punto
// decimal), sin Intl/toLocaleString: el resultado no puede depender del locale del navegador
// ni del ICU con el que se compiló Node.
//
// Precondición: `cents` es un entero (ADR-005, CLAUDE.md). Se opera sobre los dígitos, no
// sobre el número, así que un float como 1500.5 produciría texto sin sentido — por eso se
// rechaza en vez de formatearlo en silencio.
export function formatearCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`formatearCents requiere centavos enteros, recibió ${cents}.`);
  }
  const signo = cents < 0 ? "-" : "";
  const digitos = String(Math.abs(cents)).padStart(3, "0");
  const enteros = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const centavos = digitos.slice(-2);
  return `${signo}Q${enteros}.${centavos}`;
}
