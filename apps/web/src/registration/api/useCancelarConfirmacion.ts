import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CancelarConfirmacionResponseSchema, type CancelarConfirmacionResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useCancelarConfirmacion() {
  const queryClient = useQueryClient();
  return useMutation<CancelarConfirmacionResponse, Error, void>({
    mutationFn: async () => {
      const data = await apiFetch<unknown>("/confirmaciones/mia/cancelar", { method: "POST" });
      return CancelarConfirmacionResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmacion-propia"] });
    },
  });
}
