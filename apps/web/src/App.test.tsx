import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

afterEach(cleanup);

describe("App (placeholder Gate 0)", () => {
  it("rechaza el envío cuando no hay items ni slotId válido (validación del schema compartido)", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("no muestra error de items cuando se marca el servicio de ejemplo y el slotId es válido", async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("Servicio de ejemplo"));
    fireEvent.input(screen.getByLabelText("Slot"), {
      target: { value: "22222222-2222-2222-2222-222222222222" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/al menos un servicio o producto/i)).toBeNull();
  });
});
