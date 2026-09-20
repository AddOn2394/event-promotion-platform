import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Field } from "./Field";
import { Input } from "./Input";

afterEach(cleanup);

describe("Field — asociación accesible de hint y error", () => {
  it("el hint describe al control (lectores de pantalla lo anuncian)", () => {
    render(
      <Field label="Nombre" htmlFor="nombre" hint="Ayuda visible">
        <Input type="text" />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre").getAttribute("aria-describedby")).toBe("nombre-hint");
    expect(document.getElementById("nombre-hint")?.textContent).toBe("Ayuda visible");
  });

  it("con error, el error reemplaza al hint como descripción", () => {
    render(
      <Field label="Nombre" htmlFor="nombre" hint="Ayuda visible" error="Campo inválido">
        <Input type="text" />
      </Field>,
    );
    const control = screen.getByLabelText("Nombre");
    expect(control.getAttribute("aria-describedby")).toBe("nombre-error");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("nombre-hint")).toBeNull();
  });

  it("sin hint ni error no agrega aria-describedby", () => {
    render(
      <Field label="Nombre" htmlFor="nombre">
        <Input type="text" />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre").hasAttribute("aria-describedby")).toBe(false);
  });
});
