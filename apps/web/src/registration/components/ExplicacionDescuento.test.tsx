import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExplicacionDescuento } from "./ExplicacionDescuento";

afterEach(cleanup);

describe("ExplicacionDescuento", () => {
  it("muestra los umbrales de la configuración recibida, con el monto en formato de miles", () => {
    render(
      <ExplicacionDescuento
        config={{
          minServicios3pct: 2,
          minServicios5pct: 4,
          montoMinimo5pctServiciosCents: 150000,
          minProductos3pct: 3,
          minProductos5pct: 6,
        }}
      />,
    );

    const servicios = screen.getByText(/servicios:/i).closest("li");
    expect(servicios?.textContent).toContain("2 o más servicios");
    expect(servicios?.textContent).toContain("4 o más servicios");
    expect(servicios?.textContent).toContain("Q1,500.00");

    const productos = screen.getByText(/productos:/i).closest("li");
    expect(productos?.textContent).toContain("3 o más productos");
    expect(productos?.textContent).toContain("6 o más productos");
  });
});
