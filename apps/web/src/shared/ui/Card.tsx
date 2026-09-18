import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-lg border border-borde bg-superficie p-6 ${className ?? ""}`} />
  );
}
