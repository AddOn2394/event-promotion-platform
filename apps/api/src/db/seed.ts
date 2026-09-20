import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { sembrarCatalogo } from "./seed-catalogo.js";

// Seed idempotente para Gate 2 (spec/PLAN_DESARROLLO.md). Catálogo y slots son datos
// iniciales de ejemplo — pendiente de reemplazar con el listado real de servicios/productos
// y horarios del evento (ver spec/todo.md). Los ítems del catálogo viven en
// seed-catalogo.ts, que también expone la carga aditiva (`db:seed:catalogo`). configuracion_descuento sí usa los valores
// reales del PDF (ADR-023), no son provisionales.

const SLOTS_INICIALES = [
  { inicio: "2026-11-10T14:00:00Z", fin: "2026-11-10T16:00:00Z", cupoMaximo: 30 },
  { inicio: "2026-11-11T10:00:00Z", fin: "2026-11-11T12:00:00Z", cupoMaximo: 30 },
  { inicio: "2026-11-12T16:00:00Z", fin: "2026-11-12T18:00:00Z", cupoMaximo: 30 },
] as const;

// Valores reales del PDF (ADR-023): 2 servicios/3%, 2 servicios+Q1,500/5%,
// 3 productos/3%, 5 productos/5%.
const CONFIGURACION_DESCUENTO = {
  minServicios3pct: 2,
  minServicios5pct: 2,
  montoMinimo5pctServiciosCents: 150_000,
  minProductos3pct: 3,
  minProductos5pct: 5,
};

// Como el resto de las tablas: si ya tiene datos, no se toca. Volver a correr `db:seed` (p. ej.
// para agregar slots) nunca debe reinsertar ítems de ejemplo que el negocio ya renombró o borró
// desde /admin/catalogo. Para AGREGAR los que falten a un catálogo existente hay un comando
// explícito y separado: `npm run db:seed:catalogo`.
async function seedCatalogo(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM catalogo_items");
  if (Number(rows[0]?.count) > 0) {
    console.log("catalogo_items ya tiene datos — se omite el seed (para agregar los que falten: npm run db:seed:catalogo).");
    return;
  }
  const nuevos = await sembrarCatalogo(pool);
  console.log(`catalogo_items: ${nuevos} filas insertadas.`);
}

async function seedSlots(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM slots");
  if (Number(rows[0]?.count) > 0) {
    console.log("slots ya tiene datos — se omite el seed.");
    return;
  }
  for (const slot of SLOTS_INICIALES) {
    await pool.query(
      "INSERT INTO slots (fecha_hora_inicio, fecha_hora_fin, cupo_maximo, cupos_disponibles) VALUES ($1, $2, $3, $3)",
      [slot.inicio, slot.fin, slot.cupoMaximo],
    );
  }
  console.log(`slots: ${SLOTS_INICIALES.length} filas insertadas.`);
}

async function seedConfiguracionDescuento(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM configuracion_descuento");
  if (Number(rows[0]?.count) > 0) {
    console.log("configuracion_descuento ya tiene datos — se omite el seed.");
    return;
  }
  await pool.query(
    `INSERT INTO configuracion_descuento
      (min_servicios_3pct, min_servicios_5pct, monto_minimo_5pct_servicios_cents, min_productos_3pct, min_productos_5pct)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      CONFIGURACION_DESCUENTO.minServicios3pct,
      CONFIGURACION_DESCUENTO.minServicios5pct,
      CONFIGURACION_DESCUENTO.montoMinimo5pctServiciosCents,
      CONFIGURACION_DESCUENTO.minProductos3pct,
      CONFIGURACION_DESCUENTO.minProductos5pct,
    ],
  );
  console.log("configuracion_descuento: fila insertada (valores del PDF, ADR-023).");
}

// N días de deadline (ADR-010) — decisión de infraestructura documentada en
// spec/todo.md (Gate 4), no viene del PDF, igual que el TTL del JWT.
const DIAS_DEADLINE_EDICION = 3;

async function seedConfiguracionEvento(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM configuracion_evento");
  if (Number(rows[0]?.count) > 0) {
    console.log("configuracion_evento ya tiene datos — se omite el seed.");
    return;
  }
  await pool.query("INSERT INTO configuracion_evento (dias_deadline_edicion) VALUES ($1)", [
    DIAS_DEADLINE_EDICION,
  ]);
  console.log(`configuracion_evento: fila insertada (dias_deadline_edicion=${DIAS_DEADLINE_EDICION}).`);
}

async function seedAdminUser(pool: Pool): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL y ADMIN_PASSWORD son obligatorias para sembrar la cuenta admin (ADR-013) — configúralas en .env o en las variables de entorno de Render.",
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash`,
    [email, passwordHash],
  );
  console.log(`admin_users: cuenta seed asegurada para ${email}.`);
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Las 4 tablas son independientes entre sí — sin orden ni dependencia de datos.
    await Promise.all([
      seedCatalogo(pool),
      seedSlots(pool),
      seedConfiguracionDescuento(pool),
      seedConfiguracionEvento(pool),
      seedAdminUser(pool),
    ]);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
