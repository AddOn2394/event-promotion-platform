import { describe, expect, it } from "vitest";
import { escaparHtml } from "./html.js";
import { formatearFecha, formatearFechaHora, formatearHora } from "./fechas.js";
import {
  emailCancelacion,
  emailConfirmacion as armarConfirmacion,
  emailInvitacion,
  type DetalleConfirmacion,
  type VarianteConfirmacion,
} from "./plantillas.js";

const INICIO = new Date("2026-09-26T15:00:00Z"); // 09:00 en Guatemala (UTC-6)
const FIN = new Date("2026-09-26T17:00:00Z");
const LIMITE = new Date("2026-09-21T15:00:00Z");
// Reloj fijo: el texto de la fecha límite depende de si ya pasó, y el test no puede depender de hoy.
const AHORA = new Date("2026-09-19T12:00:00Z");

function emailConfirmacion(variante: VarianteConfirmacion, d: DetalleConfirmacion, ahora: Date = AHORA) {
  return armarConfirmacion(variante, d, ahora);
}

function detalle(sobrescribir: Partial<DetalleConfirmacion> = {}): DetalleConfirmacion {
  return {
    nombreCliente: "Ana Pérez",
    items: [
      { nombre: "Masaje relajante", categoria: "servicio", precioCents: 150000 },
      { nombre: "Crema facial", categoria: "producto", precioCents: 8500 },
    ],
    slot: { fechaHoraInicio: INICIO, fechaHoraFin: FIN },
    totales: {
      subtotalServiciosCents: 150000,
      descuentoServiciosPct: 3,
      subtotalProductosCents: 8500,
      descuentoProductosPct: 0,
      totalCents: 153545,
    },
    editableHasta: LIMITE,
    ...sobrescribir,
  };
}

