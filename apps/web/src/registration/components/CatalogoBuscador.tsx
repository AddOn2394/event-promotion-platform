import { useMemo, useState } from "react";
import type { CatalogoItem } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";

type Props = {
  catalogo: CatalogoItem[];
  seleccionadosIds: Set<string>;
  onAgregar: (item: CatalogoItem) => void;
};

// ADR-012: el catálogo ya está cargado en memoria (useCatalogo) — el buscador filtra
// client-side por nombre, nunca dispara una llamada al servidor por tecleo.
export function CatalogoBuscador({ catalogo, seleccionadosIds, onAgregar }: Props) {
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
    <section aria-labelledby="buscador-catalogo">
      <h2 id="buscador-catalogo">Catálogo</h2>
      <label htmlFor="busqueda-catalogo">Buscar</label>
      <input
        id="busqueda-catalogo"
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre…"
      />

      <h3>Servicios</h3>
      <ul>
        {resultados.servicios.map((item) => (
          <li key={item.id}>
            <span>
              {item.nombre} — {formatearCents(item.precioCents)}
            </span>
            <button type="button" onClick={() => onAgregar(item)} disabled={seleccionadosIds.has(item.id)}>
              {seleccionadosIds.has(item.id) ? "Agregado" : `Agregar ${item.nombre}`}
            </button>
          </li>
        ))}
      </ul>

      <h3>Productos</h3>
      <ul>
        {resultados.productos.map((item) => (
          <li key={item.id}>
            <span>
              {item.nombre} — {formatearCents(item.precioCents)}
            </span>
            <button type="button" onClick={() => onAgregar(item)} disabled={seleccionadosIds.has(item.id)}>
              {seleccionadosIds.has(item.id) ? "Agregado" : `Agregar ${item.nombre}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
