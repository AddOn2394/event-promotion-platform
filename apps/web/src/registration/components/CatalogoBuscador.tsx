import { useMemo, useState } from "react";
import type { CatalogoItem } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";
import { Input } from "../../shared/ui";

type Props = {
  catalogo: CatalogoItem[];
  seleccionadosIds: Set<string>;
  onAgregar: (item: CatalogoItem) => void;
  describedBy?: string;
};

// ADR-012: el catálogo ya está cargado en memoria (useCatalogo) — el buscador filtra
// client-side por nombre, nunca dispara una llamada al servidor por tecleo.
export function CatalogoBuscador({ catalogo, seleccionadosIds, onAgregar, describedBy }: Props) {
  const [busqueda, setBusqueda] = useState("");

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const items = termino ? catalogo.filter((item) => item.nombre.toLowerCase().includes(termino)) : catalogo;
    return {
      servicios: items.filter((item) => item.categoria === "servicio"),
      productos: items.filter((item) => item.categoria === "producto"),
    };
  }, [catalogo, busqueda]);

  return (
    <section aria-labelledby="buscador-catalogo" aria-describedby={describedBy} className="flex flex-col gap-4">
      <h2 id="buscador-catalogo" className="font-display text-lg font-bold text-tinta">
        Catálogo
      </h2>

      <div>
        <label htmlFor="busqueda-catalogo" className="text-sm font-medium text-tinta">
          Buscar
        </label>
        <Input
          id="busqueda-catalogo"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
          className="mt-1.5"
        />
      </div>

      <ListaCatalogo titulo="Servicios" items={resultados.servicios} seleccionadosIds={seleccionadosIds} onAgregar={onAgregar} />
      <ListaCatalogo titulo="Productos" items={resultados.productos} seleccionadosIds={seleccionadosIds} onAgregar={onAgregar} />
    </section>
  );
}

function ListaCatalogo({
  titulo,
  items,
  seleccionadosIds,
  onAgregar,
}: {
  titulo: string;
  items: CatalogoItem[];
  seleccionadosIds: Set<string>;
  onAgregar: (item: CatalogoItem) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-apagado">{titulo}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border border-borde bg-superficie px-3 py-2 text-sm"
          >
            <span className="text-tinta">
              {item.nombre} — <span className="font-mono tabular-nums">{formatearCents(item.precioCents)}</span>
            </span>
            <button
              type="button"
              onClick={() => onAgregar(item)}
              disabled={seleccionadosIds.has(item.id)}
              className="shrink-0 rounded-md border border-jade px-3 py-1 text-xs font-medium text-jade hover:bg-jade/10 disabled:cursor-not-allowed disabled:border-borde disabled:text-apagado disabled:hover:bg-transparent"
            >
              {seleccionadosIds.has(item.id) ? "Agregado" : `Agregar ${item.nombre}`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
