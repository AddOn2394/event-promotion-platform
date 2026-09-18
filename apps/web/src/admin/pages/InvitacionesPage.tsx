import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  CrearInvitacionRequestSchema,
  type CrearInvitacionRequest,
} from "@event-promotion/shared-types";
import { ApiError } from "../../shared/api/client";
import { Button, Field, Input, Table } from "../../shared/ui";
import { useCrearInvitacion } from "../api/useCrearInvitacion";
import { useListarInvitaciones } from "../api/useListarInvitaciones";
import { useReenviarCodigo } from "../api/useReenviarCodigo";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

const ETIQUETA_ESTADO: Record<string, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  sin_respuesta: "Sin respuesta",
  rebotada: "Rebotada",
};

export function InvitacionesPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const crearInvitacion = useCrearInvitacion();
  const invitacionesQuery = useListarInvitaciones();
  const reenviarCodigo = useReenviarCodigo();

  const sesionExpirada = invitacionesQuery.error instanceof ApiError && invitacionesQuery.error.status === 401;

  useEffect(() => {
    if (!session || sesionExpirada) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, sesionExpirada, navigate]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearInvitacionRequest>({
    resolver: zodResolver(CrearInvitacionRequestSchema),
    defaultValues: { email: "", nombreCliente: "" },
  });

  const onSubmit = handleSubmit((values) => {
    crearInvitacion.mutate(values, {
      onSuccess: () => reset(),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          navigate("/admin/login", { replace: true });
        }
      },
    });
  });

  if (!session) return null;

  return (
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav />
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Invitar cliente</h1>
          <p className="mt-1 text-sm text-apagado">Sesión: {session.email}</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-4">
          <Field label="Email del cliente" htmlFor="email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>

          <Field label="Nombre (opcional)" htmlFor="nombreCliente" error={errors.nombreCliente?.message}>
            <Input
              type="text"
              {...register("nombreCliente", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
            />
          </Field>

          {crearInvitacion.isError ? (
            <p role="alert" className="text-sm text-alerta">
              {crearInvitacion.error instanceof ApiError && crearInvitacion.error.status === 409
                ? "Ya existe una invitación para este email."
                : crearInvitacion.error.message}
            </p>
          ) : null}

          {crearInvitacion.isSuccess ? (
            <p role="status" className="text-sm text-jade">
              Invitación creada y código enviado.
            </p>
          ) : null}

          <Button type="submit" disabled={crearInvitacion.isPending} className="self-start">
            {crearInvitacion.isPending ? "Enviando…" : "Invitar"}
          </Button>
        </form>

        <div>
          <h2 className="font-display text-lg font-bold text-tinta">Invitaciones</h2>
          {invitacionesQuery.isLoading ? <p className="mt-2 text-sm text-apagado">Cargando…</p> : null}
          {invitacionesQuery.isError ? (
            <p role="alert" className="mt-2 text-sm text-alerta">
              No se pudo cargar el listado.
            </p>
          ) : null}
          {invitacionesQuery.data ? (
            <Table className="mt-3">
              <thead>
                <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-apagado">
                  <th scope="col" className="py-2 pr-4">Email</th>
                  <th scope="col" className="py-2 pr-4">Nombre</th>
                  <th scope="col" className="py-2 pr-4">Estado</th>
                  <th scope="col" className="py-2">Acción (HU-11)</th>
                </tr>
              </thead>
              <tbody>
                {invitacionesQuery.data.map((invitacion) => (
                  <tr key={invitacion.idinvitacion} className="border-b border-borde/60">
                    <td className="py-2 pr-4 text-tinta">{invitacion.email}</td>
                    <td className="py-2 pr-4 text-tinta">{invitacion.nombreCliente ?? "—"}</td>
                    <td className="py-2 pr-4 text-tinta">{ETIQUETA_ESTADO[invitacion.estado] ?? invitacion.estado}</td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={reenviarCodigo.isPending}
                        onClick={() => reenviarCodigo.mutate(invitacion.idinvitacion)}
                      >
                        Reenviar código
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          {reenviarCodigo.isSuccess ? (
            <p role="status" className="mt-2 text-sm text-jade">
              Código reenviado — el anterior ya no sirve para iniciar sesión.
            </p>
          ) : null}
          {reenviarCodigo.isError ? (
            <p role="alert" className="mt-2 text-sm text-alerta">
              {reenviarCodigo.error.message}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
