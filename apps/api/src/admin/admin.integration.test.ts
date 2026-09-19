import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { pool } from "../db/pool.js";
import { signClienteToken } from "../shared/jwt.js";
import {
  FIXTURE_ADMIN_EMAIL,
  FIXTURE_ADMIN_PASSWORD,
  limpiarTablasTransaccionales,
  limpiarTodoElFixture,
  seedFixtures,
  type Fixtures,
} from "../test-support/fixtures.js";

const app = createApp();

async function loginAdminAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/admin/auth/login").send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
  return agent;
}

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

// ADR-022 (arrastrado de Gate 4 a Gate 5): "Gate 4 (código de acceso) y Gate 5 (login
// admin)" — mismo mecanismo que /auth/login, pero un contador de intentos separado
// (scope='admin') para que un ataque contra el email del admin en /auth/login no bloquee
// /admin/auth/login (y viceversa).
describe("admin — rate limiting de login (ADR-022 Gate 5), integración contra Postgres real", () => {
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

  it("bloquea con 429 tras 5 intentos fallidos en 15 minutos", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/admin/auth/login")
        .send({ email: FIXTURE_ADMIN_EMAIL, password: "incorrecta" });
      expect(res.status).toBe(401);
    }
    const bloqueado = await request(app)
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
    expect(bloqueado.status).toBe(429);
  });

  it("no comparte contador con /auth/login — spamear el email del admin ahí no bloquea /admin/auth/login", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: FIXTURE_ADMIN_EMAIL, codigo: "000000" });
      expect(res.status).toBe(401);
    }
    const res = await request(app)
      .post("/admin/auth/login")
      .send({ email: FIXTURE_ADMIN_EMAIL, password: FIXTURE_ADMIN_PASSWORD });
    expect(res.status).toBe(200);
  });
});

// HU-11 (ADR-026): reenviar genera un código nuevo, invalida el anterior; JWTs ya emitidos
// siguen válidos hasta expirar. HU-11 dice "mismo botón/pantalla que HU-1" — necesita un
// listado (GET /admin/invitaciones) sobre el que colgar el botón.
describe("admin — listar invitaciones y reenviar código (HU-11), integración contra Postgres real", () => {
  const EMAIL = "reenvio@example.com";
  const CODIGO_VIEJO = "555666";

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

  async function crearInvitacionDePrueba(): Promise<string> {
    const codigoHash = await bcrypt.hash(CODIGO_VIEJO, 10);
    const { rows } = await pool.query<{ idinvitacion: string }>(
      "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3) RETURNING idinvitacion",
      [EMAIL, "Cliente Reenvío", codigoHash],
    );
    const idinvitacion = rows[0]?.idinvitacion;
    if (!idinvitacion) throw new Error("No se pudo crear la invitación de prueba.");
    return idinvitacion;
  }

  it("GET /admin/invitaciones sin sesión de admin devuelve 401", async () => {
    const res = await request(app).get("/admin/invitaciones");
    expect(res.status).toBe(401);
  });

  it("GET /admin/invitaciones lista la invitación como sin_respuesta antes del primer login", async () => {
    await crearInvitacionDePrueba();
    const agent = await loginAdminAgent();
    const res = await agent.get("/admin/invitaciones");
    expect(res.status).toBe(200);
    const invitacion = res.body.find((i: { email: string }) => i.email === EMAIL);
    expect(invitacion.estado).toBe("sin_respuesta");
  });

  it("reenviar invalida el código anterior para un login nuevo, pero un JWT ya emitido sigue funcionando", async () => {
    const idinvitacion = await crearInvitacionDePrueba();

    // JWT "ya emitido antes del reenvío" — se firma directo en vez de depender de conocer
    // el código nuevo (que solo se envía por email), para aislar exactamente lo que HU-11
    // pide probar: invalidar el código no revoca sesiones ya firmadas.
    const jwtPrevio = signClienteToken({ idinvitacion, email: EMAIL });

    const agent = await loginAdminAgent();
    const resReenviar = await agent.post(`/admin/invitaciones/${idinvitacion}/reenviar`);
    expect(resReenviar.status).toBe(200);

    const loginConCodigoViejo = await request(app).post("/auth/login").send({ email: EMAIL, codigo: CODIGO_VIEJO });
    expect(loginConCodigoViejo.status).toBe(401);

    const catalogoConJwtPrevio = await request(app)
      .get("/catalogo")
      .set("Cookie", `cliente_token=${jwtPrevio}`);
    expect(catalogoConJwtPrevio.status).toBe(200);
  });

  it("reenviar limpia el bloqueo de rate limiting del cliente (ADR-022) — un login con el código nuevo no queda 429", async () => {
    const idinvitacion = await crearInvitacionDePrueba();

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/auth/login").send({ email: EMAIL, codigo: "000000" });
      expect(res.status).toBe(401);
    }
    const bloqueado = await request(app).post("/auth/login").send({ email: EMAIL, codigo: CODIGO_VIEJO });
    expect(bloqueado.status).toBe(429);

    const agent = await loginAdminAgent();
    await agent.post(`/admin/invitaciones/${idinvitacion}/reenviar`);

    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*) FROM intentos_fallidos_login WHERE email = $1 AND scope = 'cliente'",
      [EMAIL],
    );
    expect(rows[0]?.count).toBe("0");
  });

  it("reenviar una invitación inexistente devuelve 404", async () => {
    const agent = await loginAdminAgent();
    const res = await agent.post("/admin/invitaciones/00000000-0000-0000-0000-000000000000/reenviar");
    expect(res.status).toBe(404);
  });
});

