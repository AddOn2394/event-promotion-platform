import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { CatalogoAdminPage } from "./CatalogoAdminPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function montarServidor() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/admin/catalogo") && (init?.method ?? "GET") === "GET") return json([]);
    if (url.includes("/admin/catalogo") && init?.method === "POST") {
      return json(
        { id: "44444444-4444-4444-4444-444444444444", nombre: "Ítem", categoria: "servicio", precioCents: 150050, activo: true },
        201,
      );
    }
    throw new Error(`fetch no mockeado: ${url}`);
  });
}

function abrirPantalla() {
  sessionStorage.setItem("admin-session-email", "admin@example.com");
  renderWithProviders(<CatalogoAdminPage />, { initialEntries: ["/admin/catalogo"] });
}

describe("CatalogoAdminPage — precio en quetzales y mensajes de error en español", () => {
  it("escribir el precio normal ('1,500.5') envía centavos enteros al servidor (150050) y limpia el formulario", async () => {
    const fetchSpy = montarServidor();
    abrirPantalla();

    fireEvent.input(screen.getByLabelText("Nombre"), { target: { value: "Auditoría de red" } });
    fireEvent.change(screen.getByLabelText("Precio (Q)"), { target: { value: "1500.5" } });
    expect((screen.getByLabelText("Precio (Q)") as HTMLInputElement).value).toBe("1,500.5");
    fireEvent.click(screen.getByRole("button", { name: /crear ítem/i }));

    await screen.findByText(/ítem creado/i);
    const post = fetchSpy.mock.calls.find((call) => call[1]?.method === "POST");
    const body = JSON.parse((post?.[1] as RequestInit).body as string);
    expect(body).toEqual({ nombre: "Auditoría de red", categoria: "servicio", precioCents: 150050 });

    expect((screen.getByLabelText("Precio (Q)") as HTMLInputElement).value).toBe("");
    fetchSpy.mockRestore();
    sessionStorage.clear();
  });

  it("nombre vacío dice 'El nombre no puede quedar vacío', no el texto en inglés de Zod", async () => {
    const fetchSpy = montarServidor();
    abrirPantalla();

    fireEvent.change(screen.getByLabelText("Precio (Q)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /crear ítem/i }));

    expect(await screen.findByText("El nombre no puede quedar vacío")).toBeTruthy();
    expect(screen.queryByText(/string must contain|at least 1 character/i)).toBeNull();
    expect(fetchSpy.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });

  it("precio vacío pide ingresar un monto, en español", async () => {
    const fetchSpy = montarServidor();
    abrirPantalla();

    fireEvent.input(screen.getByLabelText("Nombre"), { target: { value: "Ítem sin precio" } });
    fireEvent.click(screen.getByRole("button", { name: /crear ítem/i }));

    expect(await screen.findByText("Ingrese un monto")).toBeTruthy();
    expect(screen.queryByText(/invalid|expected|required|nan/i)).toBeNull();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });
});
