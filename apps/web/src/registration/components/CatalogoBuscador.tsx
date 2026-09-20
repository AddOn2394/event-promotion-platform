import { useMemo, useState } from "react";
import { formatearCents, type CatalogoItem } from "@event-promotion/shared-types";
import { Button, Field, Input } from "../../shared/ui";

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
      <div>
        <h2 id="buscador-catalogo" className="font-display text-lg font-bold text-tinta">
          Catálogo de servicios y productos
        </h2>
        <p className="mt-1 text-sm text-apagado">
          Presione «Agregar» junto a cada servicio o producto que le interese. Puede quitarlo después desde el cuadro
          de su selección.
        </p>
      </div>

      <Field label="Buscar" htmlFor="busqueda-catalogo" hint="Escriba el nombre de un servicio o producto para filtrar la lista.">
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
        />
      </Field>

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
      <h3 className="text-xs font-semibold uppercase tracking-widest text-apagado">{titulo}</h3>
      {items.length === 0 ? <p className="mt-2 text-sm text-apagado">Sin resultados en esta categoría.</p> : null}
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border border-borde bg-superficie px-3 py-2 text-sm"
          >
            <span className="text-tinta">
              {item.nombre} — <span className="font-mono tabular-nums">{formatearCents(item.precioCents)}</span>
            </span>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="shrink-0"
              onClick={() => onAgregar(item)}
              disabled={seleccionadosIds.has(item.id)}
            >
              {seleccionadosIds.has(item.id) ? "Agregado" : `Agregar ${item.nombre}`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
