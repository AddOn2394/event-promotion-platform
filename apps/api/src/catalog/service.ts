import type { CatalogoItem } from "@event-promotion/shared-types";
import { pool } from "../db/pool.js";

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
