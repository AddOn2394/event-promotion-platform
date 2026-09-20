import { formatearCents, type CatalogoItem, type Slot, type TotalesConfirmacion } from "@event-promotion/shared-types";
import { formatearFechaLimite, formatearHorario } from "../../shared/format";
import { Card } from "../../shared/ui";

type Props = {
  items: CatalogoItem[];
  slot: Pick<Slot, "fechaHoraInicio" | "fechaHoraFin">;
  totales: TotalesConfirmacion;
  editableHastaEn: string;
};

// Recibo de éxito de confirmar (HU-3) y de editar (HU-4/HU-5). Ítems y horario salen de lo que
// el cliente acaba de enviar y el servidor aceptó; los montos y la fecha límite, siempre de la
// respuesta del servidor (ADR-010, ADR-006) — nunca se recalculan acá.
export function ReciboConfirmacion({ items, slot, totales, editableHastaEn }: Props) {
  const servicios = items.filter((item) => item.categoria === "servicio");
  const productos = items.filter((item) => item.categoria === "producto");

  return (
    <div className="mt-6 flex flex-col gap-4 text-left">
      <Card className="flex flex-col gap-4 text-sm">
        <p className="text-tinta">
          <span className="text-apagado">Horario: </span>
          {formatearHorario(slot)}
        </p>

        <ListaDelRecibo titulo="Servicios elegidos" items={servicios} />
        <ListaDelRecibo titulo="Productos elegidos" items={productos} />

        <div className="border-t border-borde pt-3">
          {servicios.length > 0 ? (
            <FilaDelRecibo
              etiqueta="Servicios"
              valor={`${formatearCents(totales.subtotalServiciosCents)} (descuento ${totales.descuentoServiciosPct}%)`}
            />
          ) : null}
          {productos.length > 0 ? (
            <FilaDelRecibo
              etiqueta="Productos"
              valor={`${formatearCents(totales.subtotalProductosCents)} (descuento ${totales.descuentoProductosPct}%)`}
            />
          ) : null}
          <p className="mt-3 flex justify-between font-semibold text-tinta">
            <span>Total con descuento</span>
            <span className="font-mono tabular-nums">{formatearCents(totales.totalCents)}</span>
          </p>
        </div>
      </Card>

      {new Date(editableHastaEn).getTime() > Date.now() ? (
        <p className="text-sm text-tinta">
          Puede modificar o cancelar su selección hasta el <strong>{formatearFechaLimite(editableHastaEn)}</strong>.
          Para hacerlo, ingrese de nuevo con su correo electrónico y su código de acceso.
        </p>
      ) : (
        <p className="text-sm text-tinta">
          El plazo para modificar o cancelar su selección por su cuenta ya venció. Para cualquier cambio, comuníquese
          con el departamento de ventas.
        </p>
      )}
      <p className="text-sm text-apagado">Recibirá un correo con este mismo detalle.</p>
    </div>
  );
}

function ListaDelRecibo({ titulo, items }: { titulo: string; items: CatalogoItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-apagado">{titulo}</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-tinta">
            <span>{item.nombre}</span>
            <span className="font-mono tabular-nums">{formatearCents(item.precioCents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilaDelRecibo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <p className="flex justify-between gap-3 text-tinta">
      <span>{etiqueta}</span>
      <span className="font-mono tabular-nums">{valor}</span>
    </p>
  );
}
