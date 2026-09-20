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
import { Button, Field, Input, PageHeader, PageShell, StatusMessage } from "../../shared/ui";
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
    <PageShell variant="centrado">
      <PageHeader
        eyebrow="Feria de Promociones"
        title="Ingresar"
        subtitle="Aquí podrá elegir los servicios y productos de su interés, reservar un horario para asistir a la feria y ver su descuento."
      />
      <p className="mt-3 text-sm text-apagado">
        Ingrese con el correo electrónico al que le llegó la invitación y con el código de 6 dígitos que recibió en ese
        mismo mensaje.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" {...register("email")} />
        </Field>

        <Field
          label="Código de acceso (6 dígitos)"
          htmlFor="codigo"
          error={errors.codigo?.message}
          hint="Lo recibió por correo electrónico, junto con su invitación."
        >
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
          <StatusMessage id="login-error" tono="error">
            {login.error.message}
          </StatusMessage>
        ) : null}

        <Button
          type="submit"
          disabled={login.isPending || redirigiendo}
          aria-describedby={login.isError ? "login-error" : undefined}
          className="mt-2"
        >
          {login.isPending || redirigiendo ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-apagado">
        ¿No encuentra su código? Revise la carpeta de correo no deseado o comuníquese con el departamento de ventas.
      </p>
    </PageShell>
  );
}
