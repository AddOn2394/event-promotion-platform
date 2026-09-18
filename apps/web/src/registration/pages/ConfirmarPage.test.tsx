import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { ConfirmarPage } from "./ConfirmarPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const CONFIG = { minServicios3pct: 2, minServicios5pct: 2, montoMinimo5pctServiciosCents: 150000, minProductos3pct: 3, minProductos5pct: 5 };
const ITEM = { id: "11111111-1111-1111-1111-111111111111", nombre: "Servicio de prueba", categoria: "servicio", precioCents: 10000 };
const SLOT = {
  id: "22222222-2222-2222-2222-222222222222",
  fechaHoraInicio: "2026-10-01T10:00:00.000Z",
  fechaHoraFin: "2026-10-01T12:00:00.000Z",
  cuposDisponibles: 5,
};

describe("ConfirmarPage — nombreCliente vacío no debe romper el submit (bug de setValueAs)", () => {
  it("envía el formulario sin error de validación cuando nombreCliente se deja vacío", async () => {
    // Sembramos sessionStorage antes de montar — así arranca en la misma situación que
    // tendría en la app real (LoginPage ya seteó la sesión antes de navegar a /confirmar).
    sessionStorage.setItem("cliente-session", JSON.stringify({ email: "cliente@example.com", nombreCliente: null }));

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/catalogo")) return jsonResponse([ITEM]);
      if (url.includes("/slots")) return jsonResponse([SLOT]);
      if (url.includes("/configuracion-descuento")) return jsonResponse(CONFIG);
      if (url.includes("/confirmaciones")) {
        return jsonResponse(
          { subtotalServiciosCents: 10000, descuentoServiciosPct: 0, subtotalProductosCents: 0, descuentoProductosPct: 0, totalCents: 10000 },
          201,
        );
      }
      throw new Error(`fetch no mockeado: ${url}`);
    });

    renderWithProviders(<ConfirmarPage />, { initialEntries: ["/confirmar"] });

    await screen.findByRole("heading", { name: /confirmar asistencia/i });

    fireEvent.click(screen.getByRole("button", { name: /agregar servicio de prueba/i }));
    fireEvent.change(screen.getByLabelText(/horario/i), { target: { value: SLOT.id } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar asistencia/i }));

    await screen.findByText(/confirmación registrada/i);
    expect(screen.queryByText(/al menos 1 carácter|string must contain/i)).toBeNull();

    const confirmCall = fetchSpy.mock.calls.find(([input]) =>
      (typeof input === "string" ? input : (input as Request).url).includes("/confirmaciones"),
    );
    const body = JSON.parse((confirmCall?.[1] as RequestInit).body as string);
    expect(body.nombreCliente).toBeUndefined();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });
});
