import { z } from "zod";

// Contrato del motor de descuento (ADR-004, ADR-005, ADR-023) — umbrales configurables
// desde configuracion_descuento; los porcentajes 3/5 son fijos en código, no en este schema.
// El resultado del cálculo (ResultadoCategoria/ResultadoDescuento, discount-engine.ts) no
// tiene schema Zod propio a propósito: es el retorno de una función pura interna, no un
// límite de red que necesite validarse — Zod es para datos no confiables entrando/saliendo
// de la API, no para el resultado de un cálculo que el propio código ya controla.

export const ConfiguracionDescuentoSchema = z.object({
  minServicios3pct: z.number().int().positive(),
  minServicios5pct: z.number().int().positive(),
  montoMinimo5pctServiciosCents: z.number().int().positive(),
  minProductos3pct: z.number().int().positive(),
  minProductos5pct: z.number().int().positive(),
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
