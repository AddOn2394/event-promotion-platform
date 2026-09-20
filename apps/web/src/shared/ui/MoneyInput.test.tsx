import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MoneyInput } from "./MoneyInput";

afterEach(cleanup);

function Envoltorio({ inicial, alCambiar }: { inicial?: number; alCambiar?: (c: number | undefined) => void }) {
  const [valor, setValor] = useState<number | undefined>(inicial);
  return (
    <>
      <label htmlFor="monto">Precio</label>
      <MoneyInput
        id="monto"
        value={valor}
        onChange={(c) => {
          setValor(c);
          alCambiar?.(c);
        }}
      />
      <button type="button" onClick={() => setValor(undefined)}>
        limpiar
      </button>
      <button type="button" onClick={() => setValor(250075)}>
        poner
      </button>
    </>
  );
}

function campo(): HTMLInputElement {
  return screen.getByLabelText("Precio") as HTMLInputElement;
}

describe("MoneyInput — precio en quetzales con formato en vivo", () => {
  it("al teclear aplica el formato de miles y emite centavos enteros", () => {
    const alCambiar = vi.fn();
    render(<Envoltorio alCambiar={alCambiar} />);

    fireEvent.change(campo(), { target: { value: "1500" } });
    expect(campo().value).toBe("1,500");
    expect(alCambiar).toHaveBeenLastCalledWith(150000);

    fireEvent.change(campo(), { target: { value: "1,500.5" } });
    expect(campo().value).toBe("1,500.5");
    expect(alCambiar).toHaveBeenLastCalledWith(150050);
  });

  it("al salir del campo completa a dos decimales", () => {
    render(<Envoltorio />);
    fireEvent.change(campo(), { target: { value: "1500.5" } });
    fireEvent.blur(campo());
    expect(campo().value).toBe("1,500.50");
  });

  it("vaciar el campo emite undefined (el schema pide el monto, no se asume 0)", () => {
    const alCambiar = vi.fn();
    render(<Envoltorio inicial={5000} alCambiar={alCambiar} />);
    expect(campo().value).toBe("50.00");

    fireEvent.change(campo(), { target: { value: "" } });
    expect(alCambiar).toHaveBeenLastCalledWith(undefined);
  });

  it("descarta letras y muestra la Q como prefijo visual, fuera del valor", () => {
    render(<Envoltorio />);
    fireEvent.change(campo(), { target: { value: "Q12ab3" } });
    expect(campo().value).toBe("123");
    expect(screen.getByText("Q").getAttribute("aria-hidden")).toBe("true");
  });

  it("si el valor cambia desde afuera (reset del formulario o dato del servidor) el texto se actualiza", () => {
    render(<Envoltorio inicial={100} />);
    expect(campo().value).toBe("1.00");

    fireEvent.click(screen.getByText("poner"));
    expect(campo().value).toBe("2,500.75");

    fireEvent.click(screen.getByText("limpiar"));
    expect(campo().value).toBe("");
  });

  it("teclear '1500.' no reescribe el texto mientras se escribe el decimal", () => {
    render(<Envoltorio />);
    fireEvent.change(campo(), { target: { value: "1500." } });
    expect(campo().value).toBe("1,500.");
  });

  it("recoloca el cursor aunque el formato deje el texto igual (Backspace sobre una coma de miles)", async () => {
    // "1,500.00" con el cursor tras la coma: Backspace deja "1500.00", que se reformatea a
    // "1,500.00" (idéntico) → React no re-renderiza y restaura el valor, mandando el cursor al
    // final. La posición correcta (1 significativo a la izquierda → índice 1) se aplica igual.
    render(<Envoltorio inicial={150000} />);
    const input = campo();
    input.focus();
    Object.defineProperty(input, "selectionStart", { configurable: true, get: () => 1 });
    // Se registra el valor del input EN EL INSTANTE en que se recoloca el cursor: si React aún
    // no hubiera restaurado el valor controlado, sería "1500.00" (lo tecleado); si ya lo hizo,
    // "1,500.00". Prueba el ORDEN (la restauración va primero), no solo que se llame.
    const llamadas: { args: [number, number]; valorAlLlamar: string }[] = [];
    vi.spyOn(input, "setSelectionRange").mockImplementation((inicio, fin) => {
      llamadas.push({ args: [inicio as number, fin as number], valorAlLlamar: input.value });
    });

    fireEvent.change(input, { target: { value: "1500.00" } });
    await Promise.resolve();

    expect(input.value).toBe("1,500.00");
    expect(llamadas).toEqual([{ args: [1, 1], valorAlLlamar: "1,500.00" }]);
  });

  it("reenvía id y aria-* al input real (Field los inyecta con cloneElement)", () => {
    render(<MoneyInput id="x" aria-invalid={true} aria-describedby="x-error" value={undefined} onChange={() => undefined} />);
    const input = document.getElementById("x") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("x-error");
    expect(input.getAttribute("inputmode")).toBe("decimal");
  });
});
