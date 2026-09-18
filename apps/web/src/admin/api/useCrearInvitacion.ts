import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CrearInvitacionResponseSchema,
  type CrearInvitacionRequest,
  type CrearInvitacionResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useCrearInvitacion() {
  const queryClient = useQueryClient();
  return useMutation<CrearInvitacionResponse, Error, CrearInvitacionRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/invitaciones", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return CrearInvitacionResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "invitaciones"] });
    },
  });
}
