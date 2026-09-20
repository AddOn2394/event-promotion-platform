import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  CrearInvitacionRequestSchema,
  type CrearInvitacionRequest,
  type EstadoInvitacionAdmin,
} from "@event-promotion/shared-types";
import { ApiError } from "../../shared/api/client";
import {
  Button,
  Field,
  Input,
  PageHeader,
  PageShell,
  StatusMessage,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "../../shared/ui";
import { useCrearInvitacion } from "../api/useCrearInvitacion";
import { useListarInvitaciones } from "../api/useListarInvitaciones";
import { useReenviarCodigo } from "../api/useReenviarCodigo";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

const ETIQUETA_ESTADO: Record<EstadoInvitacionAdmin, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  sin_respuesta: "Sin respuesta",
  rebotada: "Rebotada",
  fallida: "Fallida",
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
    <PageShell>
      <div className="flex flex-col gap-6">
        <AdminNav />
        <PageHeader title="Invitar cliente" subtitle={`Sesión: ${session.email}`} />

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
            <StatusMessage tono="error">
              {crearInvitacion.error instanceof ApiError && crearInvitacion.error.status === 409
                ? "Ya existe una invitación para este email."
                : crearInvitacion.error.message}
            </StatusMessage>
          ) : null}

          {crearInvitacion.isSuccess ? <StatusMessage tono="exito">Invitación creada y código enviado.</StatusMessage> : null}

          <Button type="submit" disabled={crearInvitacion.isPending} className="self-start">
            {crearInvitacion.isPending ? "Enviando…" : "Invitar"}
          </Button>
        </form>

        <div>
          <h2 className="font-display text-lg font-bold text-tinta">Invitaciones</h2>
          {invitacionesQuery.isLoading ? (
            <StatusMessage tono="carga" className="mt-2">
              Cargando…
            </StatusMessage>
          ) : null}
          {invitacionesQuery.isError ? (
            <StatusMessage tono="error" className="mt-2">
              No se pudo cargar el listado.
            </StatusMessage>
          ) : null}
          {invitacionesQuery.data?.length === 0 ? (
            <StatusMessage tono="vacio" className="mt-2">
              Todavía no hay invitaciones. Cree la primera con el formulario de arriba.
            </StatusMessage>
          ) : null}
          {invitacionesQuery.data && invitacionesQuery.data.length > 0 ? (
            <Table className="mt-3">
              <thead>
                <TableHeaderRow>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Nombre</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell last>Acción (HU-11)</TableHeaderCell>
                </TableHeaderRow>
              </thead>
              <tbody>
                {invitacionesQuery.data.map((invitacion) => (
                  <TableRow key={invitacion.idinvitacion}>
                    <TableCell>{invitacion.email}</TableCell>
                    <TableCell>{invitacion.nombreCliente ?? "—"}</TableCell>
                    <TableCell>{ETIQUETA_ESTADO[invitacion.estado]}</TableCell>
                    <TableCell last>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={reenviarCodigo.isPending}
                        onClick={() => reenviarCodigo.mutate(invitacion.idinvitacion)}
                      >
                        Reenviar código
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : null}
          {reenviarCodigo.isSuccess ? (
            <StatusMessage tono="exito" className="mt-2">
              Código reenviado — el anterior ya no sirve para iniciar sesión.
            </StatusMessage>
          ) : null}
          {reenviarCodigo.isError ? (
            <StatusMessage tono="error" className="mt-2">
              {reenviarCodigo.error.message}
            </StatusMessage>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
