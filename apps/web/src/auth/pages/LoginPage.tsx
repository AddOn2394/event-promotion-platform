import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ConfirmacionPropiaResponseSchema,
  LoginClienteRequestSchema,
  type LoginClienteRequest,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";
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
        navigate(await decidirDestinoTrasLogin());
      },
    });
  });

  return (
    <main>
      <h1>Ingresar</h1>
      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" {...register("email")} />
          {errors.email ? <p role="alert">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="codigo">Código de acceso (6 dígitos)</label>
          <input
            id="codigo"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            {...register("codigo")}
          />
          {errors.codigo ? <p role="alert">{errors.codigo.message}</p> : null}
        </div>

        {login.isError ? <p role="alert">{login.error.message}</p> : null}

        <button type="submit" disabled={login.isPending}>
          {login.isPending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
