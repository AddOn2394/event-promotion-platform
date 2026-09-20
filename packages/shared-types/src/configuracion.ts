import { z } from "zod";

// HU-10 (Gate 5, ADR-010): N días de deadline de edición, configurable desde admin panel.
// La tabla configuracion_evento existe desde Gate 4 — este contrato es la primera vez que
// se expone por HTTP.

export const ConfiguracionEventoSchema = z.object({
  diasDeadlineEdicion: z
    .number({ required_error: "Ingrese un número de días", invalid_type_error: "Ingrese un número de días (0 o más)" })
    .int("Ingrese un número de días (0 o más)")
    .nonnegative("Ingrese un número de días (0 o más)"),
});

export const ActualizarConfiguracionEventoRequestSchema = ConfiguracionEventoSchema;

export type ConfiguracionEvento = z.infer<typeof ConfiguracionEventoSchema>;
export type ActualizarConfiguracionEventoRequest = z.infer<typeof ActualizarConfiguracionEventoRequestSchema>;
