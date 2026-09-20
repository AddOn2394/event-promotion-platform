import { formatearCents, type ConfiguracionDescuento } from "@event-promotion/shared-types";
import { Card } from "../../shared/ui";

type Props = { config: ConfiguracionDescuento };

// Los umbrales salen de la configuración que el propio servidor expone (ADR-023), nunca de
// constantes en el cliente: si ventas los cambia desde el admin panel, esta explicación cambia
// con ellos. La regla de fondo es la de ADR-004/ADR-005 (categorías independientes, gana el
// porcentaje más alto, el monto mínimo es estricto).
export function ExplicacionDescuento({ config }: Props) {
  return (
    <Card as="section" aria-labelledby="explicacion-descuento">
      <h2
        id="explicacion-descuento"
        className="font-display text-xs font-semibold uppercase tracking-widest text-apagado"
      >
        Cómo se calcula su descuento
      </h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-tinta">
        <li>
          <strong>Servicios:</strong> 3% al elegir {config.minServicios3pct} o más servicios; 5% al elegir{" "}
          {config.minServicios5pct} o más servicios cuya suma supere{" "}
          {formatearCents(config.montoMinimo5pctServiciosCents)}.
        </li>
        <li>
          <strong>Productos:</strong> 3% al elegir {config.minProductos3pct} o más productos; 5% al elegir{" "}
          {config.minProductos5pct} o más productos.
        </li>
      </ul>
      <p className="mt-3 text-sm text-apagado">
        Los servicios y los productos se calculan por separado, y en cada categoría se aplica el mayor porcentaje que
        usted alcance.
      </p>
    </Card>
  );
}
