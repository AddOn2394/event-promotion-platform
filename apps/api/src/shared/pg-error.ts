// Código de error de Postgres para violación de constraint UNIQUE.
const UNIQUE_VIOLATION_CODE = "23505";

export function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION_CODE
  );
}
