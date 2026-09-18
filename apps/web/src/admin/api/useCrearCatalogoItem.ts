import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CatalogoItemAdminSchema,
  type CatalogoItemAdmin,
  type CrearCatalogoItemRequest,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useCrearCatalogoItem() {
  const queryClient = useQueryClient();
  return useMutation<CatalogoItemAdmin, Error, CrearCatalogoItemRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/catalogo", { method: "POST", body: JSON.stringify(body) });
      return CatalogoItemAdminSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogo"] });
    },
  });
}
