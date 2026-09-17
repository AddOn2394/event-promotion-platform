import { Pool } from "pg";

// Los tests de integración (ADR-017) corren contra una base de datos de test dedicada,
// nunca contra la de desarrollo — DATABASE_URL debe apuntar a esa base de test al correr
// este script y luego db:migrate/npm test. Crea la base si no existe (idempotente).
async function main(): Promise<void> {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error("DATABASE_URL debe apuntar a la base de datos de test.");
  }

  const testDbName = new URL(testUrl).pathname.replace(/^\//, "");
  const maintenanceUrl = testUrl.replace(`/${testDbName}`, "/postgres");

  const pool = new Pool({ connectionString: maintenanceUrl });
  try {
    const { rows } = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [testDbName]);
    if (rows.length === 0) {
      await pool.query(`CREATE DATABASE "${testDbName}"`);
      console.log(`Base de datos de test "${testDbName}" creada.`);
    } else {
      console.log(`Base de datos de test "${testDbName}" ya existe.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
