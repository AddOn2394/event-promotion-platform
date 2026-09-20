import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ActualizarConfiguracionDescuentoRequestSchema,
  type ActualizarConfiguracionDescuentoRequest,
} from "@event-promotion/shared-types";
import { Button, Field, Input, MoneyController, PageHeader, PageShell, StatusMessage } from "../../shared/ui";
import { useActualizarConfiguracionDescuento, useConfiguracionDescuentoAdmin } from "../api/useConfiguracionDescuentoAdmin";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

// HU-12 (ADR-023): la coherencia "5% nunca más débil que 3%" se valida acá con el mismo
// schema (ActualizarConfiguracionDescuentoRequestSchema) que usa apps/api como autoridad —
// esto es solo el preview, el servidor sigue siendo quien decide de verdad.
export function ConfiguracionDescuentoPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const configQuery = useConfiguracionDescuentoAdmin();
  const actualizar = useActualizarConfiguracionDescuento();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActualizarConfiguracionDescuentoRequest>({
    resolver: zodResolver(ActualizarConfiguracionDescuentoRequestSchema),
    values: configQuery.data,
  });

  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

  const onSubmit = handleSubmit((values) => {
    actualizar.mutate(values, { onSuccess: (data) => reset(data) });
  });

  if (!session) return null;

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <AdminNav />
        <PageHeader
          title="Umbrales de descuento"
          subtitle="Los porcentajes (3%/5%) son fijos en código — acá solo se editan los umbrales que los disparan (ADR-023)."
        />

        {configQuery.isLoading ? <StatusMessage tono="carga">Cargando…</StatusMessage> : null}
        {configQuery.data ? (
          <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-4">
            <Field label="Mínimo de servicios para 3%" htmlFor="minServicios3pct" error={errors.minServicios3pct?.message}>
              <Input type="number" min={1} step={1} {...register("minServicios3pct", { valueAsNumber: true })} />
            </Field>
            <Field label="Mínimo de servicios para 5%" htmlFor="minServicios5pct" error={errors.minServicios5pct?.message}>
              <Input type="number" min={1} step={1} {...register("minServicios5pct", { valueAsNumber: true })} />
            </Field>
            <Field
              label="Monto mínimo en servicios para 5% (Q)"
              htmlFor="montoMinimo5pctServiciosCents"
              error={errors.montoMinimo5pctServiciosCents?.message}
            >
              <MoneyController name="montoMinimo5pctServiciosCents" control={control} />
            </Field>
            <Field label="Mínimo de productos para 3%" htmlFor="minProductos3pct" error={errors.minProductos3pct?.message}>
              <Input type="number" min={1} step={1} {...register("minProductos3pct", { valueAsNumber: true })} />
            </Field>
            <Field label="Mínimo de productos para 5%" htmlFor="minProductos5pct" error={errors.minProductos5pct?.message}>
              <Input type="number" min={1} step={1} {...register("minProductos5pct", { valueAsNumber: true })} />
            </Field>

            {actualizar.isError ? <StatusMessage tono="error">{actualizar.error.message}</StatusMessage> : null}
            {actualizar.isSuccess ? (
              <StatusMessage tono="exito">Configuración actualizada — no afecta confirmaciones ya hechas.</StatusMessage>
            ) : null}

            <Button type="submit" disabled={actualizar.isPending} className="self-start">
              {actualizar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        ) : null}
      </div>
    </PageShell>
  );
}
