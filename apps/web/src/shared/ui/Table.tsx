import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`w-full border-collapse text-sm ${props.className ?? ""}`} />;
}

export function TableHeaderRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      {...props}
      className={`border-b border-borde text-left text-xs uppercase tracking-wide text-apagado ${props.className ?? ""}`}
    />
  );
}

type CeldaProps = { last?: boolean };

export function TableHeaderCell({ className, last, ...props }: ThHTMLAttributes<HTMLTableCellElement> & CeldaProps) {
  return <th scope="col" {...props} className={`py-2 ${last ? "" : "pr-4"} ${className ?? ""}`} />;
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={`border-b border-borde/60 ${props.className ?? ""}`} />;
}

export function TableCell({ className, last, ...props }: TdHTMLAttributes<HTMLTableCellElement> & CeldaProps) {
  return <td {...props} className={`py-2 ${last ? "" : "pr-4"} text-tinta ${className ?? ""}`} />;
}
