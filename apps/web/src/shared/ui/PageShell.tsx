import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "ancho" | "centrado";
};

export function PageShell({ variant = "ancho", className, children, ...props }: Props) {
  const centrado = variant === "centrado";
  return (
    <main
      className={`flex min-h-screen bg-papel px-4 ${centrado ? "items-center justify-center py-12" : "py-10"}`}
    >
      <div
        {...props}
        className={`w-full ${centrado ? "max-w-sm" : "mx-auto max-w-5xl"} ${className ?? ""}`}
      >
        {children}
      </div>
    </main>
  );
}
