import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ActualizarConfiguracionDescuentoRequestSchema,
  type ActualizarConfiguracionDescuentoRequest,
} from "@event-promotion/shared-types";
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
    <main>
      <AdminNav />
      <h1>Umbrales de descuento</h1>
      <p>Los porcentajes (3%/5%) son fijos en código — acá solo se editan los umbrales que los disparan (ADR-023).</p>

      {configQuery.isLoading ? <p>Cargando…</p> : null}
      {configQuery.data ? (
        <form onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="minServicios3pct">Mínimo de servicios para 3%</label>
            <input id="minServicios3pct" type="number" min={1} step={1} {...register("minServicios3pct", { valueAsNumber: true })} />
          </div>
          <div>
            <label htmlFor="minServicios5pct">Mínimo de servicios para 5%</label>
            <input id="minServicios5pct" type="number" min={1} step={1} {...register("minServicios5pct", { valueAsNumber: true })} />
            {errors.minServicios5pct ? <p role="alert">{errors.minServicios5pct.message}</p> : null}
          </div>
          <div>
            <label htmlFor="montoMinimo5pctServiciosCents">Monto mínimo en servicios para 5% (centavos)</label>
            <input
              id="montoMinimo5pctServiciosCents"
              type="number"
              min={1}
              step={1}
              {...register("montoMinimo5pctServiciosCents", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label htmlFor="minProductos3pct">Mínimo de productos para 3%</label>
            <input id="minProductos3pct" type="number" min={1} step={1} {...register("minProductos3pct", { valueAsNumber: true })} />
          </div>
          <div>
            <label htmlFor="minProductos5pct">Mínimo de productos para 5%</label>
            <input id="minProductos5pct" type="number" min={1} step={1} {...register("minProductos5pct", { valueAsNumber: true })} />
            {errors.minProductos5pct ? <p role="alert">{errors.minProductos5pct.message}</p> : null}
          </div>

          {actualizar.isError ? <p role="alert">{actualizar.error.message}</p> : null}
          {actualizar.isSuccess ? <p role="status">Configuración actualizada — no afecta confirmaciones ya hechas.</p> : null}

          <button type="submit" disabled={actualizar.isPending}>
            {actualizar.isPending ? "Guardando…" : "Guardar"}
          </button>
        </form>
      ) : null}
    </main>
  );
}
