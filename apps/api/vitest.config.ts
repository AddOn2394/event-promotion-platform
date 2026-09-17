import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Los tests de integración pegan contra una Postgres real compartida (ADR-017) —
    // correr archivos de test en paralelo arriesgaría que un TRUNCATE de un archivo
    // pise datos que otro archivo está usando a mitad de su propio test.
    fileParallelism: false,
  },
});
