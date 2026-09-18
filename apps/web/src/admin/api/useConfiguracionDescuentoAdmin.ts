import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConfiguracionDescuentoSchema,
  type ActualizarConfiguracionDescuentoRequest,
  type ConfiguracionDescuento,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-12 (ADR-023): pantalla de umbrales de descuento — mismo objeto que el preview del
// cliente (GET /configuracion-descuento), leído acá bajo sesión de admin.
export function useConfiguracionDescuentoAdmin() {
  return useQuery<ConfiguracionDescuento>({
    queryKey: ["admin", "configuracion-descuento"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/admin/configuracion/descuento");
      return ConfiguracionDescuentoSchema.parse(data);
    },
  });
}

export function useActualizarConfiguracionDescuento() {
  const queryClient = useQueryClient();
  return useMutation<ConfiguracionDescuento, Error, ActualizarConfiguracionDescuentoRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/configuracion/descuento", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return ConfiguracionDescuentoSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "configuracion-descuento"] });
    },
  });
}
