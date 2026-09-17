import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import {
  limpiarTablasTransaccionales,
  limpiarTodoElFixture,
  seedFixtures,
  type Fixtures,
} from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-registro@example.com";
const CODIGO = "999888";

async function loginClienteDePrueba(): Promise<string> {
  const codigoHash = await bcrypt.hash(CODIGO, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [EMAIL_CLIENTE, "Cliente Registro", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("Login de prueba no devolvió cookie.");
  return cookie;
}

describe("registration — POST /confirmaciones (HU-3), integración contra Postgres real", () => {
  let fixtures: Fixtures;

  beforeAll(async () => {
    await limpiarTodoElFixture();
    fixtures = await seedFixtures();
  });

  afterEach(async () => {
    await limpiarTablasTransaccionales();
  });

  afterAll(async () => {
    await limpiarTodoElFixture();
    await pool.end();
  });

  it("rechaza la petición sin autenticación de cliente", async () => {
    const res = await request(app).post("/confirmaciones").send({ items: [], slotId: fixtures.slotId });
    expect(res.status).toBe(401);
  });

  it("rechaza un slotId inexistente con 400", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }],
        slotId: "00000000-0000-0000-0000-000000000000",
      });
    expect(res.status).toBe(400);
  });

  it("rechaza un ítem de catálogo inexistente/inactivo con 400", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: "00000000-0000-0000-0000-000000000000", categoria: "servicio" }],
        slotId: fixtures.slotId,
      });
    expect(res.status).toBe(400);
  });

  it("confirma con 2 servicios > Q1,500 → 5%, ignora la categoría enviada por el cliente y usa la real de la DB", async () => {
    const cookie = await loginClienteDePrueba();
    // servicioBarato=50000 + servicioCaro=120000 = 170000 > 150000 → 5% (ADR-005).
    // Se envía categoria "producto" a propósito para servicioCaro — el servidor debe ignorarlo.
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [
          { catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" },
          { catalogoItemId: fixtures.servicioCaroId, categoria: "producto" },
        ],
        slotId: fixtures.slotId,
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotalServiciosCents).toBe(170_000);
    expect(res.body.descuentoServiciosPct).toBe(5);
    expect(res.body.subtotalProductosCents).toBe(0);
    expect(res.body.totalCents).toBe(161_500);

    const { rows: itemsGuardados } = await pool.query<{ categoria_snapshot: string }>(
      "SELECT categoria_snapshot FROM confirmacion_items ci JOIN confirmaciones c ON c.idconfirmacion = ci.idconfirmacion JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = $1",
      [EMAIL_CLIENTE],
    );
    expect(itemsGuardados.every((row) => row.categoria_snapshot === "servicio")).toBe(true);
  });

  it("rechaza una segunda confirmación para la misma invitación con 409", async () => {
    const cookie = await loginClienteDePrueba();
    const body = {
      items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }],
      slotId: fixtures.slotId,
    };
    const primera = await request(app).post("/confirmaciones").set("Cookie", cookie).send(body);
    expect(primera.status).toBe(201);

    const segunda = await request(app).post("/confirmaciones").set("Cookie", cookie).send(body);
    expect(segunda.status).toBe(409);
  });

  it("actualiza el nombre del cliente cuando viene en el request (ADR-011, nombre editable)", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }],
        slotId: fixtures.slotId,
        nombreCliente: "Nombre Corregido",
      });
    expect(res.status).toBe(201);

    const { rows } = await pool.query<{ nombre_cliente: string }>(
      "SELECT nombre_cliente FROM invitaciones WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    expect(rows[0]?.nombre_cliente).toBe("Nombre Corregido");
  });

  it("congela el snapshot de umbrales usados en la propia confirmación (ADR-023)", async () => {
    const cookie = await loginClienteDePrueba();
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }],
        slotId: fixtures.slotId,
      });

    const { rows } = await pool.query<{ min_productos_3pct_snapshot: number; min_productos_5pct_snapshot: number }>(
      `SELECT c.min_productos_3pct_snapshot, c.min_productos_5pct_snapshot
       FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion
       WHERE i.email = $1`,
      [EMAIL_CLIENTE],
    );
    expect(rows[0]?.min_productos_3pct_snapshot).toBe(3);
    expect(rows[0]?.min_productos_5pct_snapshot).toBe(5);
  });
});
