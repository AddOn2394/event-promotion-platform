import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import { limpiarTablasTransaccionales, limpiarTodoElFixture, seedFixtures } from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-catalogo@example.com";
const CODIGO = "111222";

async function loginClienteDePrueba(): Promise<string> {
  const codigoHash = await bcrypt.hash(CODIGO, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [EMAIL_CLIENTE, "Cliente Catálogo", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("Login de prueba no devolvió cookie.");
  return cookie;
}

describe("catalog — GET /catalogo (ADR-007, ADR-012), integración contra Postgres real", () => {
  beforeAll(async () => {
    await limpiarTodoElFixture();
    await seedFixtures();
  });

  afterEach(async () => {
    await limpiarTablasTransaccionales();
  });

  afterAll(async () => {
    await limpiarTodoElFixture();
  });

  it("rechaza la petición sin autenticación de cliente", async () => {
    const res = await request(app).get("/catalogo");
    expect(res.status).toBe(401);
  });

  it("devuelve solo ítems activos (soft-delete, ADR-007)", async () => {
    const cookie = await loginClienteDePrueba();

    const { rows: inactivoRows } = await pool.query<{ idcatalogo: string }>(
      "INSERT INTO catalogo_items (nombre, categoria, precio_cents, activo) VALUES ('TEST FIXTURE inactivo', 'servicio', 10000, false) RETURNING idcatalogo",
    );
    const idInactivo = inactivoRows[0]?.idcatalogo;

    const res = await request(app).get("/catalogo").set("Cookie", cookie);

    expect(res.status).toBe(200);
    const ids: string[] = res.body.map((item: { id: string }) => item.id);
    expect(ids).not.toContain(idInactivo);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((item: { nombre: string }) => item.nombre !== "TEST FIXTURE inactivo")).toBe(true);
  });
});

describe("catalog — GET /configuracion-descuento (ADR-025), integración contra Postgres real", () => {
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

  it("rechaza la petición sin autenticación de cliente", async () => {
    const res = await request(app).get("/configuracion-descuento");
    expect(res.status).toBe(401);
  });

  it("devuelve los mismos umbrales que usa apps/api al confirmar (fixtures: seedFixtures)", async () => {
    const cookie = await loginClienteDePrueba();

    const res = await request(app).get("/configuracion-descuento").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      minServicios3pct: 2,
      minServicios5pct: 2,
      montoMinimo5pctServiciosCents: 150000,
      minProductos3pct: 3,
      minProductos5pct: 5,
    });
  });
});
