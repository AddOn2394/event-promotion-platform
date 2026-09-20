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

async function loginClienteDePrueba(email = EMAIL_CLIENTE, codigo = CODIGO): Promise<string> {
  const codigoHash = await bcrypt.hash(codigo, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [email, "Cliente Registro", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email, codigo });
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

  // code-review Gate 6: resolverSeleccion/buscarSlotActivoPorId se leían antes de abrir la
  // transacción y nunca se re-verificaban al escribir — un ítem/slot desactivado por el
  // admin justo antes del write terminaba confirmándose igual. Corregido leyendo ambos bajo
  // el client de la transacción (slot) y con `activo = true` en el mismo UPDATE atómico que
  // toma el cupo (nunca un SELECT previo separado) — este test cubre el caso "existe pero ya
  // no está activo", que antes solo se probaba para IDs inexistentes.
  it("rechaza un slot que existe pero fue desactivado, no solo uno inexistente", async () => {
    const cookie = await loginClienteDePrueba();
    const { rows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo) VALUES (now() + interval '12 days', now() + interval '12 days 1 hour', 5, 5, false) RETURNING idslot",
    );
    const slotDesactivadoId = rows[0]?.idslot;
    if (!slotDesactivadoId) throw new Error("No se pudo crear el slot de prueba.");

    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }],
        slotId: slotDesactivadoId,
      });
    expect(res.status).toBe(400);
  });

  it("rechaza un ítem de catálogo que existe pero fue desactivado, no solo uno inexistente", async () => {
    const cookie = await loginClienteDePrueba();
    const { rows } = await pool.query<{ idcatalogo: string }>(
      "INSERT INTO catalogo_items (nombre, categoria, precio_cents, activo) VALUES ('TEST FIXTURE ítem desactivado', 'servicio', 10000, false) RETURNING idcatalogo",
    );
    const itemDesactivadoId = rows[0]?.idcatalogo;
    if (!itemDesactivadoId) throw new Error("No se pudo crear el ítem de prueba.");

    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: itemDesactivadoId, categoria: "servicio" }],
        slotId: fixtures.slotId,
      });
    expect(res.status).toBe(400);
  });

  it("devuelve editableHastaEn = inicio del slot − N días (ADR-010), igual en POST y en GET /mia, y la notificación queda enviada", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }],
        slotId: fixtures.slotId,
      });
    expect(res.status).toBe(201);

    const { rows } = await pool.query<{ limite: Date }>(
      `SELECT s.fecha_hora_inicio - (c.dias_deadline_edicion * interval '1 day') AS limite
       FROM slots s, configuracion_evento c WHERE s.idslot = $1`,
      [fixtures.slotId],
    );
    const limiteEsperado = rows[0]?.limite.toISOString();
    expect(res.body.editableHastaEn).toBe(limiteEsperado);

    const { rows: slotRows } = await pool.query<{ fecha_hora_inicio: Date; fecha_hora_fin: Date }>(
      "SELECT fecha_hora_inicio, fecha_hora_fin FROM slots WHERE idslot = $1",
      [fixtures.slotId],
    );
    expect(res.body.horario).toEqual({
      fechaHoraInicio: slotRows[0]?.fecha_hora_inicio.toISOString(),
      fechaHoraFin: slotRows[0]?.fecha_hora_fin.toISOString(),
    });

    const mia = await request(app).get("/confirmaciones/mia").set("Cookie", cookie);
    expect(mia.body.editableHastaEn).toBe(limiteEsperado);

    // Con NODE_ENV=test el mailer simula un envío exitoso (mailer.ts) — 'enviado', no 'fallido'.
    const { rows: notif } = await pool.query<{ estado_envio: string }>(
      `SELECT n.estado_envio FROM notificaciones n JOIN invitaciones i ON i.idinvitacion = n.idinvitacion
       WHERE i.email = $1 AND n.tipo = 'confirmacion'`,
      [EMAIL_CLIENTE],
    );
    expect(notif[0]?.estado_envio).toBe("enviado");
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

  it("deduplica un catalogoItemId repetido en el request — no lo cobra ni lo inserta dos veces", async () => {
    const cookie = await loginClienteDePrueba();
    const res = await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [
          { catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" },
          { catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" },
        ],
        slotId: fixtures.slotId,
      });

    expect(res.status).toBe(201);
    // servicioBarato = 50000, sin descuento (1 solo item real, no cruza ningún umbral) — si
    // se hubiera duplicado, subtotal sería 100000 y podría cruzar el umbral de 5%.
    expect(res.body.subtotalServiciosCents).toBe(50_000);
    expect(res.body.descuentoServiciosPct).toBe(0);

    const { rows: itemsGuardados } = await pool.query<{ idcatalogo: string }>(
      "SELECT ci.idcatalogo FROM confirmacion_items ci JOIN confirmaciones c ON c.idconfirmacion = ci.idconfirmacion JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = $1",
      [EMAIL_CLIENTE],
    );
    expect(itemsGuardados).toHaveLength(1);
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

  it("cupo atómico (ADR-009): dos confirmaciones concurrentes contra un slot con cupo=1 dejan exactamente una 201 y una 400", async () => {
    const { rows: slotRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() + interval '11 days', now() + interval '11 days 1 hour', 1, 1) RETURNING idslot",
    );
    const slotUnicoId = slotRows[0]?.idslot;
    if (!slotUnicoId) throw new Error("No se pudo crear el slot de prueba.");

    const [cookieA, cookieB] = await Promise.all([
      loginClienteDePrueba("cliente-concurrencia-a@example.com", "111222"),
      loginClienteDePrueba("cliente-concurrencia-b@example.com", "222333"),
    ]);

    const body = {
      items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }],
      slotId: slotUnicoId,
    };

    const [resA, resB] = await Promise.all([
      request(app).post("/confirmaciones").set("Cookie", cookieA).send(body),
      request(app).post("/confirmaciones").set("Cookie", cookieB).send(body),
    ]);

    const estados = [resA.status, resB.status].sort();
    expect(estados).toEqual([201, 400]);

    const resFallida = resA.status === 400 ? resA : resB;
    expect(resFallida.body.error).toContain("cupo");

    const { rows: slotFinal } = await pool.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM slots WHERE idslot = $1",
      [slotUnicoId],
    );
    expect(slotFinal[0]?.cupos_disponibles).toBe(0);
  });
});
