import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import { limpiarTablasTransaccionales, limpiarTodoElFixture, seedFixtures } from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-auth@example.com";
const CODIGO = "654321";

async function crearInvitacionDePrueba(): Promise<void> {
  const codigoHash = await bcrypt.hash(CODIGO, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [EMAIL_CLIENTE, "Cliente Auth", codigoHash],
  );
}

describe("auth — login de cliente por código (HU-2), integración contra Postgres real", () => {
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

  it("rechaza un email sin invitación previa con mensaje genérico (no enumeration, ADR-011)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "sin-invitacion@example.com", codigo: "123456" });
    expect(res.status).toBe(401);
  });

  it("rechaza un código incorrecto con el mismo mensaje genérico que 'sin invitación'", async () => {
    await crearInvitacionDePrueba();
    const resCodigoMalo = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL_CLIENTE, codigo: "000000" });
    const resSinInvitacion = await request(app)
      .post("/auth/login")
      .send({ email: "otro-sin-invitacion@example.com", codigo: "000000" });
    expect(resCodigoMalo.status).toBe(401);
    expect(resCodigoMalo.body.error).toBe(resSinInvitacion.body.error);
  });

  it("acepta email+código correctos, setea cookie httpOnly y marca usada_en en el primer login", async () => {
    await crearInvitacionDePrueba();

    const { rows: antes } = await pool.query<{ usada_en: Date | null }>(
      "SELECT usada_en FROM invitaciones WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    expect(antes[0]?.usada_en).toBeNull();

    const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(EMAIL_CLIENTE);
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");

    const { rows: despues } = await pool.query<{ usada_en: Date | null }>(
      "SELECT usada_en FROM invitaciones WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    expect(despues[0]?.usada_en).not.toBeNull();
  });
});
