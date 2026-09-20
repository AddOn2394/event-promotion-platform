import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import {
  FIXTURE_DIAS_DEADLINE_EDICION,
  limpiarTablasTransaccionales,
  limpiarTodoElFixture,
  seedFixtures,
  type Fixtures,
} from "../test-support/fixtures.js";

const app = createApp();

async function loginClienteDePrueba(email: string, codigo: string): Promise<string> {
  const codigoHash = await bcrypt.hash(codigo, 10);
  await pool.query(
    "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
    [email, "Cliente Edición", codigoHash],
  );
  const res = await request(app).post("/auth/login").send({ email, codigo });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("Login de prueba no devolvió cookie.");
  return cookie;
}

async function crearSlot(inicioSql: string, finSql: string, cupoMaximo = 5): Promise<string> {
  const { rows } = await pool.query<{ idslot: string }>(
    `INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles)
     VALUES (${inicioSql}, ${finSql}, $1, $1) RETURNING idslot`,
    [cupoMaximo],
  );
  const idslot = rows[0]?.idslot;
  if (!idslot) throw new Error("No se pudo crear el slot de prueba.");
  return idslot;
}

async function confirmar(cookie: string, catalogoItemId: string, categoria: string, slotId: string) {
  return request(app)
    .post("/confirmaciones")
    .set("Cookie", cookie)
    .send({ items: [{ catalogoItemId, categoria }], slotId });
}

