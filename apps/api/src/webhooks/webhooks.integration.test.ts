import { randomUUID } from "node:crypto";
import request from "supertest";
import { Webhook } from "svix";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import { limpiarTablasTransaccionales, limpiarTodoElFixture, seedFixtures } from "../test-support/fixtures.js";

const app = createApp();

function firmar(payload: object): { body: string; headers: Record<string, string> } {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET no está configurada para el test.");
  const webhook = new Webhook(secret);
  const body = JSON.stringify(payload);
  const id = `msg_${randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = webhook.sign(id, new Date(Number(timestamp) * 1000), body);
  return { body, headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature } };
}

async function crearNotificacionDePrueba(idMensajeResend: string, estadoInicial = "enviado"): Promise<string> {
  const { rows: invitacionRows } = await pool.query<{ idinvitacion: string }>(
    "INSERT INTO invitaciones (email, codigo_acceso_hash) VALUES ($1, $2) RETURNING idinvitacion",
    [`webhook-${idMensajeResend}@example.com`, "hash-no-usado"],
  );
  const idinvitacion = invitacionRows[0]?.idinvitacion;
  if (!idinvitacion) throw new Error("No se pudo crear la invitación de prueba.");

  const { rows } = await pool.query<{ idnotificacion: string }>(
    `INSERT INTO notificaciones (idinvitacion, tipo, estado_envio, id_mensaje_resend)
     VALUES ($1, 'invitacion', $2, $3) RETURNING idnotificacion`,
    [idinvitacion, estadoInicial, idMensajeResend],
  );
  const idnotificacion = rows[0]?.idnotificacion;
  if (!idnotificacion) throw new Error("No se pudo crear la notificación de prueba.");
  return idnotificacion;
}

async function leerEstado(idnotificacion: string): Promise<string> {
  const { rows } = await pool.query<{ estado_envio: string }>(
    "SELECT estado_envio FROM notificaciones WHERE idnotificacion = $1",
    [idnotificacion],
  );
  const estado = rows[0]?.estado_envio;
  if (!estado) throw new Error("Notificación de prueba no encontrada.");
  return estado;
}

// ADR-024: el webhook lo llama Resend (Sistema), no un usuario con sesión — se verifica
// por firma Svix, no por cookie. Nombres de evento reales de Resend
// (resend.com/docs/dashboard/webhooks/event-types): email.delivered, email.bounced,
// email.failed son los 3 que mapean a nuestras 3 columnas de estado_envio no-pendiente.
describe("webhooks — POST /webhooks/resend (ADR-024), integración contra Postgres real", () => {
  beforeAll(async () => {
    await limpiarTodoElFixture();
    await seedFixtures();
  });

  afterEach(async () => {
    await limpiarTablasTransaccionales();
  });

  afterAll(async () => {
    await limpiarTodoElFixture();
    await pool.end();
  });

  it("rechaza un payload sin firma válida con 400", async () => {
    const res = await request(app)
      .post("/webhooks/resend")
      .set("Content-Type", "application/json")
      .set("svix-id", "msg_falso")
      .set("svix-timestamp", Math.floor(Date.now() / 1000).toString())
      .set("svix-signature", "v1,firma-invalida")
      .send(JSON.stringify({ type: "email.bounced", data: { email_id: "no-importa" } }));
    expect(res.status).toBe(400);
  });

  it("email.bounced actualiza estado_envio a 'rebotado'", async () => {
    const idMensaje = `msg_${randomUUID()}`;
    const idnotificacion = await crearNotificacionDePrueba(idMensaje);

    const { body, headers } = firmar({ type: "email.bounced", data: { email_id: idMensaje } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);

    expect(res.status).toBe(200);
    expect(await leerEstado(idnotificacion)).toBe("rebotado");
  });

  it("email.failed actualiza estado_envio a 'fallido'", async () => {
    const idMensaje = `msg_${randomUUID()}`;
    const idnotificacion = await crearNotificacionDePrueba(idMensaje);

    const { body, headers } = firmar({ type: "email.failed", data: { email_id: idMensaje } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);

    expect(res.status).toBe(200);
    expect(await leerEstado(idnotificacion)).toBe("fallido");
  });

  it("email.delivered actualiza estado_envio a 'enviado'", async () => {
    const idMensaje = `msg_${randomUUID()}`;
    const idnotificacion = await crearNotificacionDePrueba(idMensaje, "pendiente");

    const { body, headers } = firmar({ type: "email.delivered", data: { email_id: idMensaje } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);

    expect(res.status).toBe(200);
    expect(await leerEstado(idnotificacion)).toBe("enviado");
  });

  it("un email.delivered tardío no pisa un 'rebotado' ya registrado", async () => {
    const idMensaje = `msg_${randomUUID()}`;
    const idnotificacion = await crearNotificacionDePrueba(idMensaje, "rebotado");

    const { body, headers } = firmar({ type: "email.delivered", data: { email_id: idMensaje } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);

    expect(res.status).toBe(200);
    expect(await leerEstado(idnotificacion)).toBe("rebotado");
  });

  it("un email.failed reordenado no pisa un 'rebotado' ya registrado (ni viceversa)", async () => {
    const idMensajeRebotado = `msg_${randomUUID()}`;
    const idnotifRebotado = await crearNotificacionDePrueba(idMensajeRebotado, "rebotado");
    const { body: bodyFallido, headers: headersFallido } = firmar({
      type: "email.failed",
      data: { email_id: idMensajeRebotado },
    });
    await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headersFallido).send(bodyFallido);
    expect(await leerEstado(idnotifRebotado)).toBe("rebotado");

    const idMensajeFallido = `msg_${randomUUID()}`;
    const idnotifFallido = await crearNotificacionDePrueba(idMensajeFallido, "fallido");
    const { body: bodyRebotado, headers: headersRebotado } = firmar({
      type: "email.bounced",
      data: { email_id: idMensajeFallido },
    });
    await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headersRebotado).send(bodyRebotado);
    expect(await leerEstado(idnotifFallido)).toBe("fallido");
  });

  it("un evento sin mapeo (email.opened) devuelve 200 sin tocar el estado", async () => {
    const idMensaje = `msg_${randomUUID()}`;
    const idnotificacion = await crearNotificacionDePrueba(idMensaje, "enviado");

    const { body, headers } = firmar({ type: "email.opened", data: { email_id: idMensaje } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);

    expect(res.status).toBe(200);
    expect(await leerEstado(idnotificacion)).toBe("enviado");
  });

  // code-review Gate 6: un evento con firma válida pero forma inesperada (data sin
  // email_id, o sin data del todo) no debe romper con un 500 — se trata igual que un tipo
  // de evento sin mapeo, 200 OK sin tocar nada, en vez de un TypeError no controlado.
  it("un evento con tipo mapeado pero sin data.email_id devuelve 200 sin romper (firma válida, forma inesperada)", async () => {
    const { body, headers } = firmar({ type: "email.bounced", data: {} });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);
    expect(res.status).toBe(200);
  });

  it("un evento con firma válida pero sin campo type devuelve 200 sin romper", async () => {
    const { body, headers } = firmar({ data: { email_id: "no-importa" } });
    const res = await request(app).post("/webhooks/resend").set("Content-Type", "application/json").set(headers).send(body);
    expect(res.status).toBe(200);
  });
});
