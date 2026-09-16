import { describe, expect, it } from "vitest";
import { calcularDescuento, type ItemParaDescuento } from "./discount-engine.js";
import type { ConfiguracionDescuento } from "./descuento.js";

// Umbrales del PDF (spec/PLAN_DESARROLLO.md Gate 2, ADR-023):
// 2 servicios → 3%; 2 servicios + Q1,500 → 5%; 3 productos → 3%; 5 productos → 5%.
const CONFIG: ConfiguracionDescuento = {
  minServicios3pct: 2,
  minServicios5pct: 2,
  montoMinimo5pctServiciosCents: 150_000,
  minProductos3pct: 3,
  minProductos5pct: 5,
};

function servicio(precioCents: number): ItemParaDescuento {
  return { categoria: "servicio", precioCents };
}

function producto(precioCents: number): ItemParaDescuento {
  return { categoria: "producto", precioCents };
}

describe("calcularDescuento — servicios (ADR-005 tabla de fronteras)", () => {
  it("0 servicios → 0%", () => {
    const resultado = calcularDescuento([], CONFIG);
    expect(resultado.servicios.descuentoPct).toBe(0);
    expect(resultado.servicios.subtotalCents).toBe(0);
  });

  it("1 servicio → 0% (no alcanza el mínimo de 2)", () => {
    const resultado = calcularDescuento([servicio(50_000)], CONFIG);
    expect(resultado.servicios.descuentoPct).toBe(0);
  });

  it("2 servicios con suma por debajo de Q1,500 → 3% (cumple conteo, no el monto)", () => {
    const resultado = calcularDescuento([servicio(40_000), servicio(40_000)], CONFIG);
    expect(resultado.servicios.subtotalCents).toBe(80_000);
    expect(resultado.servicios.descuentoPct).toBe(3);
  });

  it("2 servicios con suma EXACTA de Q1,500.00 → 3%, NO 5% (frontera estricta, ADR-005)", () => {
    const resultado = calcularDescuento([servicio(75_000), servicio(75_000)], CONFIG);
    expect(resultado.servicios.subtotalCents).toBe(150_000);
    expect(resultado.servicios.descuentoPct).toBe(3);
  });

  it("2 servicios con suma de Q1,500.01 → 5% (un centavo sobre la frontera)", () => {
    const resultado = calcularDescuento([servicio(75_000), servicio(75_001)], CONFIG);
    expect(resultado.servicios.subtotalCents).toBe(150_001);
    expect(resultado.servicios.descuentoPct).toBe(5);
  });

  it("3 servicios con suma > Q1,500 → 5% (tier más alto gana, ADR-005)", () => {
    const resultado = calcularDescuento(
      [servicio(60_000), servicio(60_000), servicio(60_000)],
      CONFIG,
    );
    expect(resultado.servicios.descuentoPct).toBe(5);
  });
});

describe("calcularDescuento — productos (ADR-005 tabla de fronteras, análogo a servicios)", () => {
  it("2 productos → 0% (no alcanza el mínimo de 3)", () => {
    const resultado = calcularDescuento([producto(10_000), producto(10_000)], CONFIG);
    expect(resultado.productos.descuentoPct).toBe(0);
  });

  it("3 productos → 3%", () => {
    const resultado = calcularDescuento(
      [producto(10_000), producto(10_000), producto(10_000)],
      CONFIG,
    );
    expect(resultado.productos.descuentoPct).toBe(3);
  });

  it("4 productos → 3% (aún no alcanza el mínimo de 5 para el tier de 5%)", () => {
    const resultado = calcularDescuento(
      [producto(10_000), producto(10_000), producto(10_000), producto(10_000)],
      CONFIG,
    );
    expect(resultado.productos.descuentoPct).toBe(3);
  });

  it("5 productos → 5%", () => {
    const resultado = calcularDescuento(
      [
        producto(10_000),
        producto(10_000),
        producto(10_000),
        producto(10_000),
        producto(10_000),
      ],
      CONFIG,
    );
    expect(resultado.productos.descuentoPct).toBe(5);
  });
});

describe("calcularDescuento — categorías independientes (ADR-004)", () => {
  it("el % de servicios no afecta el % de productos ni viceversa", () => {
    const resultado = calcularDescuento(
      [servicio(75_000), servicio(75_001), producto(10_000), producto(10_000)],
      CONFIG,
    );
    expect(resultado.servicios.descuentoPct).toBe(5);
    expect(resultado.productos.descuentoPct).toBe(0);
  });
});

describe("calcularDescuento — dinero en centavos enteros, round half up", () => {
  it("3% de Q333.33 (33,333 centavos) redondea a Q10.00 (1,000 centavos) de descuento", () => {
    const resultado = calcularDescuento(
      [servicio(33_333), servicio(0)],
      CONFIG,
    );
    expect(resultado.servicios.subtotalCents).toBe(33_333);
    expect(resultado.servicios.descuentoPct).toBe(3);
    expect(resultado.servicios.descuentoCents).toBe(1_000);
    expect(resultado.servicios.totalCents).toBe(32_333);
  });

  it("totalCents combina servicios y productos tras aplicar cada descuento por separado", () => {
    const resultado = calcularDescuento(
      [servicio(75_000), servicio(75_001), producto(10_000), producto(10_000), producto(10_000)],
      CONFIG,
    );
    // servicios: 150001 cents, 5% → descuento 7500, total 142501
    // productos: 30000 cents, 3% → descuento 900, total 29100
    expect(resultado.servicios.totalCents).toBe(142_501);
    expect(resultado.productos.totalCents).toBe(29_100);
    expect(resultado.totalCents).toBe(171_601);
  });
});
