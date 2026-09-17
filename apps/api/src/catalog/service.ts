import type { CatalogoItem, ConfiguracionDescuento } from "@event-promotion/shared-types";
import { pool } from "../db/pool.js";

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
export async function buscarCatalogoActivoPorIds(ids: string[]): Promise<CatalogoItem[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query<CatalogoItemRow>(
    "SELECT idcatalogo, nombre, categoria, precio_cents FROM catalogo_items WHERE idcatalogo = ANY($1) AND activo = true",
    [ids],
  );
  return rows.map(toCatalogoItem);
}
