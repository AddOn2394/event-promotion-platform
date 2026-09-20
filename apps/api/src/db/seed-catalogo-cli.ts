import { Pool } from "pg";
import { CATALOGO_INICIAL, sembrarCatalogo } from "./seed-catalogo.js";

// Carga ADITIVA y explícita del catálogo de ejemplo: inserta solo los ítems cuyo nombre +
// categoría todavía no existan, aunque la tabla ya tenga datos (`db:seed` la omitiría). Se corre a
// mano y una vez — si el negocio ya renombró o borró ítems de ejemplo desde /admin/catalogo,
// volver a correrla los reinserta como activos.
async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const nuevos = await sembrarCatalogo(pool);
    console.log(`catalogo_items: ${nuevos} filas nuevas de ${CATALOGO_INICIAL.length} (las que ya existían se omiten).`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
