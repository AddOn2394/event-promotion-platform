import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  EditarConfirmacionResponseSchema,
  type EditarConfirmacionRequest,
  type EditarConfirmacionResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useEditarConfirmacion() {
  const queryClient = useQueryClient();
  return useMutation<EditarConfirmacionResponse, Error, EditarConfirmacionRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/confirmaciones/mia", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return EditarConfirmacionResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmacion-propia"] });
    },
  });
}
