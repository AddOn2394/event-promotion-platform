import type { Pool, PoolClient } from "pg";

// Patrón BEGIN/COMMIT/ROLLBACK compartido por cualquier escritura de dos o más tablas
// que debe ser atómica (ADR-006/ADR-009/ADR-024: invitación+notificación, confirmación+items+notificación).
export async function withTransaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
