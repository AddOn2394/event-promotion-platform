import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  titleAs?: "h1" | "h2";
  subtitle?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, titleAs = "h1", subtitle, className }: Props) {
  const Titulo = titleAs;
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-jade">{eyebrow}</p>
      ) : null}
      <Titulo className={`font-display text-2xl font-bold text-tinta ${eyebrow ? "mt-1" : ""}`}>{title}</Titulo>
      {subtitle ? <p className="mt-1 text-sm text-apagado">{subtitle}</p> : null}
    </div>
  );
}
