import type { HTMLAttributes } from "react";

type Tono = "error" | "exito" | "carga" | "vacio";

type Props = HTMLAttributes<HTMLParagraphElement> & {
  tono: Tono;
};

const TONOS: Record<Tono, { role: "alert" | "status"; color: string }> = {
  error: { role: "alert", color: "text-alerta" },
  exito: { role: "status", color: "text-jade" },
  carga: { role: "status", color: "text-apagado" },
  vacio: { role: "status", color: "text-apagado" },
};

// El `id` se reenvía sin tocar (via {...props}) porque varios sitios lo usan como target
// de un aria-describedby en un botón o sección — perderlo desconectaría esa asociación
// de accesibilidad en silencio, sin que ningún test lo detecte.
export function StatusMessage({ tono, className, ...props }: Props) {
  const { role, color } = TONOS[tono];
  return <p role={role} {...props} className={`text-sm ${color} ${className ?? ""}`} />;
}
