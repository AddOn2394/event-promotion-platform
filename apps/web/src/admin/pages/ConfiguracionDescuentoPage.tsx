import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ActualizarConfiguracionDescuentoRequestSchema,
  type ActualizarConfiguracionDescuentoRequest,
} from "@event-promotion/shared-types";
import { Button, Field, Input } from "../../shared/ui";
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
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav />
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Umbrales de descuento</h1>
          <p className="mt-1 text-sm text-apagado">
            Los porcentajes (3%/5%) son fijos en código — acá solo se editan los umbrales que los disparan (ADR-023).
          </p>
        </div>

        {configQuery.isLoading ? <p className="text-sm text-apagado">Cargando…</p> : null}
        {configQuery.data ? (
          <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-4">
            <Field label="Mínimo de servicios para 3%" htmlFor="minServicios3pct" error={errors.minServicios3pct?.message}>
              <Input type="number" min={1} step={1} {...register("minServicios3pct", { valueAsNumber: true })} />
            </Field>
            <Field label="Mínimo de servicios para 5%" htmlFor="minServicios5pct" error={errors.minServicios5pct?.message}>
              <Input type="number" min={1} step={1} {...register("minServicios5pct", { valueAsNumber: true })} />
            </Field>
            <Field
              label="Monto mínimo en servicios para 5% (centavos)"
              htmlFor="montoMinimo5pctServiciosCents"
              error={errors.montoMinimo5pctServiciosCents?.message}
            >
              <Input
                type="number"
                min={1}
                step={1}
                {...register("montoMinimo5pctServiciosCents", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Mínimo de productos para 3%" htmlFor="minProductos3pct" error={errors.minProductos3pct?.message}>
              <Input type="number" min={1} step={1} {...register("minProductos3pct", { valueAsNumber: true })} />
            </Field>
            <Field label="Mínimo de productos para 5%" htmlFor="minProductos5pct" error={errors.minProductos5pct?.message}>
              <Input type="number" min={1} step={1} {...register("minProductos5pct", { valueAsNumber: true })} />
            </Field>

            {actualizar.isError ? (
              <p role="alert" className="text-sm text-alerta">
                {actualizar.error.message}
              </p>
            ) : null}
            {actualizar.isSuccess ? (
              <p role="status" className="text-sm text-jade">
                Configuración actualizada — no afecta confirmaciones ya hechas.
              </p>
            ) : null}

            <Button type="submit" disabled={actualizar.isPending} className="self-start">
              {actualizar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
