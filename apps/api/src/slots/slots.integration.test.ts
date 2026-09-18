import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import {
  FIXTURE_ADMIN_EMAIL,
  FIXTURE_ADMIN_PASSWORD,
  FIXTURE_DIAS_DEADLINE_EDICION,
  limpiarTablasTransaccionales,
  limpiarTodoElFixture,
  seedFixtures,
  type Fixtures,
} from "../test-support/fixtures.js";

const app = createApp();
const EMAIL_CLIENTE = "cliente-slots@example.com";
const CODIGO = "333444";

async function loginAdminAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/admin/auth/login").send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
  return agent;
}

async function loginClienteDePrueba(email = EMAIL_CLIENTE, codigo = CODIGO): Promise<string> {
  const codigoHash = await bcrypt.hash(codigo, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [email, "Cliente Slots", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email, codigo });
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

// HU-10 (Gate 5, ADR-007/ADR-009): CRUD + soft-delete de slots.
describe("slots — admin CRUD de slots (HU-10), integración contra Postgres real", () => {
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
  });

  it("GET/POST/PATCH/DELETE /admin/slots sin sesión de admin devuelven 401", async () => {
    expect((await request(app).get("/admin/slots")).status).toBe(401);
    expect((await request(app).post("/admin/slots")).status).toBe(401);
    expect((await request(app).patch(`/admin/slots/${fixtures.slotId}`)).status).toBe(401);
    expect((await request(app).delete(`/admin/slots/${fixtures.slotId}`)).status).toBe(401);
  });

  it("crea, edita y desactiva un slot — GET /admin/slots lo ve incluso inactivo, GET /slots (cliente) no", async () => {
    const agent = await loginAdminAgent();

    const crear = await agent.post("/admin/slots").send({
      fechaHoraInicio: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      fechaHoraFin: new Date(Date.now() + 20 * 86_400_000 + 3_600_000).toISOString(),
      cupoMaximo: 5,
    });
    expect(crear.status).toBe(201);
    const idslot = crear.body.id;
    expect(crear.body.cuposDisponibles).toBe(5);

    const desactivar = await agent.delete(`/admin/slots/${idslot}`);
    expect(desactivar.status).toBe(204);

    const cookie = await loginClienteDePrueba();
    const listaCliente = await request(app).get("/slots").set("Cookie", cookie);
    expect(listaCliente.body.some((s: { id: string }) => s.id === idslot)).toBe(false);

    const listaAdmin = await agent.get("/admin/slots");
    const slotAdmin = listaAdmin.body.find((s: { id: string }) => s.id === idslot);
    expect(slotAdmin.activo).toBe(false);
  });

  it("reducir cupoMaximo por debajo de las reservas actuales se rechaza con error explícito, sin dejar cupos_disponibles negativo (ADR-009)", async () => {
    const agent = await loginAdminAgent();

    const crear = await agent.post("/admin/slots").send({
      fechaHoraInicio: new Date(Date.now() + 21 * 86_400_000).toISOString(),
      fechaHoraFin: new Date(Date.now() + 21 * 86_400_000 + 3_600_000).toISOString(),
      cupoMaximo: 3,
    });
    const idslot = crear.body.id;

    // Toma 2 de los 3 cupos confirmando dos clientes — quedan 2 reservas activas.
    const clientesDePrueba: [string, string][] = [
      ["reserva1@example.com", "121212"],
      ["reserva2@example.com", "343434"],
    ];
    for (const [email, codigo] of clientesDePrueba) {
      const cookie = await loginClienteDePrueba(email, codigo);
      const res = await request(app)
        .post("/confirmaciones")
        .set("Cookie", cookie)
        .send({ items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }], slotId: idslot });
      expect(res.status).toBe(201);
    }

    const rechazado = await agent.patch(`/admin/slots/${idslot}`).send({
      fechaHoraInicio: crear.body.fechaHoraInicio,
      fechaHoraFin: crear.body.fechaHoraFin,
      cupoMaximo: 1,
      activo: true,
    });
    expect(rechazado.status).toBe(400);

    const { rows } = await pool.query<{ cupo_maximo: number; cupos_disponibles: number }>(
      "SELECT cupo_maximo, cupos_disponibles FROM slots WHERE idslot = $1",
      [idslot],
    );
    expect(rows[0]?.cupo_maximo).toBe(3);
    expect(rows[0]?.cupos_disponibles).toBe(1);
    expect(rows[0]!.cupos_disponibles).toBeGreaterThanOrEqual(0);

    const aceptado = await agent.patch(`/admin/slots/${idslot}`).send({
      fechaHoraInicio: crear.body.fechaHoraInicio,
      fechaHoraFin: crear.body.fechaHoraFin,
      cupoMaximo: 2,
      activo: true,
    });
    expect(aceptado.status).toBe(200);
    expect(aceptado.body.cuposDisponibles).toBe(0);
  });

  it("PATCH /admin/slots/:id sobre un id inexistente devuelve 404", async () => {
    const agent = await loginAdminAgent();
    const res = await agent.patch("/admin/slots/00000000-0000-0000-0000-000000000000").send({
      fechaHoraInicio: new Date().toISOString(),
      fechaHoraFin: new Date(Date.now() + 3_600_000).toISOString(),
      cupoMaximo: 5,
      activo: true,
    });
    expect(res.status).toBe(404);
  });
});

// HU-10 (Gate 5, ADR-010): N días de deadline configurable desde admin panel.
describe("slots — admin configuración de deadline (HU-10), integración contra Postgres real", () => {
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

  it("GET/PATCH /admin/configuracion sin sesión de admin devuelven 401", async () => {
    expect((await request(app).get("/admin/configuracion")).status).toBe(401);
    expect((await request(app).patch("/admin/configuracion")).status).toBe(401);
  });

  it("lee y actualiza el N de días de deadline, y lo restaura al valor del fixture", async () => {
    const agent = await loginAdminAgent();

    const antes = await agent.get("/admin/configuracion");
    expect(antes.status).toBe(200);
    expect(antes.body.diasDeadlineEdicion).toBe(FIXTURE_DIAS_DEADLINE_EDICION);

    const patch = await agent.patch("/admin/configuracion").send({ diasDeadlineEdicion: 7 });
    expect(patch.status).toBe(200);
    expect(patch.body.diasDeadlineEdicion).toBe(7);

    // Restaura — configuracion_evento es una fila singleton, no una tabla transaccional
    // (otros archivos de test asumen FIXTURE_DIAS_DEADLINE_EDICION).
    await agent.patch("/admin/configuracion").send({ diasDeadlineEdicion: FIXTURE_DIAS_DEADLINE_EDICION });
  });
});
