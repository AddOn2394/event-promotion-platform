import type {
  ActualizarCatalogoItemRequest,
  ActualizarConfiguracionDescuentoRequest,
  CatalogoItem,
  CatalogoItemAdmin,
  ConfiguracionDescuento,
  CrearCatalogoItemRequest,
} from "@event-promotion/shared-types";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { HttpError } from "../shared/http-error.js";

// Permite que esta lectura corra dentro de una transacción abierta (pasando el PoolClient
// de esa transacción) o fuera de una (pool por default) — mismo patrón que
// slots/service.ts, necesario para resolver el catálogo bajo el lock de confirmaciones.
type Queryable = Pool | PoolClient;

type ConfiguracionDescuentoRow = {
  min_servicios_3pct: number;
  min_servicios_5pct: number;
  monto_minimo_5pct_servicios_cents: number;
  min_productos_3pct: number;
  min_productos_5pct: number;
};

// ADR-025: apps/api es la única autoridad que lee configuracion_descuento de la DB —
// tanto /confirmaciones (registration/service.ts) como GET /configuracion-descuento
// (preview en vivo de apps/web) usan esta misma lectura, para que nunca diverjan.
export async function leerConfiguracionDescuentoVigente(): Promise<ConfiguracionDescuento> {
  const { rows } = await pool.query<ConfiguracionDescuentoRow>(
    "SELECT min_servicios_3pct, min_servicios_5pct, monto_minimo_5pct_servicios_cents, min_productos_3pct, min_productos_5pct FROM configuracion_descuento",
  );
  const config = rows[0];
  if (!config) {
    throw new Error("configuracion_descuento no tiene ninguna fila — falta seedear (ver apps/api/src/db/seed.ts).");
  }
  return {
    minServicios3pct: config.min_servicios_3pct,
    minServicios5pct: config.min_servicios_5pct,
    montoMinimo5pctServiciosCents: config.monto_minimo_5pct_servicios_cents,
    minProductos3pct: config.min_productos_3pct,
    minProductos5pct: config.min_productos_5pct,
  };
}

type CatalogoItemRow = {
  idcatalogo: string;
  nombre: string;
  categoria: "servicio" | "producto";
  precio_cents: number;
};

function toCatalogoItem(row: CatalogoItemRow): CatalogoItem {
  return {
    id: row.idcatalogo,
    nombre: row.nombre,
    categoria: row.categoria,
    precioCents: row.precio_cents,
  };
}

// ADR-007: el formulario del cliente solo ve catálogo activo — soft-delete filtra acá.
export async function listarCatalogoActivo(): Promise<CatalogoItem[]> {
  const { rows } = await pool.query<CatalogoItemRow>(
    "SELECT idcatalogo, nombre, categoria, precio_cents FROM catalogo_items WHERE activo = true ORDER BY nombre",
  );
  return rows.map(toCatalogoItem);
}

// El servidor nunca confía en nombre/categoría/precio que envía el cliente (HU-3) — el
// motor de descuento y el snapshot siempre usan lo que devuelve esta consulta, resuelto
// por id contra el catálogo real. Solo ítems activos: uno desactivado a mitad de sesión
// del cliente no debe poder confirmarse.
export async function buscarCatalogoActivoPorIds(ids: string[], db: Queryable = pool): Promise<CatalogoItem[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<CatalogoItemRow>(
    "SELECT idcatalogo, nombre, categoria, precio_cents FROM catalogo_items WHERE idcatalogo = ANY($1) AND activo = true",
    [ids],
  );
  return rows.map(toCatalogoItem);
}

type CatalogoItemAdminRow = CatalogoItemRow & { activo: boolean };

function toCatalogoItemAdmin(row: CatalogoItemAdminRow): CatalogoItemAdmin {
  return { ...toCatalogoItem(row), activo: row.activo };
}

