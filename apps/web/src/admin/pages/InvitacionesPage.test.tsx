import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { InvitacionesPage } from "./InvitacionesPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

describe("InvitacionesPage — nombreCliente vacío no debe romper el submit (bug de setValueAs)", () => {
  it("no muestra error de validación en nombreCliente cuando se deja vacío y hay sesión", async () => {
    // Sembramos sessionStorage antes de montar — misma situación que tendría en la app
    // real (AdminLoginPage ya seteó la sesión antes de navegar a /admin/invitaciones).
    sessionStorage.setItem("admin-session-email", "admin@example.com");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/admin/invitaciones") && (init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(
        JSON.stringify({
          idinvitacion: "33333333-3333-3333-3333-333333333333",
          email: "cliente@example.com",
          nombreCliente: null,
          creadaEn: new Date().toISOString(),
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });

    renderWithProviders(<InvitacionesPage />, { initialEntries: ["/admin/invitaciones"] });

    fireEvent.input(screen.getByLabelText(/email del cliente/i), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /invitar/i }));

    await screen.findByText(/invitación creada/i);
    expect(screen.queryByText(/el nombre no puede quedar vacío/i)).toBeNull();

    const postCall = fetchSpy.mock.calls.find((call) => (call[1]?.method ?? "GET") === "POST");
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string);
    expect(body.nombreCliente).toBeUndefined();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });
});
