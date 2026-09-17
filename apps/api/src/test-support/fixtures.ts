import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";

export const FIXTURE_ADMIN_EMAIL = "admin-test@example.com";
export const FIXTURE_ADMIN_PASSWORD = "password-test-123";

export type Fixtures = {
  servicioBaratoId: string;
  servicioCaroId: string;
  productoId: string;
  slotId: string;
};

// Umbrales reales del PDF (ADR-023) — mismos valores que apps/api/src/db/seed.ts.
async function asegurarConfiguracionDescuento(): Promise<void> {
  const { rows } = await pool.query("SELECT 1 FROM configuracion_descuento");
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO configuracion_descuento
         (min_servicios_3pct, min_servicios_5pct, monto_minimo_5pct_servicios_cents, min_productos_3pct, min_productos_5pct)
       VALUES (2, 2, 150000, 3, 5)`,
    );
  }
}

export async function seedFixtures(): Promise<Fixtures> {
  const passwordHash = await bcrypt.hash(FIXTURE_ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash`,
    [FIXTURE_ADMIN_EMAIL, passwordHash],
  );

  await asegurarConfiguracionDescuento();

  const { rows: servicioBaratoRows } = await pool.query<{ idcatalogo: string }>(
    "INSERT INTO catalogo_items (nombre, categoria, precio_cents) VALUES ('TEST FIXTURE servicio barato', 'servicio', 50000) RETURNING idcatalogo",
  );
  const { rows: servicioCaroRows } = await pool.query<{ idcatalogo: string }>(
    "INSERT INTO catalogo_items (nombre, categoria, precio_cents) VALUES ('TEST FIXTURE servicio caro', 'servicio', 120000) RETURNING idcatalogo",
  );
  const { rows: productoRows } = await pool.query<{ idcatalogo: string }>(
    "INSERT INTO catalogo_items (nombre, categoria, precio_cents) VALUES ('TEST FIXTURE producto', 'producto', 30000) RETURNING idcatalogo",
  );
  const { rows: slotRows } = await pool.query<{ idslot: string }>(
    "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo) VALUES (now() + interval '10 days', now() + interval '10 days 2 hours', 10) RETURNING idslot",
  );

  const servicioBarato = servicioBaratoRows[0];
  const servicioCaro = servicioCaroRows[0];
  const producto = productoRows[0];
  const slot = slotRows[0];
  if (!servicioBarato || !servicioCaro || !producto || !slot) {
    throw new Error("No se pudieron crear los fixtures de test.");
  }

  return {
    servicioBaratoId: servicioBarato.idcatalogo,
    servicioCaroId: servicioCaro.idcatalogo,
    productoId: producto.idcatalogo,
    slotId: slot.idslot,
  };
}

// Tablas transaccionales: se limpian entre tests dentro del mismo archivo.
export async function limpiarTablasTransaccionales(): Promise<void> {
  await pool.query("TRUNCATE confirmaciones, confirmacion_items, notificaciones, invitaciones CASCADE");
}

// Limpieza completa: se corre en beforeAll/afterAll de cada archivo — es una DB de test
// dedicada (ver create-test-db.ts), no la de desarrollo, así que es seguro vaciarla entera.
export async function limpiarTodoElFixture(): Promise<void> {
  await limpiarTablasTransaccionales();
  await pool.query("DELETE FROM catalogo_items WHERE nombre LIKE 'TEST FIXTURE%'");
  await pool.query("DELETE FROM slots");
  await pool.query("DELETE FROM admin_users WHERE email = $1", [FIXTURE_ADMIN_EMAIL]);
}
