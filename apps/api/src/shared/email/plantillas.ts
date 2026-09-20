import { formatearCents, type TotalesConfirmacion } from "@event-promotion/shared-types";
import { TELEFONO_VENTAS } from "../contacto.js";
import { renderizarHtml, renderizarTexto, type BloqueEmail, type DocumentoEmail } from "./documento.js";
import { formatearFecha, formatearFechaHora, formatearHora } from "./fechas.js";

export type CorreoRenderizado = { subject: string; html: string; text: string };

const SUFIJO_ASUNTO = "Feria de Promociones";

function armarCorreo(asunto: string, documento: DocumentoEmail): CorreoRenderizado {
  return {
    subject: `${asunto} — ${SUFIJO_ASUNTO}`,
    html: renderizarHtml(documento),
    text: renderizarTexto(documento),
  };
}

function saludo(nombreCliente: string | null): BloqueEmail {
  return { tipo: "parrafo", texto: nombreCliente ? `Buen día, ${nombreCliente}.` : "Buen día." };
}

const PIE_CONTACTO = [
  `¿Tiene alguna duda? Comuníquese con el departamento de ventas al ${TELEFONO_VENTAS}.`,
  "Este es un mensaje automático de la Feria de Promociones; por favor no responda a este correo.",
];

const QUE_ES_LA_FERIA =
  "La Feria de Promociones es nuestro evento anual: usted elige los servicios y productos que le interesan, reserva un horario para asistir y el descuento correspondiente se aplica automáticamente según su selección.";

// Solo la invitación recibe el código de acceso (ADR-011, ADR-024): las plantillas de
// confirmación, edición y cancelación ni siquiera tienen un parámetro para él — repetirlo en
// cada notificación multiplicaría su exposición en la bandeja del cliente.
export function emailInvitacion(params: {
  variante: "invitacion" | "reenvio";
  nombreCliente: string | null;
  codigo: string;
  link: string;
}): CorreoRenderizado {
  const esReenvio = params.variante === "reenvio";
  return armarCorreo(esReenvio ? "Su nuevo código de acceso" : "Su código de acceso", {
    titulo: esReenvio ? "Le enviamos un nuevo código de acceso" : "Está invitado a la Feria de Promociones",
    bloques: [
      saludo(params.nombreCliente),
      {
        tipo: "parrafo",
        texto: esReenvio
          ? "Le enviamos un nuevo código de acceso. El código anterior ya no es válido."
          : QUE_ES_LA_FERIA,
      },
      { tipo: "destacado", etiqueta: "Su código de acceso", valor: params.codigo },
      {
        tipo: "lista",
        titulo: "Cómo confirmar su asistencia",
        ordenada: true,
        items: [
          "Ingrese al sitio con este mismo correo electrónico y el código de arriba.",
          "Elija los servicios y productos que le interesan.",
          "Elija el horario al que desea asistir.",
          "Confirme. Recibirá un correo con el detalle de su selección.",
        ],
      },
      { tipo: "boton", texto: "Confirmar mi asistencia", url: params.link },
      {
        tipo: "parrafo",
        texto: "El código es personal: no lo comparta. Puede usarlo hasta que termine el evento.",
      },
    ],
    pie: PIE_CONTACTO,
  });
}

export type VarianteConfirmacion = "confirmacion" | "reconfirmacion" | "edicion";

export type DetalleConfirmacion = {
  nombreCliente: string | null;
  items: { nombre: string; categoria: "servicio" | "producto"; precioCents: number }[];
  slot: { fechaHoraInicio: Date; fechaHoraFin: Date };
  totales: TotalesConfirmacion;
  editableHasta: Date;
};

const TEXTOS_CONFIRMACION: Record<VarianteConfirmacion, { asunto: string; titulo: string; intro: string }> = {
  confirmacion: {
    asunto: "Confirmación de asistencia",
    titulo: "Su asistencia está confirmada",
    intro: "Confirmamos su asistencia a la Feria de Promociones. Este es el detalle de su selección.",
  },
  reconfirmacion: {
    asunto: "Reconfirmación de asistencia",
    titulo: "Ha vuelto a confirmar su asistencia",
    intro: "Registramos nuevamente su asistencia a la Feria de Promociones. Este es el detalle de su selección.",
  },
  edicion: {
    asunto: "Cambios en su asistencia",
    titulo: "Su confirmación fue actualizada",
    intro: "Actualizamos su selección para la Feria de Promociones. Este es el detalle vigente.",
  },
};

