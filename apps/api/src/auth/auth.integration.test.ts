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

  it("bloquea con 429 tras 5 intentos fallidos en 15 minutos, por email sin importar el código probado (ADR-022)", async () => {
    await crearInvitacionDePrueba();

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: "000000" });
      expect(res.status).toBe(401);
    }

    const bloqueado = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
    expect(bloqueado.status).toBe(429);

    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM intentos_fallidos_login WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    expect(Number(rows[0]?.count)).toBe(5);
  });

  it("un login exitoso limpia los intentos fallidos previos de ese email", async () => {
    await crearInvitacionDePrueba();

    await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: "000000" });
    await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: "000000" });

    const exitoso = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
    expect(exitoso.status).toBe(200);

    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM intentos_fallidos_login WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    expect(Number(rows[0]?.count)).toBe(0);
  });

  it("permite el login aunque el slot de la confirmación de esa invitación ya haya pasado, mientras el evento siga vigente (ADR-011, párrafo 'Vigencia del código': el slot individual nunca gobierna la sesión)", async () => {
    await crearInvitacionDePrueba();
    const { rows: invitacionRows } = await pool.query<{ idinvitacion: string }>(
      "SELECT idinvitacion FROM invitaciones WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    const idinvitacion = invitacionRows[0]?.idinvitacion;
    if (!idinvitacion) throw new Error("Fixture de invitación no encontrada.");

    // El slot de la propia confirmación ya pasó (ej. cliente asistió el día 1 de un evento
    // de 3 días), pero el fixture del evento (fixtures.slotId, sembrado por seedFixtures en
    // otros archivos — aquí no hay fixture de catálogo, así que se crea uno explícito en el
    // futuro) sigue activo, así que el login debe seguir funcionando.
    const { rows: slotPasadoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() - interval '5 days', now() - interval '5 days' + interval '2 hours', 10, 10) RETURNING idslot",
    );
    const idslotPasado = slotPasadoRows[0]?.idslot;
    if (!idslotPasado) throw new Error("No se pudo crear el slot de prueba en el pasado.");
    const { rows: slotFuturoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() + interval '5 days', now() + interval '5 days' + interval '2 hours', 10, 10) RETURNING idslot",
    );
    if (!slotFuturoRows[0]) throw new Error("No se pudo crear el slot de prueba futuro.");

    await pool.query(
      `INSERT INTO confirmaciones (
         idinvitacion, idslot, estado,
         subtotal_servicios_cents, descuento_servicios_pct,
         subtotal_productos_cents, descuento_productos_pct, total_cents,
         min_servicios_3pct_snapshot, min_servicios_5pct_snapshot,
         monto_minimo_5pct_servicios_cents_snapshot,
         min_productos_3pct_snapshot, min_productos_5pct_snapshot
       ) VALUES ($1, $2, 'confirmada', 0, 0, 0, 0, 0, 2, 2, 150000, 3, 5)`,
      [idinvitacion, idslotPasado],
    );

    const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
    expect(res.status).toBe(200);
    // Los slots creados aquí no se borran (la confirmación tiene FK hacia idslotPasado) —
    // limpiarTablasTransaccionales (afterEach) libera la confirmación vía TRUNCATE CASCADE;
    // los slots sobrantes no afectan a los demás tests de este archivo.
  });

  it("rechaza el login de una invitación sin confirmación cuando ya pasó el evento completo (ADR-011, MAX de slots activos)", async () => {
    await crearInvitacionDePrueba();

    // Fin de evento derivado de MAX(fecha_hora_fin) de slots activos (decidido en Gate 4) —
    // se desactiva el slot fixture (futuro) y se deja solo un slot activo ya pasado, para
    // que el evento completo quede en el pasado. Se restaura al terminar para no afectar
    // otros tests del mismo archivo.
    await pool.query("UPDATE slots SET activo = false");
    const { rows: slotPasadoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() - interval '5 days', now() - interval '5 days' + interval '2 hours', 10, 10) RETURNING idslot",
    );

    try {
      const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
      expect(res.status).toBe(401);
    } finally {
      await pool.query("DELETE FROM slots WHERE idslot = $1", [slotPasadoRows[0]?.idslot]);
      await pool.query("UPDATE slots SET activo = true");
    }
  });

  it("code-review Gate 6: un slot futuro desactivado con una confirmación activa no adelanta el fin del evento", async () => {
    await crearInvitacionDePrueba();
    const { rows: invitacionRows } = await pool.query<{ idinvitacion: string }>(
      "SELECT idinvitacion FROM invitaciones WHERE email = $1",
      [EMAIL_CLIENTE],
    );
    const idinvitacion = invitacionRows[0]?.idinvitacion;
    if (!idinvitacion) throw new Error("Fixture de invitación no encontrada.");

    // El admin puede desactivar un slot aunque tenga reservas (desactivarSlot no lo
    // bloquea) — si ese slot futuro queda excluido del cálculo de fin de evento, el cliente
    // con una confirmación vigente ahí quedaría con el código expirado sin que su horario
    // real haya pasado. obtenerFinDelEvento debe seguir contándolo mientras tenga una
    // confirmación 'confirmada' apuntándole. Se desactivan TODOS los slots y se deja un
    // único slot activo ya pasado (mismo patrón que el test de arriba) para que, sin el
    // slot futuro confirmado, el evento se considere terminado — si el fix no cuenta ese
    // slot futuro, este test debe fallar con 401, no dar un 200 accidental por falta total
    // de slots activos (ver el `if (!finEvento) return false` de codigoExpirado).
    await pool.query("UPDATE slots SET activo = false");
    const { rows: slotPasadoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() - interval '5 days', now() - interval '5 days' + interval '2 hours', 10, 10) RETURNING idslot",
    );
    const { rows: slotFuturoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles, activo) VALUES (now() + interval '5 days', now() + interval '5 days' + interval '2 hours', 10, 9, false) RETURNING idslot",
    );
    const idslotFuturo = slotFuturoRows[0]?.idslot;
    if (!idslotFuturo) throw new Error("No se pudo crear el slot de prueba futuro.");

    await pool.query(
      `INSERT INTO confirmaciones (
         idinvitacion, idslot, estado,
         subtotal_servicios_cents, descuento_servicios_pct,
         subtotal_productos_cents, descuento_productos_pct, total_cents,
         min_servicios_3pct_snapshot, min_servicios_5pct_snapshot,
         monto_minimo_5pct_servicios_cents_snapshot,
         min_productos_3pct_snapshot, min_productos_5pct_snapshot
       ) VALUES ($1, $2, 'confirmada', 0, 0, 0, 0, 0, 2, 2, 150000, 3, 5)`,
      [idinvitacion, idslotFuturo],
    );

    try {
      const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
      expect(res.status).toBe(200);
    } finally {
      await pool.query("DELETE FROM slots WHERE idslot = $1", [slotPasadoRows[0]?.idslot]);
      await pool.query("UPDATE slots SET activo = true");
    }
  });

  it("ADR-028: email+código correctos pero evento terminado no cuenta como intento fallido hacia el rate limiting", async () => {
    await crearInvitacionDePrueba();

    await pool.query("UPDATE slots SET activo = false");
    const { rows: slotPasadoRows } = await pool.query<{ idslot: string }>(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES (now() - interval '5 days', now() - interval '5 days' + interval '2 hours', 10, 10) RETURNING idslot",
    );

    try {
      const res = await request(app).post("/auth/login").send({ email: EMAIL_CLIENTE, codigo: CODIGO });
      expect(res.status).toBe(401);

      const { rows } = await pool.query<{ count: string }>(
        "SELECT COUNT(*) FROM intentos_fallidos_login WHERE email = $1 AND scope = 'cliente'",
        [EMAIL_CLIENTE],
      );
      expect(rows[0]?.count).toBe("0");
    } finally {
      await pool.query("DELETE FROM slots WHERE idslot = $1", [slotPasadoRows[0]?.idslot]);
      await pool.query("UPDATE slots SET activo = true");
    }
  });
});
