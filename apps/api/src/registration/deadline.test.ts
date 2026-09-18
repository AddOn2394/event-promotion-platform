import { describe, expect, it } from "vitest";
import { dentroDeVentanaEdicion } from "./deadline.js";

// ADR-010 / Gate 4 exit criterio: el corte es exacto, probado al segundo.
describe("dentroDeVentanaEdicion (ADR-010)", () => {
  const slotInicio = new Date("2026-11-10T14:00:00Z");
  const diasDeadline = 3;
  const corte = new Date("2026-11-07T14:00:00Z"); // slotInicio - 3 días

  it("permite editar 1 segundo antes del corte", () => {
    const ahora = new Date(corte.getTime() - 1000);
    expect(dentroDeVentanaEdicion(slotInicio, diasDeadline, ahora)).toBe(true);
  });

  it("rechaza editar exactamente en el corte", () => {
    expect(dentroDeVentanaEdicion(slotInicio, diasDeadline, corte)).toBe(false);
  });

  it("rechaza editar 1 segundo después del corte", () => {
    const ahora = new Date(corte.getTime() + 1000);
    expect(dentroDeVentanaEdicion(slotInicio, diasDeadline, ahora)).toBe(false);
  });

  it("con N=0 el corte es la fecha/hora exacta del slot", () => {
    const unSegundoAntes = new Date(slotInicio.getTime() - 1000);
    const unSegundoDespues = new Date(slotInicio.getTime() + 1000);
    expect(dentroDeVentanaEdicion(slotInicio, 0, unSegundoAntes)).toBe(true);
    expect(dentroDeVentanaEdicion(slotInicio, 0, unSegundoDespues)).toBe(false);
  });
});
