import { escaparHtml } from "./html.js";

// Un correo se describe como datos (bloques), no como HTML: ninguna plantilla escribe
// marcado ni interpola texto de usuario en un string — el escape ocurre en un solo lugar
// (renderizarHtml), así que agregar un correo nuevo no puede olvidarlo. La versión de texto
// plano sale de la misma estructura en vez de derivarse del HTML.
export type BloqueEmail =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "detalle"; filas: { etiqueta: string; valor: string }[] }
  | { tipo: "lista"; titulo: string; items: string[]; ordenada?: boolean }
  | { tipo: "destacado"; etiqueta: string; valor: string }
  | { tipo: "boton"; texto: string; url: string };

export type DocumentoEmail = {
  titulo: string;
  bloques: BloqueEmail[];
  pie: string[];
};

// Colores literales de los tokens de Gate 7 (apps/web/src/index.css): un correo no puede
// leer variables CSS ni cargar las fuentes de la app, así que los valores van en línea.
const COLOR = {
  tinta: "#1a1a18",
  papel: "#faf8f4",
  superficie: "#ffffff",
  jade: "#0f7a5a",
  borde: "#e2e0dc",
  apagado: "#5c5c58",
};
const FUENTE = "Arial, Helvetica, sans-serif";
const FUENTE_MONO = "'Courier New', Courier, monospace";
const NOMBRE_EVENTO = "Feria de Promociones";

function renderizarBloqueHtml(bloque: BloqueEmail): string {
  switch (bloque.tipo) {
    case "parrafo":
      return `<p style="margin:0 0 16px 0;font-family:${FUENTE};font-size:15px;line-height:24px;color:${COLOR.tinta};">${escaparHtml(bloque.texto)}</p>`;

    case "detalle": {
      const filas = bloque.filas
        .map(
          (fila) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLOR.borde};font-family:${FUENTE};font-size:14px;line-height:20px;color:${COLOR.apagado};">${escaparHtml(fila.etiqueta)}</td>` +
            `<td align="right" style="padding:8px 0;border-bottom:1px solid ${COLOR.borde};font-family:${FUENTE};font-size:14px;line-height:20px;color:${COLOR.tinta};">${escaparHtml(fila.valor)}</td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${filas}</table>`;
    }

    case "lista": {
      const etiquetaLista = bloque.ordenada ? "ol" : "ul";
      const items = bloque.items
        .map(
          (item) =>
            `<li style="margin:0 0 6px 0;font-family:${FUENTE};font-size:14px;line-height:20px;color:${COLOR.tinta};">${escaparHtml(item)}</li>`,
        )
        .join("");
      return (
        `<p style="margin:0 0 8px 0;font-family:${FUENTE};font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${COLOR.apagado};">${escaparHtml(bloque.titulo)}</p>` +
        `<${etiquetaLista} style="margin:0 0 20px 0;padding:0 0 0 20px;">${items}</${etiquetaLista}>`
      );
    }

    case "destacado":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">` +
        `<tr><td align="center" bgcolor="${COLOR.papel}" style="padding:20px;border:1px solid ${COLOR.borde};">` +
        `<p style="margin:0 0 8px 0;font-family:${FUENTE};font-size:13px;line-height:18px;color:${COLOR.apagado};">${escaparHtml(bloque.etiqueta)}</p>` +
        `<p style="margin:0;font-family:${FUENTE_MONO};font-size:32px;line-height:40px;font-weight:bold;letter-spacing:8px;color:${COLOR.tinta};">${escaparHtml(bloque.valor)}</p>` +
        `</td></tr></table>`
      );

    case "boton":
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">` +
        `<tr><td align="center" bgcolor="${COLOR.jade}" style="background-color:${COLOR.jade};">` +
        `<a href="${escaparHtml(bloque.url)}" style="display:inline-block;padding:14px 28px;font-family:${FUENTE};font-size:15px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">${escaparHtml(bloque.texto)}</a>` +
        `</td></tr></table>`
      );
  }
}

// Layout de tablas anidadas con estilos en línea, sin CSS externo ni clases: es lo único que
// Outlook (motor de Word) y los clientes web renderizan de forma consistente.
export function renderizarHtml(documento: DocumentoEmail): string {
  const cuerpo = documento.bloques.map(renderizarBloqueHtml).join("");
  const pie = documento.pie
    .map(
      (linea) =>
        `<p style="margin:0 0 6px 0;font-family:${FUENTE};font-size:12px;line-height:18px;color:${COLOR.apagado};">${escaparHtml(linea)}</p>`,
    )
    .join("");

  return (
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escaparHtml(documento.titulo)}</title></head>` +
    `<body style="margin:0;padding:0;background-color:${COLOR.papel};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.papel}">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">` +
    `<tr><td style="padding:0 0 16px 4px;font-family:${FUENTE};font-size:13px;line-height:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${COLOR.jade};">${escaparHtml(NOMBRE_EVENTO)}</td></tr>` +
    `<tr><td bgcolor="${COLOR.superficie}" style="padding:32px 28px;border:1px solid ${COLOR.borde};">` +
    `<h1 style="margin:0 0 20px 0;font-family:${FUENTE};font-size:22px;line-height:30px;font-weight:bold;color:${COLOR.tinta};">${escaparHtml(documento.titulo)}</h1>` +
    cuerpo +
    `</td></tr>` +
    `<tr><td style="padding:16px 4px 0 4px;">${pie}</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function renderizarBloqueTexto(bloque: BloqueEmail): string {
  switch (bloque.tipo) {
    case "parrafo":
      return bloque.texto;
    case "detalle":
      return bloque.filas.map((fila) => `${fila.etiqueta}: ${fila.valor}`).join("\n");
    case "lista":
      return [
        bloque.titulo,
        ...bloque.items.map((item, i) => (bloque.ordenada ? `${i + 1}. ${item}` : `- ${item}`)),
      ].join("\n");
    case "destacado":
      return `${bloque.etiqueta}: ${bloque.valor}`;
    case "boton":
      return `${bloque.texto}: ${bloque.url}`;
  }
}

export function renderizarTexto(documento: DocumentoEmail): string {
  return [
    NOMBRE_EVENTO.toUpperCase(),
    documento.titulo,
    ...documento.bloques.map(renderizarBloqueTexto),
    documento.pie.join("\n"),
  ].join("\n\n");
}
