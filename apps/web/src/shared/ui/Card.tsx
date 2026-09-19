import type { ElementType, HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLElement> & { as?: ElementType };

export function Card({ as: Componente = "div", className, ...props }: Props) {
  return <Componente {...props} className={`rounded-md border border-borde bg-superficie p-5 ${className ?? ""}`} />;
}
