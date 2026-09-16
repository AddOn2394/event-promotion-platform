import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ConfirmarAsistenciaRequestSchema,
  type ConfirmarAsistenciaRequest,
} from "@event-promotion/shared-types";

// Placeholder de Gate 0: solo prueba que apps/web valida formularios contra el contrato
// compartido con react-hook-form + zodResolver. El formulario real es Gate 2.
const PLACEHOLDER_ITEM = { catalogoItemId: crypto.randomUUID(), categoria: "servicio" } as const;

export function App() {
  const { register, handleSubmit, formState, setValue } = useForm<ConfirmarAsistenciaRequest>({
    resolver: zodResolver(ConfirmarAsistenciaRequestSchema),
    defaultValues: { items: [], slotId: "" },
  });

  return (
    <form onSubmit={handleSubmit(() => {})}>
      <label htmlFor="slotId">Slot</label>
      <input id="slotId" {...register("slotId")} />
      {formState.errors.slotId ? <p role="alert">{formState.errors.slotId.message}</p> : null}

      <label htmlFor="placeholderItem">Servicio de ejemplo</label>
      <input
        id="placeholderItem"
        type="checkbox"
        onChange={(e) => setValue("items", e.target.checked ? [PLACEHOLDER_ITEM] : [])}
      />
      {formState.errors.items ? <p role="alert">{formState.errors.items.message}</p> : null}

      <button type="submit">Confirmar (placeholder, Gate 0)</button>
    </form>
  );
}
