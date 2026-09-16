import type { CategoriaCatalogo } from "./catalogo.js";
import type { ConfiguracionDescuento } from "./descuento.js";

// Motor de descuento (ADR-004, ADR-005, ADR-023, ADR-025). Lista de reglas evaluada de
// mayor a menor %: agregar un escenario nuevo es agregar un objeto a la lista
// correspondiente, nunca editar una regla existente ni el evaluador (open/closed).
//
// Vive en shared-types (no en apps/api) por decisión explícita ratificada en ADR-025:
// apps/web lo importa para el preview en vivo (ADR-004) y apps/api lo importa como
// autoridad real al confirmar (HU-3) — la misma función pura evita que el preview del
// cliente diverja del cálculo del servidor. apps/api sigue siendo la única fuente de
// verdad porque solo él lee configuracion_descuento y persiste el resultado (ADR-006).

export type CategoriaInput = {
  itemCount: number;
  subtotalCents: number;
};

type DiscountRule = {
  pct: number;
  matches: (input: CategoriaInput, config: ConfiguracionDescuento) => boolean;
};

const REGLAS_SERVICIOS: DiscountRule[] = [
  {
    pct: 5,
    matches: (input, config) =>
      input.itemCount >= config.minServicios5pct &&
      input.subtotalCents > config.montoMinimo5pctServiciosCents,
  },
  {
    pct: 3,
    matches: (input, config) => input.itemCount >= config.minServicios3pct,
  },
];

const REGLAS_PRODUCTOS: DiscountRule[] = [
  {
    pct: 5,
    matches: (input, config) => input.itemCount >= config.minProductos5pct,
  },
  {
    pct: 3,
    matches: (input, config) => input.itemCount >= config.minProductos3pct,
  },
];

function evaluarReglas(
  reglas: DiscountRule[],
  input: CategoriaInput,
  config: ConfiguracionDescuento,
): number {
  const regla = reglas.find((r) => r.matches(input, config));
  return regla?.pct ?? 0;
}

// Round half up sobre centavos enteros — ver spec/SPEC_FUNCIONAL.md §4 "Notas de representación".
// subtotalCents y pct son siempre enteros, así que subtotalCents * pct es exacto en punto flotante
// (< 2^53); sumar 50 antes de dividir entre 100 y truncar produce "half up" sin perder precisión.
function calcularDescuentoCents(subtotalCents: number, pct: number): number {
  return Math.floor((subtotalCents * pct + 50) / 100);
}

export type ResultadoCategoria = {
  subtotalCents: number;
  descuentoPct: number;
  descuentoCents: number;
  totalCents: number;
};

function calcularCategoria(
  input: CategoriaInput,
  reglas: DiscountRule[],
  config: ConfiguracionDescuento,
): ResultadoCategoria {
  const descuentoPct = input.itemCount === 0 ? 0 : evaluarReglas(reglas, input, config);
  const descuentoCents = calcularDescuentoCents(input.subtotalCents, descuentoPct);
  return {
    subtotalCents: input.subtotalCents,
    descuentoPct,
    descuentoCents,
    totalCents: input.subtotalCents - descuentoCents,
  };
}

export type ItemParaDescuento = {
  categoria: CategoriaCatalogo;
  precioCents: number;
};

export type ResultadoDescuento = {
  servicios: ResultadoCategoria;
  productos: ResultadoCategoria;
  totalCents: number;
};

export function calcularDescuento(
  items: ItemParaDescuento[],
  config: ConfiguracionDescuento,
): ResultadoDescuento {
  const servicios = items.filter((item) => item.categoria === "servicio");
  const productos = items.filter((item) => item.categoria === "producto");

  const serviciosInput: CategoriaInput = {
    itemCount: servicios.length,
    subtotalCents: servicios.reduce((sum, item) => sum + item.precioCents, 0),
  };
  const productosInput: CategoriaInput = {
    itemCount: productos.length,
    subtotalCents: productos.reduce((sum, item) => sum + item.precioCents, 0),
  };

  const resultadoServicios = calcularCategoria(serviciosInput, REGLAS_SERVICIOS, config);
  const resultadoProductos = calcularCategoria(productosInput, REGLAS_PRODUCTOS, config);

  return {
    servicios: resultadoServicios,
    productos: resultadoProductos,
    totalCents: resultadoServicios.totalCents + resultadoProductos.totalCents,
  };
}
