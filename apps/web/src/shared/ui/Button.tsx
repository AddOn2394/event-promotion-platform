import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

const VARIANTES = {
  primary: "bg-jade text-white hover:bg-jade/90",
  secondary: "border border-borde-fuerte bg-superficie text-tinta hover:bg-papel",
  danger: "border border-alerta text-alerta hover:bg-alerta/5",
};

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variant]} ${className ?? ""}`}
    />
  );
}
