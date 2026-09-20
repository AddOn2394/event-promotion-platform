const ZONA_HORARIA = "America/Guatemala";
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// El servidor corre en UTC (Render/Docker) pero el evento es en Guatemala: la zona se fija
// explícita, nunca la del proceso. Solo se leen partes numéricas de Intl y los nombres salen
// de tablas propias — el texto no depende del ICU con el que se compiló Node (mismo criterio
// que formatearCents, ADR-031).
const PARTES = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

type Partes = { anio: number; mes: number; dia: number; hora: number; minuto: number };

function leerPartes(fecha: Date): Partes {
  const valores = Object.fromEntries(PARTES.formatToParts(fecha).map((parte) => [parte.type, Number(parte.value)]));
  return {
    anio: valores.year ?? 0,
    mes: valores.month ?? 1,
    dia: valores.day ?? 1,
    hora: valores.hour ?? 0,
    minuto: valores.minute ?? 0,
  };
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatearFecha(fecha: Date): string {
  const { anio, mes, dia } = leerPartes(fecha);
  const diaSemana = DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${diaSemana} ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

export function formatearHora(fecha: Date): string {
  const { hora, minuto } = leerPartes(fecha);
  return `${dosDigitos(hora)}:${dosDigitos(minuto)}`;
}

export function formatearFechaHora(fecha: Date): string {
  return `${formatearFecha(fecha)}, ${formatearHora(fecha)}`;
}
