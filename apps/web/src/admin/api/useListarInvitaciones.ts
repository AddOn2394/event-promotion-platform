import { useQuery } from "@tanstack/react-query";
import { ListarInvitacionesResponseSchema, type ListarInvitacionesResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-11: lista sobre la que se cuelga el botón "Reenviar código".
export function useListarInvitaciones() {
  return useQuery<ListarInvitacionesResponse>({
    queryKey: ["admin", "invitaciones"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/admin/invitaciones");
      return ListarInvitacionesResponseSchema.parse(data);
    },
  });
}