// HU-8 (ADR-024): los 4 estados nunca se agrupan entre sí, y el CSV es el snapshot
// congelado (ADR-006) — nunca un recálculo contra catálogo/config vigente.
describe("admin — listar y exportar confirmaciones (HU-8), integración contra Postgres real", () => {
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

  async function loginClienteDePrueba(email: string, codigo: string): Promise<string> {
    const codigoHash = await bcrypt.hash(codigo, 10);
    await pool.query(
      "INSERT INTO invitaciones (email, nombre_cliente, codigo_acceso_hash) VALUES ($1, $2, $3)",
      [email, "Cliente HU-8", codigoHash],
    );
    const res = await request(app).post("/auth/login").send({ email, codigo });
    const cookie = res.headers["set-cookie"]?.[0];
    if (!cookie) throw new Error("Login de prueba no devolvió cookie.");
    return cookie;
  }

  it("distingue confirmada / cancelada / sin_respuesta / rebotada sin agruparlas", async () => {
    // confirmada
    const cookieConfirmada = await loginClienteDePrueba("confirmada@example.com", "111111");
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookieConfirmada)
      .send({ items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }], slotId: fixtures.slotId });

    // cancelada
    const cookieCancelada = await loginClienteDePrueba("cancelada@example.com", "222222");
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookieCancelada)
      .send({ items: [{ catalogoItemId: fixtures.productoId, categoria: "producto" }], slotId: fixtures.slotId });
    await request(app).post("/confirmaciones/mia/cancelar").set("Cookie", cookieCancelada);

    // sin_respuesta: invitación sin login siquiera
    await pool.query(
      "INSERT INTO invitaciones (email, codigo_acceso_hash) VALUES ($1, $2)",
      ["sinrespuesta@example.com", await bcrypt.hash("333333", 10)],
    );

    // rebotada: invitación con notificación tipo=invitacion en estado_envio='rebotado'
    const { rows: rebotadaRows } = await pool.query<{ idinvitacion: string }>(
      "INSERT INTO invitaciones (email, codigo_acceso_hash) VALUES ($1, $2) RETURNING idinvitacion",
      ["rebotada@example.com", await bcrypt.hash("444444", 10)],
    );
    await pool.query(
      "INSERT INTO notificaciones (idinvitacion, tipo, estado_envio) VALUES ($1, 'invitacion', 'rebotado')",
      [rebotadaRows[0]?.idinvitacion],
    );

    const agent = await loginAdminAgent();
    const res = await agent.get("/admin/confirmaciones");
    expect(res.status).toBe(200);

    const porEmail = new Map<string, string>(res.body.map((c: { email: string; estado: string }) => [c.email, c.estado]));
    expect(porEmail.get("confirmada@example.com")).toBe("confirmada");
    expect(porEmail.get("cancelada@example.com")).toBe("cancelada");
    expect(porEmail.get("sinrespuesta@example.com")).toBe("sin_respuesta");
    expect(porEmail.get("rebotada@example.com")).toBe("rebotada");
  });

  it("filtra por ?estado=", async () => {
    await pool.query(
      "INSERT INTO invitaciones (email, codigo_acceso_hash) VALUES ($1, $2)",
      ["filtro-sin-respuesta@example.com", await bcrypt.hash("777777", 10)],
    );
    const agent = await loginAdminAgent();
    const res = await agent.get("/admin/confirmaciones?estado=sin_respuesta");
    expect(res.status).toBe(200);
    expect(res.body.every((c: { estado: string }) => c.estado === "sin_respuesta")).toBe(true);
    expect(res.body.some((c: { email: string }) => c.email === "filtro-sin-respuesta@example.com")).toBe(true);
  });

  it("GET /admin/confirmaciones/export.csv devuelve las columnas fijas de ADR-013 y el snapshot, no un recálculo", async () => {
    const cookie = await loginClienteDePrueba("csv@example.com", "888888");
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }], slotId: fixtures.slotId });

    const agent = await loginAdminAgent();
    const res = await agent.get("/admin/confirmaciones/export.csv");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain(
      "nombre,email,slot,servicios,productos,subtotal servicios,% descuento servicios,subtotal productos,% descuento productos,total,estado",
    );
    expect(res.text).toContain("csv@example.com");
    expect(res.text).toContain("TEST FIXTURE servicio barato");
  });

  // code-review Gate 6: csvEscapar solo neutralizaba =/+/-/@ al inicio del valor, pero un
  // tab o un retorno de carro también dispara una fórmula en algunos importadores de hoja
  // de cálculo (lo strippean antes de parsear la celda, dejando expuesto el caracter que
  // sigue). nombreCliente es el único campo de texto libre del cliente que termina en el CSV.
  it("escapa un nombreCliente con tab+fórmula al exportar el CSV (mitigación de CSV injection, OWASP)", async () => {
    const cookie = await loginClienteDePrueba("csv-injection@example.com", "777777");
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({
        items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }],
        slotId: fixtures.slotId,
        nombreCliente: "\t=1+1",
      });

    const agent = await loginAdminAgent();
    const res = await agent.get("/admin/confirmaciones/export.csv");

    expect(res.status).toBe(200);
    expect(res.text).toContain("'\t=1+1,csv-injection@example.com");
    expect(res.text).not.toContain("\n\t=1+1,csv-injection@example.com");
  });

  it("cambiar configuracion_descuento no recalcula confirmaciones ya hechas — el snapshot no cambia", async () => {
    const cookie = await loginClienteDePrueba("snapshot@example.com", "999999");
    await request(app)
      .post("/confirmaciones")
      .set("Cookie", cookie)
      .send({ items: [{ catalogoItemId: fixtures.servicioBaratoId, categoria: "servicio" }], slotId: fixtures.slotId });

    const { rows: antes } = await pool.query(
      "SELECT min_servicios_3pct_snapshot, subtotal_servicios_cents, descuento_servicios_pct FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = $1",
      ["snapshot@example.com"],
    );

    const agent = await loginAdminAgent();
    const patchRes = await agent.patch("/admin/configuracion/descuento").send({
      minServicios3pct: 99,
      minServicios5pct: 99,
      montoMinimo5pctServiciosCents: 999_999,
      minProductos3pct: 99,
      minProductos5pct: 99,
    });
    expect(patchRes.status).toBe(200);

    const { rows: despues } = await pool.query(
      "SELECT min_servicios_3pct_snapshot, subtotal_servicios_cents, descuento_servicios_pct FROM confirmaciones c JOIN invitaciones i ON i.idinvitacion = c.idinvitacion WHERE i.email = $1",
      ["snapshot@example.com"],
    );

    expect(despues[0]).toEqual(antes[0]);

    // Restaura los valores del fixture (test-support/fixtures.ts) — configuracion_descuento
    // es una fila singleton, no una tabla transaccional que limpiarTablasTransaccionales
    // resetee entre tests, y otros archivos de test (catalog.integration.test.ts) asumen
    // estos valores exactos.
    await agent.patch("/admin/configuracion/descuento").send({
      minServicios3pct: 2,
      minServicios5pct: 2,
      montoMinimo5pctServiciosCents: 150_000,
      minProductos3pct: 3,
      minProductos5pct: 5,
    });
  });

  it("PATCH /admin/configuracion/descuento rechaza un umbral de 5% más débil que 3% con mensaje legible", async () => {
    const agent = await loginAdminAgent();
    const res = await agent.patch("/admin/configuracion/descuento").send({
      minServicios3pct: 5,
      minServicios5pct: 2,
      montoMinimo5pctServiciosCents: 150_000,
      minProductos3pct: 3,
      minProductos5pct: 5,
    });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).not.toBe("undefined");
  });
});
