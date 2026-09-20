import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

function respuesta(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("apiFetch — errores descriptivos y en español", () => {
  it("devuelve el mensaje que manda el servidor", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta({ error: "El nombre no puede quedar vacío" }, 400));
    await expect(apiFetch("/x")).rejects.toMatchObject({ status: 400, message: "El nombre no puede quedar vacío" });
  });

  it("si el servidor no manda texto, el genérico está en español y trae el código", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respuesta({}, 500));
    const error = await apiFetch("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toMatch(/error inesperado \(código 500\)/i);
  });

  it("un fallo de red ('Failed to fetch') se convierte en un mensaje en español", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await apiFetch("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toMatch(/no se pudo conectar con el servidor/i);
    expect((error as ApiError).message).not.toMatch(/failed to fetch/i);
  });

  it("una cancelación pedida por quien llama (AbortError) no se disfraza de error de conexión", async () => {
    const cancelacion = new DOMException("The operation was aborted.", "AbortError");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(cancelacion);
    const error = await apiFetch("/x").catch((e: unknown) => e);
    expect(error).toBe(cancelacion);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
