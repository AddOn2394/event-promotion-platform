import { z } from "zod";
import { formatearCents } from "./money.js";

// Bloques de validación reutilizados por varios schemas del contrato — evita que
// una regla como "qué hace válido un email" quede repetida (y potencialmente
// desincronizada) en cada archivo que la necesita.

// El mensaje por defecto de Zod sale en inglés y llega tal cual a la pantalla de login.
export const EmailSchema = z
  .string({ required_error: "Ingrese un correo electrónico" })
  .email("Ingrese un correo electrónico válido");
export const UuidSchema = z.string().uuid();

// Dinero siempre en centavos enteros, nunca float (ver CLAUDE.md, ADR-005 punto 2).
// Tope de un monto que entra por un formulario: cabe en el INTEGER de Postgres (precio_cents,
// máx. 2,147,483,647) con margen. Sin este límite en el schema, una llamada directa a la API con
// 3_000_000_000 pasaría la validación y reventaría en la DB con un 500 en vez de un 400.
export const MONTO_MAXIMO_CENTS = 999_999_999;

export const CentsSchema = z
  .number({ required_error: "Ingrese un monto", invalid_type_error: "Ingrese un monto válido" })
  .int("Ingrese un monto válido")
  .nonnegative("El monto no puede ser negativo");

// Porcentaje entero válido (0-100). Los valores exactos hoy son 0/3/5 (ADR-023), pero esa
// lista queda en código (discount-engine.ts), no aquí — 0-100 es solo el rango matemático.
export const PctSchema = z.number().int().min(0).max(100);

// Timestamps ISO 8601 que cruzan el contrato (creadaEn, fechaHoraInicio/Fin, etc.).
export const DatetimeSchema = z
  .string({ required_error: "Seleccione una fecha y hora" })
  .datetime({ message: "Seleccione una fecha y hora" });

// Monto que una persona escribe en un formulario (precio de catálogo, monto mínimo): es un
// CentsSchema con tope. Las RESPUESTAS siguen usando CentsSchema a secas — un total (suma de
// varios ítems) no debe rechazarse por superar el tope de un ítem individual.
export const MontoIngresadoSchema = CentsSchema.max(
  MONTO_MAXIMO_CENTS,
  `El monto no puede superar ${formatearCents(MONTO_MAXIMO_CENTS)}`,
);
