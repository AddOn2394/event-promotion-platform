import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AdminLoginRequestSchema, type AdminLoginRequest } from "@event-promotion/shared-types";
import { Button, Field, Input } from "../../shared/ui";
import { useAdminLogin } from "../api/useAdminLogin";
import { useAdminSession } from "../context/AdminSessionContext";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAdminSession();
  const login = useAdminLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginRequest>({
    resolver: zodResolver(AdminLoginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (data) => {
        setSession({ email: data.email });
        navigate("/admin/invitaciones");
      },
    });
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-papel px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-jade">
          Feria de Promociones
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">Login administrador</h1>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" {...register("email")} />
          </Field>

          <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} />
          </Field>

          {login.isError ? (
            <p role="alert" className="text-sm text-alerta">
              {login.error.message}
            </p>
          ) : null}

          <Button type="submit" disabled={login.isPending} className="mt-2">
            {login.isPending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
