import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ActualizarConfiguracionEventoRequestSchema, CrearSlotRequestSchema } from "@event-promotion/shared-types";
import { Button, Field, Input, Table } from "../../shared/ui";
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

type CrearSlotForm = z.infer<typeof CrearSlotRequestSchema>;
type DeadlineForm = z.infer<typeof ActualizarConfiguracionEventoRequestSchema>;

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
    resolver: zodResolver(CrearSlotFormSchema),
    defaultValues: { fechaHoraInicio: "", fechaHoraFin: "", cupoMaximo: 1 },
  });

  const {
    register: registerDeadline,
    handleSubmit: handleSubmitDeadline,
    formState: { errors: erroresDeadline },
  } = useForm<DeadlineForm>({
    resolver: zodResolver(ActualizarConfiguracionEventoRequestSchema),
    values: configQuery.data,
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

  const onSubmitDeadline = handleSubmitDeadline((values) => {
    actualizarConfig.mutate(values);
  });

  if (!session) return null;

  return (
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav />
        <h1 className="font-display text-2xl font-bold text-tinta">Slots</h1>

        <form onSubmit={onSubmitSlot} noValidate className="flex max-w-sm flex-col gap-4">
          <Field label="Inicio" htmlFor="fechaHoraInicio" error={errors.fechaHoraInicio?.message}>
            <Input type="datetime-local" {...register("fechaHoraInicio")} />
          </Field>
          <Field label="Fin" htmlFor="fechaHoraFin" error={errors.fechaHoraFin?.message}>
            <Input type="datetime-local" {...register("fechaHoraFin")} />
          </Field>
          <Field label="Cupo máximo" htmlFor="cupoMaximo" error={errors.cupoMaximo?.message}>
            <Input type="number" min={1} step={1} {...register("cupoMaximo", { valueAsNumber: true })} />
          </Field>

          {crear.isError ? (
            <p role="alert" className="text-sm text-alerta">
              {crear.error.message}
            </p>
          ) : null}
          {crear.isSuccess ? (
            <p role="status" className="text-sm text-jade">
              Slot creado.
            </p>
          ) : null}

          <Button type="submit" disabled={crear.isPending} className="self-start">
            {crear.isPending ? "Creando…" : "Crear slot"}
          </Button>
        </form>

        {slotsQuery.data ? (
          <Table>
            <thead>
              <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-apagado">
                <th scope="col" className="py-2 pr-4">Inicio</th>
                <th scope="col" className="py-2 pr-4">Fin</th>
                <th scope="col" className="py-2 pr-4">Cupo máximo</th>
                <th scope="col" className="py-2 pr-4">Cupos disponibles</th>
                <th scope="col" className="py-2 pr-4">Activo</th>
                <th scope="col" className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {slotsQuery.data.map((slot) => (
                <tr key={slot.id} className="border-b border-borde/60">
                  <td className="py-2 pr-4 text-tinta">{new Date(slot.fechaHoraInicio).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-tinta">{new Date(slot.fechaHoraFin).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-tinta">{slot.cupoMaximo}</td>
                  <td className="py-2 pr-4 text-tinta">{slot.cuposDisponibles}</td>
                  <td className="py-2 pr-4 text-tinta">{slot.activo ? "Sí" : "No"}</td>
                  <td className="py-2">
                    {slot.activo ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={desactivar.isPending}
                        onClick={() => desactivar.mutate(slot.id)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
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
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        {actualizar.isError ? (
          <p role="alert" className="text-sm text-alerta">
            {actualizar.error.message}
          </p>
        ) : null}

        <div>
          <h2 className="font-display text-lg font-bold text-tinta">Deadline de edición</h2>
          {configQuery.data ? (
            <form onSubmit={onSubmitDeadline} className="mt-3 flex max-w-sm flex-col gap-4">
              <Field
                label="Días antes del slot en que se cierra la edición"
                htmlFor="diasDeadlineEdicion"
                error={erroresDeadline.diasDeadlineEdicion?.message}
              >
                <Input
                  type="number"
                  min={0}
                  step={1}
                  {...registerDeadline("diasDeadlineEdicion", { valueAsNumber: true })}
                />
              </Field>
              {actualizarConfig.isError ? (
                <p role="alert" className="text-sm text-alerta">
                  {actualizarConfig.error.message}
                </p>
              ) : null}
              {actualizarConfig.isSuccess ? (
                <p role="status" className="text-sm text-jade">
                  Deadline actualizado.
                </p>
              ) : null}
              <Button type="submit" disabled={actualizarConfig.isPending} className="self-start">
                Guardar
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
