import { useQuery } from "@tanstack/react-query";
import { SlotsResponseSchema, type SlotsResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useSlots() {
  return useQuery<SlotsResponse>({
    queryKey: ["slots"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/slots");
      return SlotsResponseSchema.parse(data);
    },
  });
}