function listaDeItems(titulo: string, items: DetalleConfirmacion["items"]): BloqueEmail[] {
  if (items.length === 0) return [];
  return [
    {
      tipo: "lista",
      titulo,
      items: items.map((item) => `${item.nombre} — ${formatearCents(item.precioCents)}`),
    },
  ];
}

function filaDeCategoria(etiqueta: string, subtotalCents: number, descuentoPct: number) {
  return { etiqueta, valor: `${formatearCents(subtotalCents)} (descuento ${descuentoPct}%)` };
}

export function emailConfirmacion(
  variante: VarianteConfirmacion,
  detalle: DetalleConfirmacion,
  ahora: Date = new Date(),
): CorreoRenderizado {
  const textos = TEXTOS_CONFIRMACION[variante];
  const servicios = detalle.items.filter((item) => item.categoria === "servicio");
  const productos = detalle.items.filter((item) => item.categoria === "producto");
  const { totales } = detalle;

  const filasTotales = [
    ...(servicios.length > 0
      ? [filaDeCategoria("Servicios", totales.subtotalServiciosCents, totales.descuentoServiciosPct)]
      : []),
    ...(productos.length > 0
      ? [filaDeCategoria("Productos", totales.subtotalProductosCents, totales.descuentoProductosPct)]
      : []),
    { etiqueta: "Total con descuento", valor: formatearCents(totales.totalCents) },
  ];

  return armarCorreo(textos.asunto, {
    titulo: textos.titulo,
    bloques: [
      saludo(detalle.nombreCliente),
      { tipo: "parrafo", texto: textos.intro },
      {
        tipo: "detalle",
        filas: [
          { etiqueta: "Fecha", valor: formatearFecha(detalle.slot.fechaHoraInicio) },
          {
            etiqueta: "Horario",
            valor: `${formatearHora(detalle.slot.fechaHoraInicio)} a ${formatearHora(detalle.slot.fechaHoraFin)} (hora de Guatemala)`,
          },
        ],
      },
      ...listaDeItems("Servicios elegidos", servicios),
      ...listaDeItems("Productos elegidos", productos),
      { tipo: "detalle", filas: filasTotales },
      {
        tipo: "parrafo",
        // Al cambiar a un slot más cercano, la fecha límite del slot nuevo puede ya haber
        // pasado (ADR-010 evalúa la elegibilidad contra el slot anterior): no se le dice al
        // cliente que puede editar hasta una fecha que ya es pasado.
        texto:
          detalle.editableHasta.getTime() > ahora.getTime()
            ? `Puede modificar o cancelar su selección hasta el ${formatearFechaHora(detalle.editableHasta)} (hora de Guatemala), ingresando con su mismo correo y código de acceso. Pasada esa fecha, comuníquese con el departamento de ventas al ${TELEFONO_VENTAS}.`
            : `El plazo para modificar o cancelar su selección por su cuenta ya venció. Para cualquier cambio, comuníquese con el departamento de ventas al ${TELEFONO_VENTAS}.`,
      },
    ],
    pie: PIE_CONTACTO,
  });
}

export function emailCancelacion(params: { nombreCliente: string | null }): CorreoRenderizado {
  return armarCorreo("Cancelación de asistencia", {
    titulo: "Su asistencia fue cancelada",
    bloques: [
      saludo(params.nombreCliente),
      {
        tipo: "parrafo",
        texto: "Confirmamos que su asistencia a la Feria de Promociones fue cancelada y que el horario que tenía reservado quedó liberado.",
      },
      {
        tipo: "parrafo",
        texto: "Si cambia de opinión, puede volver a confirmar cuando quiera con el mismo correo y el mismo código con el que ingresó, mientras haya cupo disponible.",
      },
    ],
    pie: PIE_CONTACTO,
  });
}
