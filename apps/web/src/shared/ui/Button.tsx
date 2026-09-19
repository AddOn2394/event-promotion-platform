import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "accent" | "link";
  size?: "sm" | "md";
};

const VARIANTES = {
  primary: "rounded-md bg-jade text-white hover:bg-jade/90",
  secondary: "rounded-md border border-borde-fuerte bg-superficie text-tinta hover:bg-papel",
  danger: "rounded-md border border-alerta text-alerta hover:bg-alerta/5",
  accent:
    "rounded-md border border-jade text-jade hover:bg-jade/10 disabled:border-borde disabled:text-apagado disabled:hover:bg-transparent",
  link: "text-apagado underline hover:text-alerta disabled:no-underline",
};

const TAMANOS = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({ variant = "primary", size = "md", className, ...props }: Props) {
  const esLink = variant === "link";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed ${esLink ? "text-xs" : `${TAMANOS[size]} disabled:opacity-50`} ${VARIANTES[variant]} ${className ?? ""}`}
    />
  );
}
