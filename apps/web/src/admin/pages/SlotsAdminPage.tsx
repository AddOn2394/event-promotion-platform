import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CrearSlotRequestSchema } from "@event-promotion/shared-types";
import { useActualizarConfiguracionEvento, useConfiguracionEvento } from "../api/useConfiguracionEvento";
import { useActualizarSlot } from "../api/useActualizarSlot";
import { useCrearSlot } from "../api/useCrearSlot";
import { useDesactivarSlot } from "../api/useDesactivarSlot";
import { useSlotsAdmin } from "../api/useSlotsAdmin";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

// El input nativo <input type="datetime-local"> produce "2026-09-17T10:00" (sin segundos
// ni zona horaria), que CrearSlotRequestSchema (DatetimeSchema = z.string().datetime())
// rechaza de plano — el formulario nunca podría enviarse. Se adapta el formato acá, antes
// de validar, reusando el schema real (incl. el refine fechaFin>Inicio, ADR-016) en vez de
// reimplementar esa regla a mano.
function localAIso(valor: unknown): unknown {
  if (typeof valor !== "string" || valor === "") return valor;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toISOString();
}

const CrearSlotFormSchema = z.preprocess((valor) => {
  if (typeof valor !== "object" || valor === null) return valor;
  const v = valor as Record<string, unknown>;
  return { ...v, fechaHoraInicio: localAIso(v.fechaHoraInicio), fechaHoraFin: localAIso(v.fechaHoraFin) };
}, CrearSlotRequestSchema);

type CrearSlotForm = { fechaHoraInicio: string; fechaHoraFin: string; cupoMaximo: number };

// HU-10 (ADR-007/ADR-009/ADR-010): CRUD + soft-delete de slots + N días de deadline.
export function SlotsAdminPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const slotsQuery = useSlotsAdmin();
  const crear = useCrearSlot();
  const actualizar = useActualizarSlot();
  const desactivar = useDesactivarSlot();
  const configQuery = useConfiguracionEvento();
  const actualizarConfig = useActualizarConfiguracionEvento();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearSlotForm>({
    resolver: zodResolver(CrearSlotFormSchema) as Resolver<CrearSlotForm>,
    defaultValues: { fechaHoraInicio: "", fechaHoraFin: "", cupoMaximo: 1 },
  });

  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

  // zodResolver reemplaza `values` con la salida ya parseada por CrearSlotFormSchema
  // (fechas ISO, tras el preprocess de arriba) — llega lista para el request real.
  const onSubmitSlot = handleSubmit((values) => {
    crear.mutate(CrearSlotRequestSchema.parse(values), { onSuccess: () => reset() });
  });

  const onSubmitDeadline = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dias = Number(formData.get("diasDeadlineEdicion"));
    actualizarConfig.mutate({ diasDeadlineEdicion: dias });
  };

  if (!session) return null;

  return (
    <main>
      <AdminNav />
      <h1>Slots</h1>

      <form onSubmit={onSubmitSlot} noValidate>
        <div>
          <label htmlFor="fechaHoraInicio">Inicio</label>
          <input id="fechaHoraInicio" type="datetime-local" {...register("fechaHoraInicio")} />
        </div>
        <div>
          <label htmlFor="fechaHoraFin">Fin</label>
          <input id="fechaHoraFin" type="datetime-local" {...register("fechaHoraFin")} />
          {errors.fechaHoraFin ? <p role="alert">{errors.fechaHoraFin.message}</p> : null}
        </div>
        <div>
          <label htmlFor="cupoMaximo">Cupo máximo</label>
          <input id="cupoMaximo" type="number" min={1} step={1} {...register("cupoMaximo", { valueAsNumber: true })} />
          {errors.cupoMaximo ? <p role="alert">{errors.cupoMaximo.message}</p> : null}
        </div>

        {crear.isError ? <p role="alert">{crear.error.message}</p> : null}
        {crear.isSuccess ? <p role="status">Slot creado.</p> : null}

        <button type="submit" disabled={crear.isPending}>
          {crear.isPending ? "Creando…" : "Crear slot"}
        </button>
      </form>

      {slotsQuery.data ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Inicio</th>
              <th scope="col">Fin</th>
              <th scope="col">Cupo máximo</th>
              <th scope="col">Cupos disponibles</th>
              <th scope="col">Activo</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {slotsQuery.data.map((slot) => (
              <tr key={slot.id}>
                <td>{new Date(slot.fechaHoraInicio).toLocaleString()}</td>
                <td>{new Date(slot.fechaHoraFin).toLocaleString()}</td>
                <td>{slot.cupoMaximo}</td>
                <td>{slot.cuposDisponibles}</td>
                <td>{slot.activo ? "Sí" : "No"}</td>
                <td>
                  {slot.activo ? (
                    <button type="button" disabled={desactivar.isPending} onClick={() => desactivar.mutate(slot.id)}>
                      Desactivar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actualizar.isPending}
                      onClick={() =>
                        actualizar.mutate({
                          id: slot.id,
                          body: {
                            fechaHoraInicio: slot.fechaHoraInicio,
                            fechaHoraFin: slot.fechaHoraFin,
                            cupoMaximo: slot.cupoMaximo,
                            activo: true,
                          },
                        })
                      }
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {actualizar.isError ? <p role="alert">{actualizar.error.message}</p> : null}

      <h2>Deadline de edición</h2>
      {configQuery.data ? (
        <form onSubmit={onSubmitDeadline}>
          <div>
            <label htmlFor="diasDeadlineEdicion">Días antes del slot en que se cierra la edición</label>
            <input
              id="diasDeadlineEdicion"
              name="diasDeadlineEdicion"
              type="number"
              min={0}
              step={1}
              defaultValue={configQuery.data.diasDeadlineEdicion}
            />
          </div>
          {actualizarConfig.isError ? <p role="alert">{actualizarConfig.error.message}</p> : null}
          {actualizarConfig.isSuccess ? <p role="status">Deadline actualizado.</p> : null}
          <button type="submit" disabled={actualizarConfig.isPending}>
            Guardar
          </button>
        </form>
      ) : null}
    </main>
  );
}
