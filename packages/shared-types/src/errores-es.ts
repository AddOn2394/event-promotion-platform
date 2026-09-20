import { z } from "zod";

// Mensajes de validación por defecto en español. Zod los emite en inglés ("String must contain
// at least 1 character(s)", "Invalid uuid", "Expected number, received nan") y llegan tal cual a
// pantalla porque los formularios muestran `errors.campo.message`. Un mensaje explícito en un
// schema (`.min(1, "…")`) siempre gana sobre este mapa; el mapa es la red de seguridad para lo
// que no lo tenga, incluidos los schemas futuros.
//
// Se exporta el mapa (y el barrel lo re-exporta) en lugar de depender solo de un import con
// efecto secundario: un bundler puede descartar un módulo cuyo único trabajo es registrar algo.
export const mapaErroresEs: z.ZodErrorMap = (issue) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === z.ZodParsedType.undefined || issue.received === z.ZodParsedType.null) {
        return { message: "Este campo es obligatorio" };
      }
      if (issue.expected === "integer") return { message: "Ingrese un número entero" };
      if (issue.expected === "number") return { message: "Ingrese un número válido" };
      return { message: "El valor ingresado no es válido" };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Ingrese un correo electrónico válido" };
      if (issue.validation === "uuid") return { message: "Seleccione una opción válida" };
      if (issue.validation === "datetime") return { message: "Ingrese una fecha y hora válidas" };
      return { message: "El formato del texto ingresado no es válido" };

    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return {
          message:
            Number(issue.minimum) <= 1
              ? "Este campo no puede quedar vacío"
              : `Ingrese al menos ${issue.minimum} caracteres`,
        };
      }
      if (issue.type === "number") {
        return {
          message: issue.inclusive
            ? `Ingrese un número mayor o igual a ${issue.minimum}`
            : `Ingrese un número mayor que ${issue.minimum}`,
        };
      }
      if (issue.type === "array") return { message: "Seleccione al menos una opción" };
      return { message: "El valor ingresado es demasiado pequeño" };

    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `No puede tener más de ${issue.maximum} caracteres` };
      if (issue.type === "number") return { message: `Ingrese un número menor o igual a ${issue.maximum}` };
      return { message: "El valor ingresado es demasiado grande" };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Seleccione una opción válida" };

    case z.ZodIssueCode.invalid_literal:
      return { message: "El valor ingresado no es válido" };

    case z.ZodIssueCode.unrecognized_keys:
      return { message: "La solicitud incluye campos que no se reconocen" };

    case z.ZodIssueCode.invalid_union:
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: "El valor ingresado no es válido" };

    default:
      return { message: "El valor ingresado no es válido" };
  }
};

z.setErrorMap(mapaErroresEs);
