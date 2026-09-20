import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const app = createApp();

// Antes: { error: { formErrors, fieldErrors } } (un objeto) — el cliente lo descartaba y
// mostraba "Error 400". Ahora `error` es un texto en español y el detalle va en `campos`.
describe("validación del API — errores legibles en español", () => {
  it("POST /auth/login con datos inválidos devuelve error como texto en español y el detalle por campo", async () => {
    const res = await request(app).post("/auth/login").send({ email: "no-es-un-correo", codigo: "12" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).toBe("Ingrese un correo electrónico válido");
    expect(res.body.campos.email).toEqual(["Ingrese un correo electrónico válido"]);
    expect(res.body.campos.codigo).toEqual(["El código debe tener exactamente 6 dígitos numéricos"]);
  });

  it("un cuerpo vacío pide los campos obligatorios en español, sin texto de Zod", async () => {
    const res = await request(app).post("/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/required|invalid|expected/i);
    expect(res.body.campos.email).toEqual(["Ingrese un correo electrónico"]);
  });
});
