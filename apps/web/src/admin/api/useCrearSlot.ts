import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SlotAdminSchema, type CrearSlotRequest, type SlotAdmin } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useCrearSlot() {
  const queryClient = useQueryClient();
  return useMutation<SlotAdmin, Error, CrearSlotRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/slots", { method: "POST", body: JSON.stringify(body) });
      return SlotAdminSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    },
  });
}
