import { describe, expect, it } from "vitest";
import {
  formatearEntradaMonto,
  parsearMontoACents,
  posicionCursor,
  significativosAntesDelCursor,
  textoDesdeCents,
} from "./money-input";

describe("parsearMontoACents — aritmética entera, nunca parseFloat × 100", () => {
  it.each([
    ["1500", 150000],
    ["1,500", 150000],
    ["1,500.5", 150050],
    ["1,500.50", 150050],
    ["Q1,500.50", 150050],
    ["0.05", 5],
    [".5", 50],
    ["1500.", 150000],
    ["0", 0],
    ["9,999,999.99", 999999999],
    // casos donde parseFloat * 100 falla: 19.99*100 = 1998.9999999999998, 0.29*100 = 28.999999999999996,
    // 4.35*100 = 434.99999999999994 (1500.57*100 sí da exacto, no discrimina).
    // Se verifica con: node -e "console.log(19.99*100, 0.29*100, 4.35*100)"
    ["1500.57", 150057],
    ["19.99", 1999],
    ["0.29", 29],
    ["4.35", 435],
  ])("%s → %i centavos", (texto, esperado) => {
    expect(parsearMontoACents(texto)).toBe(esperado);
  });

  it.each(["", "   ", ".", "abc", "-5", "1.234", "1.2.3", "1,50", "12,34,567", "Q", "1 500", "1e3"])(
    "%j no es un monto → null",
    (texto) => {
      expect(parsearMontoACents(texto)).toBeNull();
    },
  );

  it("el resultado siempre es un entero (formatearCents lanza ante un no entero)", () => {
    for (const texto of ["0.07", "1500.57", "19.99", "0.29", "4.35", "1234567.89"]) {
      expect(Number.isInteger(parsearMontoACents(texto))).toBe(true);
    }
  });
});

describe("formatearEntradaMonto — formato en vivo", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["1500", "1,500"],
    ["1500.", "1,500."],
    ["1500.5", "1,500.5"],
    ["1500.55", "1,500.55"],
    ["1500.555", "1,500.55"],
    ["0012", "12"],
    ["00", "0"],
    ["0", "0"],
    [".5", "0.5"],
    [".", "0."],
    ["abc12", "12"],
    ["Q1,500.50", "1,500.50"],
    ["1234567", "1,234,567"],
    ["12345678", "1,234,567"],
    ["1.2.3", "1.23"],
    ["-5", "5"],
  ])("%j → %j", (crudo, esperado) => {
    expect(formatearEntradaMonto(crudo)).toBe(esperado);
  });

  it("es idempotente: formatear un texto ya formateado no lo cambia", () => {
    for (const texto of ["1,500", "1,500.", "1,500.50", "0.5", "12", "1,234,567.89"]) {
      expect(formatearEntradaMonto(texto)).toBe(texto);
    }
  });
});

describe("textoDesdeCents", () => {
  it("muestra el valor inicial sin la Q y con dos decimales", () => {
    expect(textoDesdeCents(150050)).toBe("1,500.50");
    expect(textoDesdeCents(0)).toBe("0.00");
    expect(textoDesdeCents(5)).toBe("0.05");
    expect(textoDesdeCents(undefined)).toBe("");
  });
});

describe("posicionCursor — el cursor no salta al final cuando el formato agrega una coma", () => {
  it("al teclear el 4º dígito ('1,50' + '0' → '1,500') el cursor queda al final del último dígito", () => {
    // raw tras teclear: "1,500" con el cursor al final; el formato lo deja igual
    const raw = "1,5000"; // 5 significativos antes del cursor al final
    const sig = significativosAntesDelCursor(raw, raw.length);
    const formateado = formatearEntradaMonto(raw);
    expect(formateado).toBe("15,000");
    expect(posicionCursor(formateado, sig)).toBe(formateado.length);
  });

  it("insertar un dígito a mitad de número mantiene el cursor junto al dígito insertado", () => {
    // "1,500" → el usuario pone el cursor tras el "1," y teclea "2": raw "1,2500", cursor 3
    const raw = "1,2500";
    const sig = significativosAntesDelCursor(raw, 3); // "1,2" → 2 significativos
    const formateado = formatearEntradaMonto(raw);
    expect(formateado).toBe("12,500");
    expect(posicionCursor(formateado, sig)).toBe(2); // tras "12"
  });

  it("0 significativos → posición 0; de sobra → al final", () => {
    expect(posicionCursor("1,500", 0)).toBe(0);
    expect(posicionCursor("1,500", 99)).toBe(5);
  });
});
