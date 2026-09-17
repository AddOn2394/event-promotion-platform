import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { App } from "./App";
import { renderWithProviders } from "./test-support/renderWithProviders";

afterEach(cleanup);

describe("App — enrutamiento", () => {
  it("redirige la raíz a /login", () => {
    renderWithProviders(<App />, { initialEntries: ["/"] });
    expect(screen.getByRole("heading", { name: /ingresar/i })).toBeTruthy();
  });
});
