import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const migrationsDir = path.join(fileURLToPath(new URL("../../", import.meta.url)), "migrations");

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const { rows } = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.filename));

    const archivos = readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of archivos) {
      if (applied.has(filename)) continue;

      const sql = readFileSync(path.join(migrationsDir, filename), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        console.log(`Aplicada: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Falló la migración ${filename}: ${(error as Error).message}`, { cause: error });
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
