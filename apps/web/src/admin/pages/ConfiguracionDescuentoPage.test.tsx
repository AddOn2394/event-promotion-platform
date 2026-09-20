import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { ConfiguracionDescuentoPage } from "./ConfiguracionDescuentoPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

const CONFIG = {
  minServicios3pct: 2,
  minServicios5pct: 2,
  montoMinimo5pctServiciosCents: 150000,
  minProductos3pct: 3,
  minProductos5pct: 5,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("ConfiguracionDescuentoPage — monto mínimo en quetzales", () => {
  it("muestra el monto guardado en centavos como quetzales con formato, y lo envía de vuelta en centavos", async () => {
    sessionStorage.setItem("admin-session-email", "admin@example.com");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/admin/configuracion/descuento") && (init?.method ?? "GET") === "GET") return json(CONFIG);
      if (url.includes("/admin/configuracion/descuento") && init?.method === "PATCH") return json(JSON.parse(init.body as string));
      throw new Error(`fetch no mockeado: ${url}`);
    });

    renderWithProviders(<ConfiguracionDescuentoPage />, { initialEntries: ["/admin/descuento"] });

    const campo = (await screen.findByLabelText("Monto mínimo en servicios para 5% (Q)")) as HTMLInputElement;
    // El formulario recibe los valores del servidor un instante después de montar el campo.
    await waitFor(() => expect(campo.value).toBe("1,500.00"));

    fireEvent.change(campo, { target: { value: "2000.75" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await screen.findByText(/configuración actualizada/i);
    const patch = fetchSpy.mock.calls.find((call) => call[1]?.method === "PATCH");
    expect(JSON.parse((patch?.[1] as RequestInit).body as string).montoMinimo5pctServiciosCents).toBe(200075);

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });

  it("un monto vacío se rechaza con un mensaje en español", async () => {
    sessionStorage.setItem("admin-session-email", "admin@example.com");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json(CONFIG));

    renderWithProviders(<ConfiguracionDescuentoPage />, { initialEntries: ["/admin/descuento"] });

    const campo = (await screen.findByLabelText("Monto mínimo en servicios para 5% (Q)")) as HTMLInputElement;
    await waitFor(() => expect(campo.value).toBe("1,500.00"));
    fireEvent.change(campo, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText("Ingrese un monto")).toBeTruthy();
    expect(screen.queryByText(/invalid|expected|nan/i)).toBeNull();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });
});
