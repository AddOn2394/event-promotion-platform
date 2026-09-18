import { useQuery } from "@tanstack/react-query";
import { SlotsAdminResponseSchema, type SlotsAdminResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useSlotsAdmin() {
  return useQuery<SlotsAdminResponse>({
    queryKey: ["admin", "slots"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/admin/slots");
      return SlotsAdminResponseSchema.parse(data);
    },
  });
}
