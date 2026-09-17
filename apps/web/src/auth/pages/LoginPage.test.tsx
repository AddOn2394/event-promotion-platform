import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { LoginPage } from "./LoginPage";
import { renderWithProviders } from "../../test-support/renderWithProviders";

afterEach(cleanup);

describe("LoginPage — prellenado desde el link de invitación (formato /login?email=...)", () => {
  it("prellena el email desde el query param", () => {
    renderWithProviders(<LoginPage />, { initialEntries: ["/login?email=cliente@example.com"] });

    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("cliente@example.com");
  });

  it("rechaza un código que no tiene exactamente 6 dígitos", async () => {
    renderWithProviders(<LoginPage />, { initialEntries: ["/login?email=cliente@example.com"] });

    fireEvent.input(screen.getByLabelText(/código de acceso/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });
});
