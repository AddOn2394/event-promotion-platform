import { Pool } from "pg";

// Pool compartido para el servidor en ejecución — distinto de los Pool ad-hoc de
// migrate.ts/seed.ts, que son scripts de un solo uso.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