describe("escaparHtml", () => {
  it("escapa los cinco caracteres con significado en HTML", () => {
    expect(escaparHtml(`<a href="x" onclick='y'>&`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;");
  });
});

describe("escape de datos de usuario en los correos (HU-8, ADR-024)", () => {
  const NOMBRE_HOSTIL = "<script>alert(1)</script>";
  const ITEM_HOSTIL = '"><b>negrita</b>';

  it("confirmación: nombreCliente e ítems hostiles salen escapados en el HTML", () => {
    const { html } = emailConfirmacion(
      "confirmacion",
      detalle({
        nombreCliente: NOMBRE_HOSTIL,
        items: [{ nombre: ITEM_HOSTIL, categoria: "servicio", precioCents: 1000 }],
      }),
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>negrita");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;&gt;&lt;b&gt;negrita&lt;/b&gt;");
  });

  it("invitación: nombreCliente hostil escapado, y el link del botón no puede romper el atributo href", () => {
    const linkHostil = 'https://feria.test/login?email=a"><script>alert(1)</script>';
    const { html } = emailInvitacion({
      variante: "invitacion",
      nombreCliente: NOMBRE_HOSTIL,
      codigo: "123456",
      link: linkHostil,
    });
    expect(html).not.toContain("<script");
    expect(html).toContain('href="https://feria.test/login?email=a&quot;&gt;&lt;script&gt;');
  });

  it("cancelación: nombreCliente hostil escapado", () => {
    const { html } = emailCancelacion({ nombreCliente: NOMBRE_HOSTIL });
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;");
  });

  it("la versión de texto plano no escapa (no es HTML) pero conserva el dato íntegro", () => {
    const { text } = emailConfirmacion("confirmacion", detalle({ nombreCliente: NOMBRE_HOSTIL }));
    expect(text).toContain(NOMBRE_HOSTIL);
  });
});

describe("código de acceso (ADR-011, ADR-024)", () => {
  it("aparece en la invitación y en el reenvío, en HTML y en texto", () => {
    for (const variante of ["invitacion", "reenvio"] as const) {
      const { html, text } = emailInvitacion({ variante, nombreCliente: null, codigo: "482913", link: "https://feria.test/login" });
      expect(html).toContain("482913");
      expect(text).toContain("482913");
      expect(html).toContain("Su código de acceso");
    }
  });

  it("nunca hay un bloque de código de acceso en confirmación, reconfirmación, edición ni cancelación", () => {
    const correos = [
      emailConfirmacion("confirmacion", detalle()),
      emailConfirmacion("reconfirmacion", detalle()),
      emailConfirmacion("edicion", detalle()),
      emailCancelacion({ nombreCliente: "Ana Pérez" }),
    ];
    for (const { html, text } of correos) {
      expect(html).not.toContain("Su código de acceso");
      expect(text).not.toContain("Su código de acceso");
      expect(html).not.toContain("letter-spacing:8px");
    }
  });
});

describe("montos con separador de miles (ADR-031)", () => {
  it("Q1,500.00 en HTML y en texto plano", () => {
    const { html, text } = emailConfirmacion("confirmacion", detalle());
    expect(html).toContain("Q1,500.00");
    expect(text).toContain("Q1,500.00");
    expect(html).not.toContain("Q1500.00");
  });

  it("el total con descuento sale formateado", () => {
    const { text } = emailConfirmacion("confirmacion", detalle());
    expect(text).toContain("Total con descuento: Q1,535.45");
  });
});

describe("contenido explicativo de la confirmación", () => {
  it("incluye ítems por categoría, fecha, horario, fecha límite de edición y contacto de ventas", () => {
    const { html, text } = emailConfirmacion("confirmacion", detalle());
    for (const contenido of [html, text]) {
      expect(contenido).toContain("Masaje relajante");
      expect(contenido).toContain("Crema facial");
      expect(contenido).toContain("sábado 26 de septiembre de 2026");
      expect(contenido).toContain("09:00 a 11:00");
      expect(contenido).toContain("lunes 21 de septiembre de 2026, 09:00");
      expect(contenido).toContain("5555-5555");
    }
  });

  it("omite la fila y la lista de una categoría sin ítems", () => {
    const { text } = emailConfirmacion(
      "confirmacion",
      detalle({ items: [{ nombre: "Masaje relajante", categoria: "servicio", precioCents: 150000 }] }),
    );
    expect(text).toContain("Servicios elegidos");
    expect(text).not.toContain("Productos elegidos");
    expect(text).not.toContain("Productos:");
  });

  it("cada variante tiene su propio asunto y título", () => {
    const asuntos = (["confirmacion", "reconfirmacion", "edicion"] as const).map(
      (v) => emailConfirmacion(v, detalle()).subject,
    );
    expect(new Set(asuntos).size).toBe(3);
    expect(asuntos[0]).toBe("Confirmación de asistencia — Feria de Promociones");
    expect(emailCancelacion({ nombreCliente: null }).subject).toBe("Cancelación de asistencia — Feria de Promociones");
  });

  it("layout compatible con clientes de correo: tablas y estilos en línea, sin <style> ni clases", () => {
    const { html } = emailConfirmacion("confirmacion", detalle());
    expect(html).toContain('role="presentation"');
    expect(html).toContain('style="');
    expect(html).not.toContain("<style");
    expect(html).not.toContain("class=");
  });
});

describe("fecha límite de edición ya vencida", () => {
  it("no promete edición hasta una fecha pasada: remite a ventas (ADR-010, cambio a un slot cercano)", () => {
    const despuesDelLimite = new Date("2026-09-22T00:00:00Z");
    const { html, text } = emailConfirmacion("edicion", detalle(), despuesDelLimite);
    for (const contenido of [html, text]) {
      expect(contenido).toContain("ya venció");
      expect(contenido).not.toContain("hasta el lunes 21 de septiembre");
      expect(contenido).toContain("5555-5555");
    }
  });
});

describe("fechas en hora de Guatemala, independientes de la zona del proceso", () => {
  it("convierte UTC a Guatemala (UTC-6)", () => {
    expect(formatearFecha(INICIO)).toBe("sábado 26 de septiembre de 2026");
    expect(formatearHora(INICIO)).toBe("09:00");
    expect(formatearFechaHora(LIMITE)).toBe("lunes 21 de septiembre de 2026, 09:00");
  });

  it("una hora UTC de madrugada cae en el día anterior en Guatemala", () => {
    const madrugada = new Date("2026-09-26T03:30:00Z");
    expect(formatearFecha(madrugada)).toBe("viernes 25 de septiembre de 2026");
    expect(formatearHora(madrugada)).toBe("21:30");
  });
});
