import bcrypt from "bcryptjs";
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
  type Fixtures,
} from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-catalogo@example.com";
const CODIGO = "111222";

async function loginAdminAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/admin/auth/login").send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
  return agent;
}

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

// HU-9 (Gate 5, ADR-007): CRUD + soft-delete de catálogo.
describe("catalog — admin CRUD de catálogo (HU-9), integración contra Postgres real", () => {
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

  it("GET/POST/PATCH/DELETE /admin/catalogo sin sesión de admin devuelven 401", async () => {
    expect((await request(app).get("/admin/catalogo")).status).toBe(401);
    expect((await request(app).post("/admin/catalogo")).status).toBe(401);
    expect((await request(app).patch(`/admin/catalogo/${fixtures.productoId}`)).status).toBe(401);
    expect((await request(app).delete(`/admin/catalogo/${fixtures.productoId}`)).status).toBe(401);
  });

  it("crea, edita y desactiva un ítem — GET /admin/catalogo lo ve incluso inactivo", async () => {
    const agent = await loginAdminAgent();

    const crear = await agent
      .post("/admin/catalogo")
      .send({ nombre: "TEST FIXTURE crud", categoria: "servicio", precioCents: 20000 });
    expect(crear.status).toBe(201);
    const idcatalogo = crear.body.id;

    const editar = await agent
      .patch(`/admin/catalogo/${idcatalogo}`)
      .send({ nombre: "TEST FIXTURE crud editado", categoria: "servicio", precioCents: 25000, activo: true });
    expect(editar.status).toBe(200);
    expect(editar.body.nombre).toBe("TEST FIXTURE crud editado");

    const desactivar = await agent.delete(`/admin/catalogo/${idcatalogo}`);
    expect(desactivar.status).toBe(204);

    const listaCliente = await request(app).get("/catalogo").set("Cookie", await loginClienteDePrueba());
    expect(listaCliente.body.some((i: { id: string }) => i.id === idcatalogo)).toBe(false);

    const listaAdmin = await agent.get("/admin/catalogo");
    const itemAdmin = listaAdmin.body.find((i: { id: string }) => i.id === idcatalogo);
    expect(itemAdmin.activo).toBe(false);
  });

  it("un ítem desactivado deja de aparecer en el formulario pero sigue íntegro en una confirmación ya hecha (snapshot, ADR-006)", async () => {
    const agent = await loginAdminAgent();
    const crear = await agent
      .post("/admin/catalogo")
      .send({ nombre: "TEST FIXTURE snapshot", categoria: "producto", precioCents: 15000 });
    const idcatalogo = crear.body.id;

    const cookie = await loginClienteDePrueba();
    const confirmar = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: idcatalogo, categoria: "producto" }], slotId: fixtures.slotId });
    expect(confirmar.status).toBe(201);

    await agent.delete(`/admin/catalogo/${idcatalogo}`);

    const listaCliente = await request(app).get("/catalogo").set("Cookie", cookie);
    expect(listaCliente.body.some((i: { id: string }) => i.id === idcatalogo)).toBe(false);

    const propia = await request(app).get("/confirmaciones/mia").set("Cookie", cookie);
    expect(propia.status).toBe(200);
    expect(propia.body.items.some((i: { catalogoItemId: string; nombre: string }) => i.catalogoItemId === idcatalogo && i.nombre === "TEST FIXTURE snapshot")).toBe(true);
  });

  it("PATCH /admin/catalogo/:id sobre un id inexistente devuelve 404", async () => {
    const agent = await loginAdminAgent();
    const res = await agent
      .patch("/admin/catalogo/00000000-0000-0000-0000-000000000000")
      .send({ nombre: "x", categoria: "servicio", precioCents: 100, activo: true });
    expect(res.status).toBe(404);
  });
});
