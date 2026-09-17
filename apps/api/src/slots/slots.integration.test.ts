import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import { limpiarTablasTransaccionales, limpiarTodoElFixture, seedFixtures } from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-slots@example.com";
const CODIGO = "333444";

async function loginClienteDePrueba(): Promise<string> {
  const codigoHash = await bcrypt.hash(CODIGO, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [EMAIL_CLIENTE, "Cliente Slots", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("Login de prueba no devolvió cookie.");
  return cookie;
}

describe("slots — GET /slots (ADR-008), integración contra Postgres real", () => {
  let fixtureSlotId: string;

  beforeAll(async () => {
    await limpiarTodoElFixture();
    const fixtures = await seedFixtures();
    fixtureSlotId = fixtures.slotId;
  });

  afterEach(async () => {
    await limpiarTablasTransaccionales();
  });

  afterAll(async () => {
    await limpiarTodoElFixture();
    await pool.end();
  });

  it("rechaza la petición sin autenticación de cliente", async () => {
    const res = await request(app).get("/slots");
    expect(res.status).toBe(401);
  });

  it("devuelve las fechas como string ISO 8601, no como objeto Date crudo de pg", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app).get("/slots").set("Cookie", cookie);

    expect(res.status).toBe(200);
    const slot = res.body.find((s: { id: string }) => s.id === fixtureSlotId);
    expect(slot).toBeDefined();
    expect(typeof slot.fechaHoraInicio).toBe("string");
    expect(() => new Date(slot.fechaHoraInicio).toISOString()).not.toThrow();
  });

  it("expone cuposDisponibles (ADR-009, informativo)", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app).get("/slots").set("Cookie", cookie);

    const slot = res.body.find((s: { id: string }) => s.id === fixtureSlotId);
    expect(slot.cuposDisponibles).toBe(10);
  });

  it("no devuelve slots inactivos", async () => {
    const cookie = await loginClienteDePrueba();
    const { rows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo) VALUES (now() + interval '5 days', now() + interval '5 days 1 hour', 5, 5, false) RETURNING idslot",
    );
    const idInactivo = rows[0]?.idslot;

    const res = await request(app).get("/slots").set("Cookie", cookie);
    const ids: string[] = res.body.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(idInactivo);
  });
});
