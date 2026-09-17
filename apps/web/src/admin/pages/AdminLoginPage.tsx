import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AdminLoginRequestSchema, type AdminLoginRequest } from "@event-promotion/shared-types";
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
    <main>
      <h1>Login administrador</h1>
      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" {...register("email")} />
          {errors.email ? <p role="alert">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password ? <p role="alert">{errors.password.message}</p> : null}
        </div>

        {login.isError ? <p role="alert">{login.error.message}</p> : null}

        <button type="submit" disabled={login.isPending}>
          {login.isPending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
