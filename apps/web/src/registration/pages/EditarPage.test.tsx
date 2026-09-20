import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { EditarPage } from "./EditarPage";
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
const CONFIRMACION = {
  estado: "confirmada",
  slotId: SLOT.id,
  nombreCliente: "Cliente Prueba",
  items: [{ catalogoItemId: ITEM.id, categoria: "servicio", nombre: ITEM.nombre, precioCents: ITEM.precioCents }],
  subtotalServiciosCents: 10000,
  descuentoServiciosPct: 0,
  subtotalProductosCents: 0,
  descuentoProductosPct: 0,
  totalCents: 10000,
  editableHastaEn: "2099-01-01T10:00:00.000Z",
};

function montarFetch(confirmacion: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/catalogo")) return jsonResponse([ITEM]);
    if (url.includes("/slots")) return jsonResponse([SLOT]);
    if (url.includes("/configuracion-descuento")) return jsonResponse(CONFIG);
    if (url.includes("/confirmaciones/mia")) return jsonResponse(confirmacion);
    throw new Error(`fetch no mockeado: ${url}`);
  });
}

describe("EditarPage — fecha límite de edición y explicación del descuento (Gate 8)", () => {
  it("con el plazo ya vencido no promete edición hasta una fecha pasada: remite a ventas", async () => {
    sessionStorage.setItem("cliente-session", JSON.stringify({ email: "cliente@example.com", nombreCliente: null }));
    const fetchSpy = montarFetch({ ...CONFIRMACION, editableHastaEn: "2020-01-01T10:00:00.000Z" });

    renderWithProviders(<EditarPage />, { initialEntries: ["/editar"] });

    await screen.findByRole("heading", { name: /editar mi confirmación/i });
    expect(screen.getByText(/el plazo para modificar o cancelar su confirmación por su cuenta ya venció/i)).toBeTruthy();
    expect(screen.queryByText(/puede hacerlo hasta el/i)).toBeNull();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });

  it("muestra la fecha límite de edición que calcula el servidor y los umbrales reales del descuento", async () => {
    sessionStorage.setItem("cliente-session", JSON.stringify({ email: "cliente@example.com", nombreCliente: null }));

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/catalogo")) return jsonResponse([ITEM]);
      if (url.includes("/slots")) return jsonResponse([SLOT]);
      if (url.includes("/configuracion-descuento")) return jsonResponse(CONFIG);
      if (url.includes("/confirmaciones/mia")) return jsonResponse(CONFIRMACION);
      throw new Error(`fetch no mockeado: ${url}`);
    });

    renderWithProviders(<EditarPage />, { initialEntries: ["/editar"] });

    await screen.findByRole("heading", { name: /editar mi confirmación/i });

    // toLocaleString usa un espacio duro antes de "a. m."; Testing Library normaliza el texto
    // del nodo pero no el string esperado, así que se normaliza acá.
    const limite = new Date(CONFIRMACION.editableHastaEn)
      .toLocaleString("es-GT", { dateStyle: "full", timeStyle: "short", timeZone: "America/Guatemala" })
      .replace(/\s+/g, " ");
    expect(screen.getByText(limite)).toBeTruthy();
    expect(screen.getByText(/cómo se calcula su descuento/i)).toBeTruthy();
    expect(screen.getByText(/Q1,500\.00/)).toBeTruthy();

    fetchSpy.mockRestore();
    sessionStorage.clear();
  });
});
