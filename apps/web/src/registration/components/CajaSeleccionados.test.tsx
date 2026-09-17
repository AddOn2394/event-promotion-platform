import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CatalogoItem } from "@event-promotion/shared-types";
import { CajaSeleccionados } from "./CajaSeleccionados";

afterEach(cleanup);

const ITEMS: CatalogoItem[] = [{ id: "1", nombre: "Masaje relajante", categoria: "servicio", precioCents: 50000 }];

describe("CajaSeleccionados — caja en vivo (ADR-004)", () => {
  it("muestra el % de descuento y el total del preview", () => {
    render(
      <CajaSeleccionados
        titulo="Servicios seleccionados"
        items={ITEMS}
        subtotalCents={50000}
        descuentoPct={3}
        totalCents={48500}
        onQuitar={vi.fn()}
      />,
    );

    expect(screen.getByText(/3%/)).toBeTruthy();
    expect(screen.getByText(/Q485\.00/)).toBeTruthy();
  });

  it("llama onQuitar con el id del ítem al hacer click en Quitar", () => {
    const onQuitar = vi.fn();
    render(
      <CajaSeleccionados
        titulo="Servicios seleccionados"
        items={ITEMS}
        subtotalCents={50000}
        descuentoPct={3}
        totalCents={48500}
        onQuitar={onQuitar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /quitar masaje relajante/i }));

    expect(onQuitar).toHaveBeenCalledWith("1");
  });
});
