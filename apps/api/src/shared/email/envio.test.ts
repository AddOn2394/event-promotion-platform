import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/pool.js", () => ({ pool: {} }));
vi.mock("../notificaciones.js", () => ({
  marcarNotificacionEnviada: vi.fn(async () => undefined),
  marcarNotificacionFallida: vi.fn(async () => undefined),
}));

const { enviarCorreoDeNotificacion } = await import("./envio.js");
const { marcarNotificacionEnviada, marcarNotificacionFallida } = await import("../notificaciones.js");

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("enviarCorreoDeNotificacion — nunca lanza sobre una escritura ya comprometida (ADR-024)", () => {
  it("si armar el correo lanza, marca la notificación fallida, registra el motivo y no propaga", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      enviarCorreoDeNotificacion({
        to: "cliente@example.com",
        armarCorreo: () => {
          throw new RangeError("monto no entero");
        },
        idnotificacion: "n-1",
        tipo: "confirmacion",
      }),
    ).resolves.toBeUndefined();

    expect(marcarNotificacionFallida).toHaveBeenCalledWith(expect.anything(), "n-1");
    expect(marcarNotificacionEnviada).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[email] envío fallido",
      expect.objectContaining({ tipo: "confirmacion", idnotificacion: "n-1", motivo: expect.stringContaining("monto no entero") }),
    );
  });

  it("con envío exitoso (mailer de test) marca la notificación enviada", async () => {
    await enviarCorreoDeNotificacion({
      to: "cliente@example.com",
      armarCorreo: () => ({ subject: "s", html: "<p>h</p>", text: "h" }),
      idnotificacion: "n-2",
      tipo: "invitacion",
    });
    expect(marcarNotificacionEnviada).toHaveBeenCalledWith(expect.anything(), "n-2", expect.stringMatching(/^test-/));
    expect(marcarNotificacionFallida).not.toHaveBeenCalled();
  });
});
