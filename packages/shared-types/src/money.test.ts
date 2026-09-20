import { describe, expect, it } from "vitest";
import { formatearCents } from "./money.js";

describe("formatearCents (ADR-031)", () => {
  it.each([
    [150000, "Q1,500.00"],
    [150001, "Q1,500.01"],
    [149999, "Q1,499.99"],
    [100000000, "Q1,000,000.00"],
    [0, "Q0.00"],
    [5, "Q0.05"],
    [99, "Q0.99"],
    [100, "Q1.00"],
    [999, "Q9.99"],
    [99999, "Q999.99"],
    [100000, "Q1,000.00"],
    [1234567, "Q12,345.67"],
  ])("%i centavos → %s", (cents, esperado) => {
    expect(formatearCents(cents)).toBe(esperado);
  });

  it("no agrega separador por debajo de mil (Q485.00 sigue igual)", () => {
    expect(formatearCents(48500)).toBe("Q485.00");
  });

  it("rechaza un monto no entero en vez de formatearlo mal", () => {
    expect(() => formatearCents(1500.5)).toThrow(RangeError);
    expect(() => formatearCents(Number.NaN)).toThrow(RangeError);
  });
});
