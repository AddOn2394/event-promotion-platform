import { afterAll, describe, expect, it } from "vitest";
import { pool } from "./pool.js";
import { CATALOGO_INICIAL, sembrarCatalogo } from "./seed-catalogo.js";

afterAll(async () => {
  await pool.end();
});

describe("seed de catálogo — 15 servicios + 15 productos, aditivo e idempotente", () => {
  it("el catálogo de ejemplo tiene 15 servicios y 15 productos, sin nombres repetidos y con precios enteros", () => {
    const servicios = CATALOGO_INICIAL.filter((item) => item.categoria === "servicio");
    const productos = CATALOGO_INICIAL.filter((item) => item.categoria === "producto");
    expect(servicios).toHaveLength(15);
    expect(productos).toHaveLength(15);

    const clave = (item: { nombre: string; categoria: string }) => `${item.categoria}|${item.nombre}`;
    expect(new Set(CATALOGO_INICIAL.map(clave)).size).toBe(30);
    for (const item of CATALOGO_INICIAL) {
      expect(Number.isInteger(item.precioCents)).toBe(true);
      expect(item.precioCents).toBeGreaterThan(0);
    }
  });

  it("inserta lo que falta, una segunda corrida no inserta nada y nunca resucita un ítem desactivado", async () => {
    // Todo dentro de una transacción que se revierte: la DB de test no queda con los 30 ítems
    // (otros suites cuentan el catálogo). Las aserciones son RELATIVAS a lo que ya hubiera en la
    // DB (una DB de test sembrada con `db:seed` ya trae algunos de estos nombres).
    const nombres = CATALOGO_INICIAL.map((item) => item.nombre);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: previos } = await client.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM (
           SELECT DISTINCT nombre, categoria FROM catalogo_items WHERE nombre = ANY($1)
         ) existentes`,
        [nombres],
      );
      const yaExistian = Number(previos[0]?.n);

      const primera = await sembrarCatalogo(client);
      expect(primera).toBe(30 - yaExistian);

      const { rows: conteo } = await client.query<{ n: string }>(
        `SELECT COUNT(*) AS n FROM (
           SELECT DISTINCT nombre, categoria FROM catalogo_items WHERE nombre = ANY($1)
         ) presentes`,
        [nombres],
      );
      expect(Number(conteo[0]?.n)).toBe(30);

      expect(await sembrarCatalogo(client)).toBe(0);

      await client.query("UPDATE catalogo_items SET activo = false WHERE nombre = 'Router empresarial'");
      expect(await sembrarCatalogo(client)).toBe(0);
      const { rows: router } = await client.query<{ activo: boolean }>(
        "SELECT activo FROM catalogo_items WHERE nombre = 'Router empresarial'",
      );
      expect(router.every((fila) => fila.activo === false)).toBe(true);

      // Documenta el límite conocido: un ítem que el negocio RENOMBRÓ deja de coincidir por
      // nombre y el seed aditivo lo vuelve a insertar (por eso no lo corre `db:seed`).
      await client.query("UPDATE catalogo_items SET nombre = 'Nombre cambiado por el negocio' WHERE nombre = 'Switch PoE de 8 puertos'");
      expect(await sembrarCatalogo(client)).toBe(1);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});
