// Cliente fetch compartido — credentials: "include" siempre (ADR-011/013, CLAUDE.md
// Node/Express): la cookie httpOnly de sesión solo viaja si cada fetch la pide explícitamente.

export const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function extraerMensaje(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
  }
  return fallback;
}

const ERROR_DE_RED = "No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    // Una cancelación pedida por quien llama (AbortSignal) no es un problema de conexión.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // Sin conexión, servidor caído o bloqueo de CORS: el navegador lanza un TypeError en inglés
    // ("Failed to fetch") que no le dice nada útil a quien está usando la pantalla.
    throw new ApiError(0, ERROR_DE_RED, undefined);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      extraerMensaje(body, `Ocurrió un error inesperado (código ${res.status}). Intente de nuevo en unos minutos.`),
      body,
    );
  }

  return body as T;
}