describe("registration — PATCH /confirmaciones/mia, cancelar y reconfirmar (HU-4/5/6/7), integración contra Postgres real", () => {
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

  it("HU-4: edita la selección dentro de la ventana de edición, recalcula el descuento", async () => {
    const cookie = await loginClienteDePrueba("editar-ok@example.com", "111111");
    await confirmar(cookie, fixtures.servicioBaratoId, "servicio", fixtures.slotId);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({
        items: [
          { catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" },
          { catalogoItemId: fixtures.servicioCaroId, categoria: "servicio" },
        ],
        slotId: fixtures.slotId,
      });

    expect(res.status).toBe(200);
    expect(res.body.subtotalServiciosCents).toBe(170_000);
    expect(res.body.descuentoServiciosPct).toBe(5);

    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM confirmacion_items ci
       JOIN confirmaciones c ON c.idconfirmacion = ci.idconfirmacion
       JOIN invitaciones i ON i.idinvitacion = c.idinvitacion
       WHERE i.email = 'editar-ok@example.com'`,
    );
    expect(Number(rows[0]?.count)).toBe(2);

    // Gate 4 exit criterio: notificación de edición registrada (ADR-024).
    const { rows: notifRows } = await pool.query<{ tipo: string }>(
      `SELECT n.tipo FROM notificaciones n
       JOIN invitaciones i ON i.idinvitacion = n.idinvitacion
       WHERE i.email = 'editar-ok@example.com' ORDER BY n.creada_en DESC LIMIT 1`,
    );
    expect(notifRows[0]?.tipo).toBe("edicion");
  });

  // code-review Gate 6: resolverSeleccion se llamaba antes de abrir la transacción del
  // PATCH, igual que en confirmarAsistencia — un ítem desactivado justo antes de editar
  // podía terminar guardado en la nueva selección. Mismo fix (leer bajo el client de la
  // transacción) aplicado a este endpoint también, aunque el code-review solo citó POST.
  it("HU-4 (code-review, read-then-write): rechaza con 400 si un ítem de la nueva selección fue desactivado", async () => {
    const cookie = await loginClienteDePrueba("editar-item-desactivado@example.com", "222222");
    await confirmar(cookie, fixtures.servicioBaratoId, "servicio", fixtures.slotId);

    const { rows } = await pool.query<{ idcatalogo: string }>(
      "INSERT INTO catalogo_items (nombre, categoria, precio_cents, activo) VALUES ('TEST FIXTURE ítem desactivado edición', 'servicio', 10000, false) RETURNING idcatalogo",
    );
    const itemDesactivadoId = rows[0]?.idcatalogo;
    if (!itemDesactivadoId) throw new Error("No se pudo crear el ítem de prueba.");

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: itemDesactivadoId, categoria: "servicio" }],
        slotId: fixtures.slotId,
      });

    expect(res.status).toBe(400);
  });

  it("HU-4: rechaza con 400 fuera de la ventana de edición (1 segundo después del corte), sin aplicar cambios", async () => {
    // Corte = fecha_hora_inicio - N días. 1 segundo después del corte → fecha_hora_inicio
    // = ahora + N días - 1 segundo.
    const slotFueraDeVentana = await crearSlot(
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' - interval '1 second'`,
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' + interval '2 hours'`,
    );
    const cookie = await loginClienteDePrueba("editar-tarde@example.com", "222222");
    await confirmar(cookie, fixtures.servicioBaratoId, "servicio", slotFueraDeVentana);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotFueraDeVentana });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Ediciones no permitidas");

    const { rows } = await pool.query<{ categoria_snapshot: string }>(
      `SELECT categoria_snapshot FROM confirmacion_items ci
       JOIN confirmaciones c ON c.idconfirmacion = ci.idconfirmacion
       JOIN invitaciones i ON i.idinvitacion = c.idinvitacion
       WHERE i.email = 'editar-tarde@example.com'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.categoria_snapshot).toBe("servicio");
  });

  it("HU-4: permite editar 1 segundo antes del corte exacto", async () => {
    const slotDentroDeVentana = await crearSlot(
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' + interval '1 second'`,
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' + interval '2 hours'`,
    );
    const cookie = await loginClienteDePrueba("editar-justo-antes@example.com", "333333");
    await confirmar(cookie, fixtures.servicioBaratoId, "servicio", slotDentroDeVentana);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotDentroDeVentana });

    expect(res.status).toBe(200);
  });

  it("HU-4: rechaza con 409 si la confirmación ya está cancelada (remite a reconfirmar, HU-7)", async () => {
    const cookie = await loginClienteDePrueba("editar-cancelada@example.com", "444444");
    await confirmar(cookie, fixtures.servicioBaratoId, "servicio", fixtures.slotId);
    await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: fixtures.slotId });

    expect(res.status).toBe(409);
  });

  it("HU-4: rechaza con 404 si la invitación nunca confirmó", async () => {
    const cookie = await loginClienteDePrueba("nunca-confirmo@example.com", "555555");
    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: fixtures.slotId });
    expect(res.status).toBe(404);
  });

  it("HU-5: cambia de slot exitosamente — libera el viejo y toma el nuevo", async () => {
    const slotOrigen = await crearSlot("now() + interval '10 days'", "now() + interval '10 days 2 hours'", 5);
    const slotDestino = await crearSlot("now() + interval '11 days'", "now() + interval '11 days 2 hours'", 5);

    const cookie = await loginClienteDePrueba("cambia-slot@example.com", "666666");
    await confirmar(cookie, fixtures.productoId, "producto", slotOrigen);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotDestino });

    expect(res.status).toBe(200);

    const { rows } = await pool.query<{ idslot: string; cupos_disponibles: number }>(
      "SELECT idslot, cupos_disponibles FROM slots WHERE idslot = ANY($1) ORDER BY idslot",
      [[slotOrigen, slotDestino]],
    );
    const origenRow = rows.find((r) => r.idslot === slotOrigen);
    const destinoRow = rows.find((r) => r.idslot === slotDestino);
    expect(origenRow?.cupos_disponibles).toBe(5);
    expect(destinoRow?.cupos_disponibles).toBe(4);

    // ADR-010: la elegibilidad para editar se evaluó contra el slot ORIGEN, pero la fecha
    // límite que se le muestra al cliente es la del slot vigente tras el cambio (destino) —
    // este assert fija esa decisión para que nadie la "corrija" hacia el slot previo.
    const { rows: limite } = await pool.query<{ limite: Date }>(
      `SELECT s.fecha_hora_inicio - (c.dias_deadline_edicion * interval '1 day') AS limite
       FROM slots s, configuracion_evento c WHERE s.idslot = $1`,
      [slotDestino],
    );
    expect(res.body.editableHastaEn).toBe(limite[0]?.limite.toISOString());
  });

  it("HU-5: rechaza el cambio si el slot destino está lleno — el cliente conserva su slot original intacto", async () => {
    const slotOrigen = await crearSlot("now() + interval '10 days'", "now() + interval '10 days 2 hours'", 5);
    const slotLleno = await crearSlot("now() + interval '11 days'", "now() + interval '11 days 2 hours'", 1);
    await pool.query("UPDATE slots SET cupos_disponibles = 0 WHERE idslot = $1", [slotLleno]);

    const cookie = await loginClienteDePrueba("slot-destino-lleno@example.com", "777777");
    await confirmar(cookie, fixtures.productoId, "producto", slotOrigen);

    const res = await request(app)
      .patch("/confirmaciones/mia")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotLleno });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("cupo");

    const { rows: confirmacionRows } = await pool.query<{ idslot: string }>(
      `SELECT c.idslot FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = 'slot-destino-lleno@example.com'`,
    );
    expect(confirmacionRows[0]?.idslot).toBe(slotOrigen);

    const { rows: slotRows } = await pool.query<{ idslot: string; cupos_disponibles: number }>(
      "SELECT idslot, cupos_disponibles FROM slots WHERE idslot = ANY($1)",
      [[slotOrigen, slotLleno]],
    );
    expect(slotRows.find((r) => r.idslot === slotOrigen)?.cupos_disponibles).toBe(4);
    expect(slotRows.find((r) => r.idslot === slotLleno)?.cupos_disponibles).toBe(0);
  });

  it("HU-5 (ADR-009 punto 3): dos clientes intercambiando de slot en direcciones opuestas al mismo tiempo no deadlockean y ambos terminan bien", async () => {
    // cupo_maximo=2 en ambos (no 1): cada slot tiene un cupo libre independiente del que
    // libera la otra transacción, así que ambos swaps pueden resolverse sin depender de
    // que el otro cliente haya liberado primero — lo que este test prueba es la ausencia
    // de deadlock por el lock ordering determinista (ADR-009 punto 3), no una primitiva de
    // intercambio atómico 1:1 entre dos slots completamente llenos (esa combinación
    // específica no la garantiza el mecanismo: cada liberar+tomar es independiente).
    const slotA = await crearSlot("now() + interval '20 days'", "now() + interval '20 days 2 hours'", 2);
    const slotB = await crearSlot("now() + interval '21 days'", "now() + interval '21 days 2 hours'", 2);

    const cookieCliente1 = await loginClienteDePrueba("swap-1@example.com", "888881");
    const cookieCliente2 = await loginClienteDePrueba("swap-2@example.com", "888882");

    await confirmar(cookieCliente1, fixtures.productoId, "producto", slotA);
    await confirmar(cookieCliente2, fixtures.productoId, "producto", slotB);

    const [res1, res2] = await Promise.all([
      request(app)
        .patch("/confirmaciones/mia")
        .set("Cookie", cookieCliente1)
        .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotB }),
      request(app)
        .patch("/confirmaciones/mia")
        .set("Cookie", cookieCliente2)
        .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotA }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const { rows } = await pool.query<{ idslot: string; cupos_disponibles: number }>(
      "SELECT idslot, cupos_disponibles FROM slots WHERE idslot = ANY($1)",
      [[slotA, slotB]],
    );
    // Cada slot: liberó a su ocupante original (+1) y recibió al del otro slot (-1) — neto
    // sin cambio respecto al cupo tras la primera confirmación (1 disponible de 2).
    expect(rows.find((r) => r.idslot === slotA)?.cupos_disponibles).toBe(1);
    expect(rows.find((r) => r.idslot === slotB)?.cupos_disponibles).toBe(1);
  });

  it("HU-4/5 (code-review, read-then-write): dos PATCH concurrentes de la misma confirmación a slots distintos no dejan cupo fantasma sin liberar", async () => {
    const slotOrigen = await crearSlot("now() + interval '25 days'", "now() + interval '25 days 2 hours'", 5);
    const slotB = await crearSlot("now() + interval '26 days'", "now() + interval '26 days 2 hours'", 5);
    const slotC = await crearSlot("now() + interval '27 days'", "now() + interval '27 days 2 hours'", 5);

    const cookie = await loginClienteDePrueba("patch-concurrente@example.com", "111333");
    await confirmar(cookie, fixtures.productoId, "producto", slotOrigen);

    const [resB, resC] = await Promise.all([
      request(app)
        .patch("/confirmaciones/mia")
        .set("Cookie", cookie)
        .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotB }),
      request(app)
        .patch("/confirmaciones/mia")
        .set("Cookie", cookie)
        .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: slotC }),
    ]);

    // El lock (SELECT ... FOR UPDATE sobre confirmaciones, no solo sobre slots) hace que
    // el segundo PATCH espere al primero y luego re-lea el idslot ya actualizado — ambos
    // pueden tener éxito, ejecutados en serie. El bug que encontró el code-review era
    // justo lo contrario: decidir con el idslot leído ANTES de la transacción, lo que
    // hacía que el segundo PATCH liberara un slot que ya no tenía (dejando el otro con un
    // cupo fantasma, nunca liberado porque la confirmación ya no lo referenciaba).
    expect(resB.status).toBe(200);
    expect(resC.status).toBe(200);

    const { rows: confirmacionRows } = await pool.query<{ idslot: string }>(
      `SELECT c.idslot FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = 'patch-concurrente@example.com'`,
    );
    const idslotFinal = confirmacionRows[0]?.idslot;
    expect([slotB, slotC]).toContain(idslotFinal);

    const { rows: slotRows } = await pool.query<{ idslot: string; cupos_disponibles: number }>(
      "SELECT idslot, cupos_disponibles FROM slots WHERE idslot = ANY($1)",
      [[slotOrigen, slotB, slotC]],
    );
    const cuposPorSlot = new Map(slotRows.map((r) => [r.idslot, r.cupos_disponibles]));
    // slotOrigen: liberado por el PATCH que corrió primero, nunca vuelto a tomar — 5 (cupo_maximo).
    expect(cuposPorSlot.get(slotOrigen)).toBe(5);
    // El slot que NO quedó asignado al final (el que el primer PATCH tomó y el segundo
    // liberó de nuevo al re-leer el estado fresco) también vuelve a 5 — nunca se queda en
    // 4 con un cupo fantasma sin nadie que lo referencie.
    const slotIntermedio = idslotFinal === slotB ? slotC : slotB;
    expect(cuposPorSlot.get(slotIntermedio)).toBe(5);
    expect(cuposPorSlot.get(idslotFinal as string)).toBe(4);
  });

  it("HU-6: cancela dentro de la ventana de edición, libera el cupo, no borra la fila", async () => {
    const cookie = await loginClienteDePrueba("cancelar-ok@example.com", "999991");
    await confirmar(cookie, fixtures.productoId, "producto", fixtures.slotId);

    const { rows: antes } = await pool.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM slots WHERE idslot = $1",
      [fixtures.slotId],
    );

    const res = await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("cancelada");

    const { rows: despues } = await pool.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM slots WHERE idslot = $1",
      [fixtures.slotId],
    );
    expect(despues[0]?.cupos_disponibles).toBe((antes[0]?.cupos_disponibles ?? 0) + 1);

    const { rows: confirmacionRows } = await pool.query<{ estado: string }>(
      `SELECT c.estado FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = 'cancelar-ok@example.com'`,
    );
    expect(confirmacionRows).toHaveLength(1);
    expect(confirmacionRows[0]?.estado).toBe("cancelada");

    // Gate 4 exit criterio: notificación de cancelación registrada (ADR-024).
    const { rows: notifRows } = await pool.query<{ tipo: string }>(
      `SELECT n.tipo FROM notificaciones n
       JOIN invitaciones i ON i.idinvitacion = n.idinvitacion
       WHERE i.email = 'cancelar-ok@example.com' ORDER BY n.creada_en DESC LIMIT 1`,
    );
    expect(notifRows[0]?.tipo).toBe("cancelacion");
  });

  it("HU-6: rechaza con 400 fuera de la ventana de edición", async () => {
    const slotFueraDeVentana = await crearSlot(
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' - interval '1 second'`,
      `now() + interval '${FIXTURE_DIAS_DEADLINE_EDICION} days' + interval '2 hours'`,
    );
    const cookie = await loginClienteDePrueba("cancelar-tarde@example.com", "999992");
    await confirmar(cookie, fixtures.productoId, "producto", slotFueraDeVentana);

    const res = await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);
    expect(res.status).toBe(400);
  });

  it("HU-6: rechaza con 409 si ya estaba cancelada", async () => {
    const cookie = await loginClienteDePrueba("cancelar-dos-veces@example.com", "999993");
    await confirmar(cookie, fixtures.productoId, "producto", fixtures.slotId);
    await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);

    const res = await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);
    expect(res.status).toBe(409);
  });

  it("HU-7: reconfirma tras cancelar reutilizando la misma fila, con cupo fresco", async () => {
    const cookie = await loginClienteDePrueba("reconfirmar-ok@example.com", "999994");
    const primera = await confirmar(cookie, fixtures.productoId, "producto", fixtures.slotId);
    const { rows: idAntes } = await pool.query<{ idconfirmacion: string }>(
      `SELECT c.idconfirmacion FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = 'reconfirmar-ok@example.com'`,
    );

    await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookie);
    const { rows: cupoTrasCancelar } = await pool.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM slots WHERE idslot = $1",
      [fixtures.slotId],
    );

    const reconfirmacion = await confirmar(cookie, fixtures.servicioBaratoId, "servicio", fixtures.slotId);
    expect(reconfirmacion.status).toBe(201);

    const { rows: idDespues } = await pool.query<{ idconfirmacion: string; estado: string }>(
      `SELECT c.idconfirmacion, c.estado FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = 'reconfirmar-ok@example.com'`,
    );
    expect(idDespues[0]?.idconfirmacion).toBe(idAntes[0]?.idconfirmacion);
    expect(idDespues[0]?.estado).toBe("confirmada");
    expect(primera.status).toBe(201);

    const { rows: cupoTrasReconfirmar } = await pool.query<{ cupos_disponibles: number }>(
      "SELECT cupos_disponibles FROM slots WHERE idslot = $1",
      [fixtures.slotId],
    );
    expect(cupoTrasReconfirmar[0]?.cupos_disponibles).toBe((cupoTrasCancelar[0]?.cupos_disponibles ?? 0) - 1);

    const { rows: itemsRows } = await pool.query<{ idcatalogo: string }>(
      "SELECT idcatalogo FROM confirmacion_items WHERE idconfirmacion = $1",
      [idDespues[0]?.idconfirmacion],
    );
    expect(itemsRows).toHaveLength(1);
    expect(itemsRows[0]?.idcatalogo).toBe(fixtures.servicioBaratoId);

    // Gate 4 exit criterio: notificación de reconfirmación registrada (ADR-024).
    const { rows: notifRows } = await pool.query<{ tipo: string }>(
      `SELECT n.tipo FROM notificaciones n
       JOIN invitaciones i ON i.idinvitacion = n.idinvitacion
       WHERE i.email = 'reconfirmar-ok@example.com' ORDER BY n.creada_en DESC LIMIT 1`,
    );
    expect(notifRows[0]?.tipo).toBe("reconfirmacion");
  });

  it("HU-7: si el slot original ya no tiene cupo al reconfirmar, rechaza y el cliente debe elegir otro", async () => {
    const slotUnico = await crearSlot("now() + interval '15 days'", "now() + interval '15 days 2 hours'", 1);
    const cookieA = await loginClienteDePrueba("reconfirmar-sin-cupo-a@example.com", "999995");
    const cookieB = await loginClienteDePrueba("reconfirmar-sin-cupo-b@example.com", "999996");

    await confirmar(cookieA, fixtures.productoId, "producto", slotUnico);
    await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookieA);
    // B toma el único cupo que A liberó.
    const tomaB = await confirmar(cookieB, fixtures.productoId, "producto", slotUnico);
    expect(tomaB.status).toBe(201);

    const reconfirmaA = await confirmar(cookieA, fixtures.productoId, "producto", slotUnico);
    expect(reconfirmaA.status).toBe(400);
    expect(reconfirmaA.body.error).toContain("cupo");
  });
});
