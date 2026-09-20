import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as contrato from "./index.js";

// Cierra la clase de bug "mensaje de validación en inglés" (String must contain…, Invalid uuid,
// Expected number, received nan): cada schema de entrada del contrato se alimenta con valores
// vacíos, basura, NaN, negativos y decimales, y NINGÚN mensaje resultante puede estar en inglés
// ni vacío. Un schema nuevo sin mensaje propio lo cubre el mapa de errores-es.ts; un mensaje
// nuevo escrito en inglés hace fallar este test.
const INGLES = /required|invalid|expected|received|must contain|must be|string must|number must|greater than|less than|too (small|big)/i;

const CAMPOS = [
  "nombre", "categoria", "precioCents", "email", "password", "codigo", "nombreCliente", "slotId",
  "items", "fechaHoraInicio", "fechaHoraFin", "cupoMaximo", "activo", "diasDeadlineEdicion",
  "minServicios3pct", "minServicios5pct", "montoMinimo5pctServiciosCents", "minProductos3pct",
  "minProductos5pct", "estado",
];

function conValor(valor: unknown): Record<string, unknown> {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, valor]));
}

const ENTRADAS: unknown[] = [
  undefined,
  null,
  {},
  conValor(""),
  conValor(Number.NaN),
  conValor(-1),
  conValor(1.5),
  conValor("abc"),
  conValor(null),
  conValor([]),
  { ...conValor(""), items: [], slotId: "" },
];

const schemasDeEntrada = Object.entries(contrato).filter(
  (entrada): entrada is [string, z.ZodTypeAny] =>
    /(Request|Query)Schema$/.test(entrada[0]) && entrada[1] instanceof z.ZodType,
);

describe("mensajes de validación del contrato — todos en español y descriptivos", () => {
  it("hay schemas de entrada que recorrer (el filtro por nombre no quedó vacío)", () => {
    expect(schemasDeEntrada.length).toBeGreaterThanOrEqual(10);
  });

  for (const [nombre, schema] of schemasDeEntrada) {
    it(`${nombre}: ningún mensaje en inglés ni vacío`, () => {
      const mensajes = ENTRADAS.flatMap((entrada) => {
        const resultado = schema.safeParse(entrada);
        return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
      });
      for (const mensaje of mensajes) {
        expect(mensaje.trim().length, `mensaje vacío en ${nombre}`).toBeGreaterThan(0);
        expect(mensaje, `mensaje en inglés en ${nombre}`).not.toMatch(INGLES);
      }
    });
  }

  it("los casos que el líder reportó dicen exactamente lo que deben", () => {
    const nombreVacio = contrato.CrearCatalogoItemRequestSchema.safeParse({ nombre: "", categoria: "servicio", precioCents: 100 });
    expect(nombreVacio.success ? [] : nombreVacio.error.issues.map((i) => i.message)).toEqual(["El nombre no puede quedar vacío"]);

    const sinHorario = contrato.ConfirmarAsistenciaRequestSchema.safeParse({
      items: [{ catalogoItemId: "11111111-1111-1111-1111-111111111111", categoria: "servicio" }],
      slotId: "",
    });
    expect(sinHorario.success ? [] : sinHorario.error.issues.map((i) => i.message)).toEqual(["Seleccione un horario"]);

    const precioVacio = contrato.CrearCatalogoItemRequestSchema.safeParse({ nombre: "Ítem", categoria: "servicio" });
    expect(precioVacio.success ? [] : precioVacio.error.issues.map((i) => i.message)).toEqual(["Ingrese un monto"]);
  });

  it("un monto por encima del máximo se rechaza en español y en el schema (no revienta la DB con un 500)", () => {
    const precio = contrato.CrearCatalogoItemRequestSchema.safeParse({ nombre: "Ítem", categoria: "servicio", precioCents: 3_000_000_000 });
    expect(precio.success ? [] : precio.error.issues.map((i) => i.message)).toEqual(["El monto no puede superar Q9,999,999.99"]);

    const umbral = contrato.ActualizarConfiguracionDescuentoRequestSchema.safeParse({
      minServicios3pct: 2, minServicios5pct: 2,
      montoMinimo5pctServiciosCents: 3_000_000_000, minProductos3pct: 3, minProductos5pct: 5,
    });
    expect(umbral.success ? [] : umbral.error.issues.map((i) => i.message)).toEqual(["El monto no puede superar Q9,999,999.99"]);

    expect(contrato.CrearCatalogoItemRequestSchema.safeParse({ nombre: "Ítem", categoria: "servicio", precioCents: contrato.MONTO_MAXIMO_CENTS }).success).toBe(true);
  });

  it("las RESPUESTAS no heredan el tope: un total mayor que el de un ítem no se rechaza", () => {
    expect(contrato.CentsSchema.safeParse(contrato.MONTO_MAXIMO_CENTS + 1).success).toBe(true);
  });
});
