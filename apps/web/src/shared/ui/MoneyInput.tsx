import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";
import {
  formatearEntradaMonto,
  parsearMontoACents,
  posicionCursor,
  significativosAntesDelCursor,
  textoDesdeCents,
} from "../money-input";
import { Input } from "./Input";

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  // Centavos enteros (ADR-005) o undefined si el campo está vacío.
  value: number | undefined;
  onChange: (cents: number | undefined) => void;
};

// Campo de monto en quetzales: la persona escribe el precio normal ("1500.5") y el formato de
// moneda se aplica mientras teclea ("1,500.5"; al salir del campo, "1,500.50"). Hacia el
// formulario solo salen centavos enteros. La "Q" es un prefijo visual fuera del valor, para no
// complicar la posición del cursor. Reenvía id/aria-*/name al <input> real: Field los inyecta
// con cloneElement, y el foco visible y el contraste vienen del Input compartido.
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, className, placeholder, ...props },
  refExterna,
) {
  const [texto, setTexto] = useState(() => textoDesdeCents(value));

  // Si el valor cambia desde afuera (reset() tras guardar, o llega la configuración del
  // servidor) el texto se resincroniza; lo que la persona está tecleando ("1,500." ya equivale a
  // 150000) no dispara una reescritura.
  useEffect(() => {
    if (parsearMontoACents(texto) !== (value ?? null)) {
      setTexto(textoDesdeCents(value));
    }
    // Solo depende de `value`: `texto` cambia en cada tecla y comparar contra él es justo el objetivo.
  }, [value]);

  function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const input = evento.target;
    const crudo = input.value;
    const cursor = input.selectionStart ?? crudo.length;
    const formateado = formatearEntradaMonto(crudo);
    const posicion = posicionCursor(formateado, significativosAntesDelCursor(crudo, cursor));

    setTexto(formateado);
    onChange(parsearMontoACents(formateado) ?? undefined);

    // El cursor se recoloca en una microtarea, no en un useLayoutEffect: si el formato deja el
    // texto idéntico al anterior (Backspace sobre una coma de miles: "1,500" → "1500" → "1,500")
    // React no vuelve a renderizar y no hay efecto que correr, pero SÍ restaura el valor del
    // input controlado al terminar el evento, lo que manda el cursor al final. La microtarea corre
    // después de esa restauración y también después del commit cuando el texto sí cambió.
    queueMicrotask(() => {
      if (document.activeElement === input) input.setSelectionRange(posicion, posicion);
    });
  }

  function alSalir(evento: FocusEvent<HTMLInputElement>) {
    const cents = parsearMontoACents(texto);
    if (cents !== null) setTexto(textoDesdeCents(cents));
    onBlur?.(evento);
  }

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-apagado">
        Q
      </span>
      <Input
        {...props}
        ref={refExterna}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        onChange={alCambiar}
        onBlur={alSalir}
        placeholder={placeholder ?? "0.00"}
        className={`pl-8 font-mono tabular-nums ${className ?? ""}`}
      />
    </div>
  );
});
