import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarEmail } from "./mailer.js";

const CORREO = { to: "cliente@example.com", subject: "Asunto", html: "<p>hola</p>", text: "hola" };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("enviarEmail", () => {
  it("con NODE_ENV=test simula un envío exitoso sin tocar Resend, aunque haya credenciales", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_FROM_EMAIL", "ventas@example.com");
    vi.stubEnv("RESEND_API_KEY", "re_clave_que_no_debe_usarse");

    const resultado = await enviarEmail(CORREO);

    expect(resultado.exito).toBe(true);
    expect(resultado.exito && resultado.idMensaje).toMatch(/^test-/);
  });

  it("fuera de test no simula nada: sin RESEND_FROM_EMAIL devuelve el motivo del fallo", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_FROM_EMAIL", "");

    const resultado = await enviarEmail(CORREO);

    expect(resultado).toEqual({ exito: false, error: "RESEND_FROM_EMAIL no está configurada." });
  });
});
