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
import { useAdminSession } from "../context/AdminSessionContext";

export function InvitacionesPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const crearInvitacion = useCrearInvitacion();

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
    </main>
  );
}
