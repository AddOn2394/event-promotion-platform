import { formatearCents, type ConfiguracionDescuento } from "@event-promotion/shared-types";
import { Card } from "../../shared/ui";

type Props = { config: ConfiguracionDescuento };

type Regla = { pct: number; condicion: string };

// Los umbrales salen de la configuración que el propio servidor expone (ADR-023), nunca de
// constantes en el cliente: si ventas los cambia desde el admin panel, esta explicación cambia
// con ellos. La regla de fondo es la de ADR-004/ADR-005 (categorías independientes, gana el
// porcentaje más alto, el monto mínimo es estricto).
function reglasDeServicios(config: ConfiguracionDescuento): Regla[] {
  return [
    { pct: 3, condicion: `${config.minServicios3pct} o más servicios` },
    {
      pct: 5,
      condicion: `${config.minServicios5pct} o más servicios que sumen más de ${formatearCents(config.montoMinimo5pctServiciosCents)}`,
    },
  ];
}

function reglasDeProductos(config: ConfiguracionDescuento): Regla[] {
  return [
    { pct: 3, condicion: `${config.minProductos3pct} o más productos` },
    { pct: 5, condicion: `${config.minProductos5pct} o más productos` },
  ];
}

// Lista agrupada por categoría, una regla por línea (porcentaje → condición): en la columna
// lateral de 20rem una tabla de 3 columnas partiría cada celda en varias líneas. La insignia
// reutiliza el estilo del badge de CajaSeleccionados.
export function ExplicacionDescuento({ config }: Props) {
  return (
    <Card as="section" aria-labelledby="explicacion-descuento">
      <h2
        id="explicacion-descuento"
        className="font-display text-xs font-semibold uppercase tracking-widest text-apagado"
      >
        Cómo se calcula su descuento
      </h2>

      <div className="mt-4 flex flex-col gap-4">
        <GrupoDeReglas titulo="Servicios" reglas={reglasDeServicios(config)} />
        <GrupoDeReglas titulo="Productos" reglas={reglasDeProductos(config)} />
      </div>

      <p className="mt-4 border-t border-borde pt-3 text-sm text-apagado">
        Los servicios y los productos se calculan por separado, y en cada categoría se aplica el mayor porcentaje que
        usted alcance.
      </p>
    </Card>
  );
}

function GrupoDeReglas({ titulo, reglas }: { titulo: string; reglas: Regla[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-tinta">{titulo}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {reglas.map((regla) => (
          <li key={regla.pct} className="flex items-start gap-3 text-sm text-tinta">
            <span className="mt-0.5 shrink-0 rounded-full bg-jade/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-jade">
              {regla.pct}%
            </span>
            <span>{regla.condicion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
