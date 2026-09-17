import { useQuery } from "@tanstack/react-query";
import { ConfiguracionDescuentoSchema, type ConfiguracionDescuento } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// ADR-025 — umbrales vigentes del motor de descuento, para el preview en vivo
// (calcularDescuento). Nunca hardcodear estos valores del lado del cliente.
export function useConfiguracionDescuento() {
  return useQuery<ConfiguracionDescuento>({
    queryKey: ["configuracion-descuento"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/configuracion-descuento");
      return ConfiguracionDescuentoSchema.parse(data);
    },
  });
}
