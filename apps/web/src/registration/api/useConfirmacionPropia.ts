import { useQuery } from "@tanstack/react-query";
import { ConfirmacionPropiaResponseSchema, type ConfirmacionPropiaResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-4/HU-5: precarga la pantalla de edición con la selección/slot/estado vigentes.
export function useConfirmacionPropia() {
  return useQuery<ConfirmacionPropiaResponse>({
    queryKey: ["confirmacion-propia"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/confirmaciones/mia");
      return ConfirmacionPropiaResponseSchema.parse(data);
    },
    retry: false,
  });
}
