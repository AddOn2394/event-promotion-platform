import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import {
  FIXTURE_ADMIN_EMAIL,
  FIXTURE_ADMIN_PASSWORD,
  limpiarTablasTransaccionales,
  limpiarTodoElFixture,
  seedFixtures,
} from "../test-support/fixtures.js";

const app = createApp();

describe("admin — login (ADR-013) y crear invitación (HU-1), integración contra Postgres real", () => {
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

  it("POST /admin/auth/login rechaza password incorrecta con 401 genérico", async () => {
    const res = await request(app)
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  it("POST /admin/auth/login rechaza email inexistente con el mismo mensaje genérico (no enumeration)", async () => {
    const resInexistente = await request(app)
      .post("/admin/auth/login")
      .send({ email: "no-existe@example.com", password: "cualquiera" });
    const resIncorrecta = await request(app)
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: "incorrecta" });
    expect(resInexistente.status).toBe(401);
    expect(resInexistente.body.error).toBe(resIncorrecta.body.error);
  });

  it("POST /admin/auth/login acepta credenciales correctas y setea cookie httpOnly", async () => {
    const res = await request(app)
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(FIXTURE_ADMIN_EMAIL);
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("POST /admin/invitaciones sin sesión de admin devuelve 401", async () => {
    const res = await request(app).post("/admin/invitaciones").send({ email: "cliente@example.com" });
    expect(res.status).toBe(401);
  });

  it("POST /admin/invitaciones crea la invitación autenticado, sin exponer el código en texto plano", async () => {
    const agent = request.agent(app);
    await agent
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });

    const res = await agent
      .post("/admin/invitaciones")
      .send({ email: "cliente-integracion@example.com", nombreCliente: "Cliente Integración" });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("cliente-integracion@example.com");
    expect(res.body).not.toHaveProperty("codigo");
    expect(res.body).not.toHaveProperty("codigoAcceso");

    const { rows } = await pool.query<{ codigo_acceso_hash: string }>(
      "SELECT codigo_acceso_hash FROM invitaciones WHERE email = $1",
      ["cliente-integracion@example.com"],
    );
    expect(rows[0]?.codigo_acceso_hash.startsWith("$2")).toBe(true);
  });

  it("POST /admin/invitaciones rechaza un email ya invitado con 409, sin crear una fila duplicada", async () => {
    const agent = request.agent(app);
    await agent
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });

    await agent.post("/admin/invitaciones").send({ email: "duplicado@example.com" });
    const res = await agent.post("/admin/invitaciones").send({ email: "duplicado@example.com" });

    expect(res.status).toBe(409);
    const { rows } = await pool.query("SELECT count(*) FROM invitaciones WHERE email = $1", [
      "duplicado@example.com",
    ]);
    expect(rows[0].count).toBe("1");
  });
});
