import type { Pool, PoolClient } from "pg";

// Catálogo de ejemplo de la Feria (redes/TI): 15 servicios y 15 productos. Son datos de ejemplo —
// el negocio los reemplaza desde /admin/catalogo. Precios en CENTAVOS (ADR-005): Q1,200.00 = 120_000.
export const CATALOGO_INICIAL = [
  { nombre: "Diagnóstico de red", categoria: "servicio", precioCents: 50_000 },
  { nombre: "Instalación de cableado", categoria: "servicio", precioCents: 75_000 },
  { nombre: "Soporte técnico anual", categoria: "servicio", precioCents: 120_000 },
  { nombre: "Auditoría de seguridad informática", categoria: "servicio", precioCents: 180_000 },
  { nombre: "Configuración de firewall", categoria: "servicio", precioCents: 65_000 },
  { nombre: "Instalación de servidor", categoria: "servicio", precioCents: 220_000 },
  { nombre: "Migración a la nube", categoria: "servicio", precioCents: 350_000 },
  { nombre: "Respaldo y recuperación de datos", categoria: "servicio", precioCents: 90_000 },
  { nombre: "Mantenimiento preventivo de equipos", categoria: "servicio", precioCents: 40_000 },
  { nombre: "Configuración de red inalámbrica", categoria: "servicio", precioCents: 55_000 },
  { nombre: "Instalación de cámaras de seguridad", categoria: "servicio", precioCents: 110_000 },
  { nombre: "Configuración de VPN corporativa", categoria: "servicio", precioCents: 70_000 },
  { nombre: "Capacitación básica en ciberseguridad", categoria: "servicio", precioCents: 85_000 },
  { nombre: "Cableado estructurado certificado", categoria: "servicio", precioCents: 160_000 },
  { nombre: "Monitoreo de red (mensual)", categoria: "servicio", precioCents: 135_000 },

  { nombre: "Router empresarial", categoria: "producto", precioCents: 45_000 },
  { nombre: "Switch de 24 puertos", categoria: "producto", precioCents: 60_000 },
  { nombre: "Access point WiFi 6", categoria: "producto", precioCents: 35_000 },
  { nombre: "Firewall de próxima generación", categoria: "producto", precioCents: 250_000 },
  { nombre: "Cable UTP Cat6 (caja de 305 m)", categoria: "producto", precioCents: 95_000 },
  { nombre: "Rack de pared 12U", categoria: "producto", precioCents: 105_000 },
  { nombre: "UPS de 1500 VA", categoria: "producto", precioCents: 130_000 },
  { nombre: "Switch PoE de 8 puertos", categoria: "producto", precioCents: 48_000 },
  { nombre: "Servidor tipo torre", categoria: "producto", precioCents: 680_000 },
  { nombre: "Disco duro externo de 2 TB", categoria: "producto", precioCents: 52_000 },
  { nombre: "Cámara IP de seguridad", categoria: "producto", precioCents: 39_000 },
  { nombre: "Patch panel de 24 puertos", categoria: "producto", precioCents: 28_000 },
  { nombre: "Antena punto a punto de 5 GHz", categoria: "producto", precioCents: 75_000 },
  { nombre: "Kit de herramientas para redes", categoria: "producto", precioCents: 32_000 },
  { nombre: "Regleta de energía con protección", categoria: "producto", precioCents: 15_000 },
] as const;

// Aditivo e idempotente: inserta solo los ítems cuyo par nombre + categoría todavía no existe.
// El chequeo NO filtra por `activo`, a propósito: volver a correr el seed nunca "resucita" (ni
// duplica) un ítem que el admin desactivó. Devuelve cuántas filas nuevas insertó.
// Sin restricción UNIQUE en la tabla, dos corridas simultáneas podrían duplicar — es un script
// manual de una sola corrida. Y reinserta como activo un ítem de ejemplo que el negocio haya
// renombrado o borrado: por eso no lo llama `db:seed` sino solo `db:seed:catalogo`, a pedido.
export async function sembrarCatalogo(db: Pool | PoolClient): Promise<number> {
  let insertados = 0;
  for (const item of CATALOGO_INICIAL) {
    const resultado = await db.query(
      `INSERT INTO catalogo_items (nombre, categoria, precio_cents)
       SELECT $1::text, $2::text, $3::integer
       WHERE NOT EXISTS (SELECT 1 FROM catalogo_items WHERE nombre = $1::text AND categoria = $2::text)`,
      [item.nombre, item.categoria, item.precioCents],
    );
    insertados += resultado.rowCount ?? 0;
  }
  return insertados;
}
