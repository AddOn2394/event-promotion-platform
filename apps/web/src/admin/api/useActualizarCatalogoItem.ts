import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CatalogoItemAdminSchema,
  type ActualizarCatalogoItemRequest,
  type CatalogoItemAdmin,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useActualizarCatalogoItem() {
  const queryClient = useQueryClient();
  return useMutation<CatalogoItemAdmin, Error, { id: string; body: ActualizarCatalogoItemRequest }>({
    mutationFn: async ({ id, body }) => {
      const data = await apiFetch<unknown>(`/admin/catalogo/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return CatalogoItemAdminSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogo"] });
    },
  });
}
