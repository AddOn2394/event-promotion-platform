import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ExplicacionDescuento } from "./ExplicacionDescuento";

afterEach(cleanup);

const CONFIG = {
  minServicios3pct: 2,
  minServicios5pct: 4,
  montoMinimo5pctServiciosCents: 150000,
  minProductos3pct: 3,
  minProductos5pct: 6,
};

function filasDe(categoria: string): string[] {
  const grupo = screen.getByRole("heading", { name: categoria }).parentElement as HTMLElement;
  return within(grupo)
    .getAllByRole("listitem")
    .map((fila) => fila.textContent ?? "");
}

describe("ExplicacionDescuento — lista por categoría, una regla por línea", () => {
  it("muestra 2 reglas por categoría, cada una con su porcentaje y su condición", () => {
    render(<ExplicacionDescuento config={CONFIG} />);

    expect(filasDe("Servicios")).toEqual([
      "3%2 o más servicios",
      "5%4 o más servicios que sumen más de Q1,500.00",
    ]);
    expect(filasDe("Productos")).toEqual(["3%3 o más productos", "5%6 o más productos"]);
  });

  it("los umbrales salen de la configuración recibida, no de constantes", () => {
    render(<ExplicacionDescuento config={{ ...CONFIG, minServicios3pct: 7, montoMinimo5pctServiciosCents: 2500050 }} />);

    expect(filasDe("Servicios")[0]).toBe("3%7 o más servicios");
    expect(filasDe("Servicios")[1]).toContain("Q25,000.50");
  });

  it("aclara que las categorías se calculan por separado", () => {
    render(<ExplicacionDescuento config={CONFIG} />);
    expect(screen.getByText(/se calculan por separado/i)).toBeTruthy();
  });
});
