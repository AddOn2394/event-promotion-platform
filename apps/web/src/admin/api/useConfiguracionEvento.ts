import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ConfiguracionEventoSchema,
  type ActualizarConfiguracionEventoRequest,
  type ConfiguracionEvento,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-10 (ADR-010): N días de deadline de edición.
export function useConfiguracionEvento() {
  return useQuery<ConfiguracionEvento>({
    queryKey: ["admin", "configuracion-evento"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/admin/configuracion");
      return ConfiguracionEventoSchema.parse(data);
    },
  });
}

export function useActualizarConfiguracionEvento() {
  const queryClient = useQueryClient();
  return useMutation<ConfiguracionEvento, Error, ActualizarConfiguracionEventoRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/configuracion", { method: "PATCH", body: JSON.stringify(body) });
      return ConfiguracionEventoSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "configuracion-evento"] });
    },
  });
}
