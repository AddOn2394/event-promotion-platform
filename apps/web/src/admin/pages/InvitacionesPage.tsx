import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  CrearInvitacionRequestSchema,
  type CrearInvitacionRequest,
} from "@event-promotion/shared-types";
import { ApiError } from "../../shared/api/client";
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

  // Guarda de UX, no de seguridad — GET /admin/invitaciones no existe, así que no hay
  // ninguna llamada que dispare un 401 hasta el submit. El 401 real del POST sigue
  // siendo la autoridad (ver el catch de más abajo).
  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

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
    <main>
      <AdminNav />
      <h1>Invitar cliente</h1>
      <p>Sesión: {session.email}</p>

      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="email">Email del cliente</label>
          <input id="email" type="email" {...register("email")} />
          {errors.email ? <p role="alert">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="nombreCliente">Nombre (opcional)</label>
          <input
            id="nombreCliente"
            type="text"
            {...register("nombreCliente", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
          />
          {errors.nombreCliente ? <p role="alert">{errors.nombreCliente.message}</p> : null}
        </div>

        {crearInvitacion.isError ? (
          <p role="alert">
            {crearInvitacion.error instanceof ApiError && crearInvitacion.error.status === 409
              ? "Ya existe una invitación para este email."
              : crearInvitacion.error.message}
          </p>
        ) : null}

        {crearInvitacion.isSuccess ? <p role="status">Invitación creada y código enviado.</p> : null}

        <button type="submit" disabled={crearInvitacion.isPending}>
          {crearInvitacion.isPending ? "Enviando…" : "Invitar"}
        </button>
      </form>

      <h2>Invitaciones</h2>
      {invitacionesQuery.isLoading ? <p>Cargando…</p> : null}
      {invitacionesQuery.isError ? <p role="alert">No se pudo cargar el listado.</p> : null}
      {invitacionesQuery.data ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Nombre</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción (HU-11)</th>
            </tr>
          </thead>
          <tbody>
            {invitacionesQuery.data.map((invitacion) => (
              <tr key={invitacion.idinvitacion}>
                <td>{invitacion.email}</td>
                <td>{invitacion.nombreCliente ?? "—"}</td>
                <td>{ETIQUETA_ESTADO[invitacion.estado] ?? invitacion.estado}</td>
                <td>
                  <button
                    type="button"
                    disabled={reenviarCodigo.isPending}
                    onClick={() => reenviarCodigo.mutate(invitacion.idinvitacion)}
                  >
                    Reenviar código
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {reenviarCodigo.isSuccess ? <p role="status">Código reenviado — el anterior ya no sirve para iniciar sesión.</p> : null}
      {reenviarCodigo.isError ? <p role="alert">{reenviarCodigo.error.message}</p> : null}
    </main>
  );
}
