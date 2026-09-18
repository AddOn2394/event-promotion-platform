import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ConfirmacionPropiaResponseSchema,
  LoginClienteRequestSchema,
  type LoginClienteRequest,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";
import { Button, Field, Input } from "../../shared/ui";
import { useLoginCliente } from "../api/useLoginCliente";
import { useClienteSession } from "../context/ClienteSessionContext";

// HU-4/HU-7: si la invitación ya tiene una confirmación 'confirmada' vigente, entra a
// editar (HU-4/HU-5) en vez de al formulario de primera vez — evita un 409 inmediato al
// intentar un segundo POST /confirmaciones. Sin confirmación o 'cancelada' (reconfirmar,
// HU-7) sigue siendo el mismo formulario de siempre.
async function decidirDestinoTrasLogin(): Promise<"/confirmar" | "/editar"> {
  try {
    const data = await apiFetch<unknown>("/confirmaciones/mia");
    const confirmacion = ConfirmacionPropiaResponseSchema.parse(data);
    return confirmacion.estado === "confirmada" ? "/editar" : "/confirmar";
  } catch {
    return "/confirmar";
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession } = useClienteSession();
  const login = useLoginCliente();
  const [redirigiendo, setRedirigiendo] = useState(false);

  // Prellenado desde el link de invitación (construirLinkInvitacion en
  // apps/api/src/admin/service.ts) — formato /login?email=....
  const emailInicial = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginClienteRequest>({
    resolver: zodResolver(LoginClienteRequestSchema),
    defaultValues: { email: emailInicial, codigo: "" },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: async (data) => {
        setSession({ email: data.email, nombreCliente: data.nombreCliente });
        setRedirigiendo(true);
        navigate(await decidirDestinoTrasLogin());
      },
    });
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-papel px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-jade">
          Feria de Promociones
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">Ingresar</h1>
        <p className="mt-2 text-sm text-apagado">
          Usá el email y el código de 6 dígitos que recibiste por correo.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" {...register("email")} />
          </Field>

          <Field label="Código de acceso (6 dígitos)" htmlFor="codigo" error={errors.codigo?.message}>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="font-mono text-lg tracking-[0.3em]"
              {...register("codigo")}
            />
          </Field>

          {login.isError ? (
            <p role="alert" className="text-sm text-alerta">
              {login.error.message}
            </p>
          ) : null}

          <Button type="submit" disabled={login.isPending || redirigiendo} className="mt-2">
            {login.isPending || redirigiendo ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
