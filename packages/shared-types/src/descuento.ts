import { z } from "zod";
import { formatearCents } from "./money.js";
import { MONTO_MAXIMO_CENTS } from "./primitives.js";

// Contrato del motor de descuento (ADR-004, ADR-005, ADR-023) — umbrales configurables
// desde configuracion_descuento; los porcentajes 3/5 son fijos en código, no en este schema.
// El resultado del cálculo (ResultadoCategoria/ResultadoDescuento, discount-engine.ts) no
// tiene schema Zod propio a propósito: es el retorno de una función pura interna, no un
// límite de red que necesite validarse — Zod es para datos no confiables entrando/saliendo
// de la API, no para el resultado de un cálculo que el propio código ya controla.

const UmbralSchema = z
  .number({ required_error: "Ingrese una cantidad", invalid_type_error: "Ingrese un número entero mayor que 0" })
  .int("Ingrese un número entero mayor que 0")
  .positive("Ingrese un número entero mayor que 0");

const MontoMinimoSchema = z
  .number({ required_error: "Ingrese un monto", invalid_type_error: "Ingrese un monto válido" })
  .int("Ingrese un monto válido")
  .positive("El monto mínimo debe ser mayor que 0")
  .max(MONTO_MAXIMO_CENTS, `El monto no puede superar ${formatearCents(MONTO_MAXIMO_CENTS)}`);

export const ConfiguracionDescuentoSchema = z.object({
  minServicios3pct: UmbralSchema,
  minServicios5pct: UmbralSchema,
  montoMinimo5pctServiciosCents: MontoMinimoSchema,
  minProductos3pct: UmbralSchema,
  minProductos5pct: UmbralSchema,
});

export type ConfiguracionDescuento = z.infer<typeof ConfiguracionDescuentoSchema>;

// HU-12: pantalla de admin para editar los umbrales. La coherencia "5% nunca más débil que
// 3%" (ADR-023) se valida acá, en el objeto compartido, para que apps/web tenga el mismo
// preview de validación que usará apps/api como autoridad — nunca una reimplementación a
// mano del lado del cliente (ADR-003/ADR-016). Los mínimos ≥ 1 ya los exige `.positive()`.
export const ActualizarConfiguracionDescuentoRequestSchema = ConfiguracionDescuentoSchema.superRefine(
  (config, ctx) => {
    if (config.minServicios5pct < config.minServicios3pct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El mínimo de servicios para 5% no puede ser menor que el de 3%",
        path: ["minServicios5pct"],
      });
    }
    if (config.minProductos5pct < config.minProductos3pct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El mínimo de productos para 5% no puede ser menor que el de 3%",
        path: ["minProductos5pct"],
      });
    }
  },
);

export type ActualizarConfiguracionDescuentoRequest = z.infer<typeof ActualizarConfiguracionDescuentoRequestSchema>;
