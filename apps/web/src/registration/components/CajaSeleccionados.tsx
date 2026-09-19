import type { CatalogoItem } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";
import { Button, Card } from "../../shared/ui";

type Props = {
  id: string;
  titulo: string;
  items: CatalogoItem[];
  subtotalCents: number;
  descuentoPct: number;
  totalCents: number;
  onQuitar: (id: string) => void;
};

// ADR-004: caja en vivo de una sola categoría (servicios o productos), alimentada al
// marcar ítems del buscador — con opción de quitar y su propio % de descuento. Montos
// tabulares alineados a la derecha, badge de % solo cuando se alcanza el tier (ese es
// el elemento firma del gate).
export function CajaSeleccionados({ id, titulo, items, subtotalCents, descuentoPct, totalCents, onQuitar }: Props) {
  const tituloId = `${id}-titulo`;

  return (
    <Card as="section" aria-labelledby={tituloId}>
      <div className="flex items-center justify-between">
        <h2 id={tituloId} className="font-display text-xs font-semibold uppercase tracking-widest text-apagado">
          {titulo}
        </h2>
        {descuentoPct > 0 ? (
          <span className="rounded-full bg-jade/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-jade transition-opacity motion-reduce:transition-none">
            {descuentoPct}%
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-apagado">Ningún ítem seleccionado todavía.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-tinta">{item.nombre}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums text-tinta">{formatearCents(item.precioCents)}</span>
                <Button type="button" variant="link" onClick={() => onQuitar(item.id)}>
                  Quitar {item.nombre}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-borde pt-3 text-sm">
        <div className="flex justify-between text-apagado">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">{formatearCents(subtotalCents)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold text-tinta">
          <span>Total (preview)</span>
          <span className="font-mono tabular-nums">{formatearCents(totalCents)}</span>
        </div>
      </div>
    </Card>
  );
}
