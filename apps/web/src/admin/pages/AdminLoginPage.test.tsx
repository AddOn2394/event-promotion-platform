import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { AdminLoginPage } from "./AdminLoginPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

describe("AdminLoginPage — validación (react-hook-form + zodResolver, ADR-016)", () => {
  it("muestra errores de validación cuando se envía vacío", async () => {
    renderWithProviders(<AdminLoginPage />, { initialEntries: ["/admin/login"] });

    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("los inputs tienen labels asociados (accesibilidad básica, CLAUDE.md)", () => {
    renderWithProviders(<AdminLoginPage />, { initialEntries: ["/admin/login"] });

    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/contraseña/i)).toBeTruthy();
  });
});