// HU-9 (Gate 5, ADR-007): el admin panel ve también ítems inactivos, para reactivarlos.
export async function listarCatalogoAdmin(): Promise<CatalogoItemAdmin[]> {
  const { rows } = await pool.query<CatalogoItemAdminRow>(
    "SELECT idcatalogo, nombre, categoria, precio_cents, activo FROM catalogo_items ORDER BY nombre",
  );
  return rows.map(toCatalogoItemAdmin);
}

export async function crearCatalogoItem(input: CrearCatalogoItemRequest): Promise<CatalogoItemAdmin> {
  const { rows } = await pool.query<CatalogoItemAdminRow>(
    `INSERT INTO catalogo_items (nombre, categoria, precio_cents)
     VALUES ($1, $2, $3)
     RETURNING idcatalogo, nombre, categoria, precio_cents, activo`,
    [input.nombre, input.categoria, input.precioCents],
  );
  const item = rows[0];
  if (!item) throw new Error("No se pudo crear el ítem de catálogo.");
  return toCatalogoItemAdmin(item);
}

// Reemplazo completo (nombre/categoría/precio/activo) — un ítem editado no afecta
// confirmaciones ya hechas, que leen su propio snapshot (ADR-006, HU-9).
export async function actualizarCatalogoItem(
  idcatalogo: string,
  input: ActualizarCatalogoItemRequest,
): Promise<CatalogoItemAdmin> {
  const { rows } = await pool.query<CatalogoItemAdminRow>(
    `UPDATE catalogo_items SET nombre = $1, categoria = $2, precio_cents = $3, activo = $4
     WHERE idcatalogo = $5
     RETURNING idcatalogo, nombre, categoria, precio_cents, activo`,
    [input.nombre, input.categoria, input.precioCents, input.activo, idcatalogo],
  );
  const item = rows[0];
  if (!item) throw new HttpError(404, "Ítem de catálogo no encontrado.");
  return toCatalogoItemAdmin(item);
}

// HU-9: soft-delete — la fila nunca se borra físicamente (ADR-007), sigue íntegra en
// confirmacion_items vía snapshot.
export async function desactivarCatalogoItem(idcatalogo: string): Promise<void> {
  const result = await pool.query("UPDATE catalogo_items SET activo = false WHERE idcatalogo = $1", [
    idcatalogo,
  ]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "Ítem de catálogo no encontrado.");
  }
}

// HU-12: coherencia "5% nunca más débil que 3%" ya se valida en el schema Zod compartido
// (ActualizarConfiguracionDescuentoRequestSchema, packages/shared-types/src/descuento.ts) —
// llega acá ya validada, así que el CHECK de la DB (ratificado desde Gate 2) nunca debería
// disparar en uso normal; se mantiene como última línea de defensa.
export async function actualizarConfiguracionDescuento(
  input: ActualizarConfiguracionDescuentoRequest,
): Promise<ConfiguracionDescuento> {
  const { rows } = await pool.query<ConfiguracionDescuentoRow>(
    `UPDATE configuracion_descuento SET
       min_servicios_3pct = $1, min_servicios_5pct = $2, monto_minimo_5pct_servicios_cents = $3,
       min_productos_3pct = $4, min_productos_5pct = $5, actualizada_en = now()
     RETURNING min_servicios_3pct, min_servicios_5pct, monto_minimo_5pct_servicios_cents, min_productos_3pct, min_productos_5pct`,
    [
      input.minServicios3pct,
      input.minServicios5pct,
      input.montoMinimo5pctServiciosCents,
      input.minProductos3pct,
      input.minProductos5pct,
    ],
  );
  const config = rows[0];
  if (!config) throw new Error("configuracion_descuento no tiene ninguna fila — falta seedear.");
  return {
    minServicios3pct: config.min_servicios_3pct,
    minServicios5pct: config.min_servicios_5pct,
    montoMinimo5pctServiciosCents: config.monto_minimo_5pct_servicios_cents,
    minProductos3pct: config.min_productos_3pct,
    minProductos5pct: config.min_productos_5pct,
  };
}
