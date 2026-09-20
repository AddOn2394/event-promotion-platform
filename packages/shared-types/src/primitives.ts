import { z } from "zod";

// Bloques de validación reutilizados por varios schemas del contrato — evita que
// una regla como "qué hace válido un email" quede repetida (y potencialmente
// desincronizada) en cada archivo que la necesita.

// El mensaje por defecto de Zod sale en inglés y llega tal cual a la pantalla de login.
export const EmailSchema = z.string().email("Ingrese un correo electrónico válido");
export const UuidSchema = z.string().uuid();

// Dinero siempre en centavos enteros, nunca float (ver CLAUDE.md, ADR-005 punto 2).
export const CentsSchema = z.number().int().nonnegative();

// Porcentaje entero válido (0-100). Los valores exactos hoy son 0/3/5 (ADR-023), pero esa
// lista queda en código (discount-engine.ts), no aquí — 0-100 es solo el rango matemático.
export const PctSchema = z.number().int().min(0).max(100);

// Timestamps ISO 8601 que cruzan el contrato (creadaEn, fechaHoraInicio/Fin, etc.).
export const DatetimeSchema = z.string().datetime();
