import type { CatalogoItem } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";

type Props = {
  titulo: string;
  items: CatalogoItem[];
  subtotalCents: number;
  descuentoPct: number;
  totalCents: number;
  onQuitar: (id: string) => void;
};

// ADR-004: caja en vivo de una sola categoría (servicios o productos), alimentada al
// marcar ítems del buscador — con opción de quitar y su propio % de descuento.
export function CajaSeleccionados({ titulo, items, subtotalCents, descuentoPct, totalCents, onQuitar }: Props) {
  return (
    <section aria-labelledby={`caja-${titulo}`}>
      <h2 id={`caja-${titulo}`}>{titulo}</h2>
      {items.length === 0 ? (
        <p>Ningún ítem seleccionado todavía.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <span>
                {item.nombre} — {formatearCents(item.precioCents)}
              </span>
              <button type="button" onClick={() => onQuitar(item.id)}>
                Quitar {item.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>
        Subtotal: {formatearCents(subtotalCents)} — Descuento (preview): {descuentoPct}% — Total (preview):{" "}
        {formatearCents(totalCents)}
      </p>
    </section>
  );
}
