import { useQuery } from "@tanstack/react-query";
import {
  ListarConfirmacionesAdminResponseSchema,
  type EstadoInvitacionAdmin,
  type ListarConfirmacionesAdminResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-8: listado filtrable por los 4 estados (ADR-024) — el filtro viaja como query param.
export function useConfirmacionesAdmin(estado?: EstadoInvitacionAdmin) {
  return useQuery<ListarConfirmacionesAdminResponse>({
    queryKey: ["admin", "confirmaciones", estado ?? "todas"],
    queryFn: async () => {
      const query = estado ? `?estado=${estado}` : "";
      const data = await apiFetch<unknown>(`/admin/confirmaciones${query}`);
      return ListarConfirmacionesAdminResponseSchema.parse(data);
    },
  });
}
