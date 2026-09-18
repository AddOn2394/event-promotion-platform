import { describe, expect, it } from "vitest";
import { ActualizarConfiguracionDescuentoRequestSchema } from "./descuento.js";

const BASE = {
  minServicios3pct: 2,
  minServicios5pct: 2,
  montoMinimo5pctServiciosCents: 150_000,
  minProductos3pct: 3,
  minProductos5pct: 5,
};

// HU-12: el umbral de 5% nunca puede ser más débil que el de 3% (ADR-023) — validado acá
// para que apps/web tenga el mismo preview que la autoridad real de apps/api.
describe("ActualizarConfiguracionDescuentoRequestSchema — coherencia HU-12", () => {
  it("acepta una configuración coherente", () => {
    expect(ActualizarConfiguracionDescuentoRequestSchema.safeParse(BASE).success).toBe(true);
  });

  it("rechaza minServicios5pct menor que minServicios3pct", () => {
    const result = ActualizarConfiguracionDescuentoRequestSchema.safeParse({
      ...BASE,
      minServicios3pct: 3,
      minServicios5pct: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza minProductos5pct menor que minProductos3pct", () => {
    const result = ActualizarConfiguracionDescuentoRequestSchema.safeParse({
      ...BASE,
      minProductos3pct: 5,
      minProductos5pct: 3,
    });
    expect(result.success).toBe(false);
  });

  it("acepta iguales (5% igual de exigente que 3% no es 'más débil')", () => {
    const result = ActualizarConfiguracionDescuentoRequestSchema.safeParse({
      ...BASE,
      minServicios3pct: 2,
      minServicios5pct: 2,
    });
    expect(result.success).toBe(true);
  });
});
