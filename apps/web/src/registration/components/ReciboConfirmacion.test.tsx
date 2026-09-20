import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReciboConfirmacion } from "./ReciboConfirmacion";

afterEach(cleanup);

const TOTALES = {
  subtotalServiciosCents: 150000,
  descuentoServiciosPct: 3,
  subtotalProductosCents: 0,
  descuentoProductosPct: 0,
  totalCents: 145500,
};
const ITEM = { id: "11111111-1111-1111-1111-111111111111", nombre: "Masaje relajante", categoria: "servicio" as const, precioCents: 150000 };

describe("ReciboConfirmacion", () => {
  it("con plazo vigente muestra hasta cuándo puede editar", () => {
    render(<ReciboConfirmacion items={[ITEM]} slot={undefined} totales={TOTALES} editableHastaEn="2099-01-01T10:00:00.000Z" />);
    expect(screen.getByText(/puede modificar o cancelar su selección hasta el/i)).toBeTruthy();
    expect(screen.getByText("Q1,455.00", { selector: "span.font-mono" })).toBeTruthy();
  });

  it("con el plazo ya vencido (cambio a un slot cercano) no promete edición: remite a ventas", () => {
    render(<ReciboConfirmacion items={[ITEM]} slot={undefined} totales={TOTALES} editableHastaEn="2020-01-01T10:00:00.000Z" />);
    expect(screen.queryByText(/puede modificar o cancelar su selección hasta el/i)).toBeNull();
    expect(screen.getByText(/ya venció/i)).toBeTruthy();
  });
});
