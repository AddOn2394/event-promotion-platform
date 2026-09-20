import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CatalogoItem } from "@event-promotion/shared-types";
import { CatalogoBuscador } from "./CatalogoBuscador";

afterEach(cleanup);

const CATALOGO: CatalogoItem[] = [
  { id: "1", nombre: "Masaje relajante", categoria: "servicio", precioCents: 50000 },
  { id: "2", nombre: "Corte de cabello", categoria: "servicio", precioCents: 30000 },
  { id: "3", nombre: "Crema facial", categoria: "producto", precioCents: 15000 },
];

describe("CatalogoBuscador — filtro client-side (ADR-012)", () => {
  it("filtra por nombre sin llamar al servidor", () => {
    render(<CatalogoBuscador catalogo={CATALOGO} seleccionadosIds={new Set()} onAgregar={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: "masaje" } });

    expect(screen.getAllByText(/masaje relajante/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/corte de cabello/i)).toBeNull();
    expect(screen.queryByText(/crema facial/i)).toBeNull();
  });

  it("deshabilita agregar un ítem ya seleccionado", () => {
    render(
      <CatalogoBuscador catalogo={CATALOGO} seleccionadosIds={new Set(["1"])} onAgregar={vi.fn()} />,
    );

    expect((screen.getByRole("button", { name: /agregado/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("llama onAgregar con el ítem elegido", () => {
    const onAgregar = vi.fn();
    render(<CatalogoBuscador catalogo={CATALOGO} seleccionadosIds={new Set()} onAgregar={onAgregar} />);

    fireEvent.click(screen.getByRole("button", { name: /agregar crema facial/i }));

    expect(onAgregar).toHaveBeenCalledWith(CATALOGO[2]);
  });

  it("el texto visible del botón es solo \"Agregar\", sin repetir el nombre; el nombre accesible sí lo incluye", () => {
    render(<CatalogoBuscador catalogo={CATALOGO} seleccionadosIds={new Set()} onAgregar={vi.fn()} />);
    const boton = screen.getByRole("button", { name: /agregar crema facial/i });
    expect(boton.textContent).toBe("Agregar");
    expect(boton.getAttribute("aria-label")).toBe("Agregar Crema facial");
  });

  it("ya agregado: el texto visible es 'Agregado' y el nombre accesible conserva el nombre del ítem", () => {
    render(<CatalogoBuscador catalogo={CATALOGO} seleccionadosIds={new Set(["3"])} onAgregar={vi.fn()} />);
    const boton = screen.getByRole("button", { name: /agregado: crema facial/i });
    expect(boton.textContent).toBe("Agregado");
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });
});
