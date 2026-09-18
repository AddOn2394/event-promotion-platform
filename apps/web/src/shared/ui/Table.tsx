import type { TableHTMLAttributes } from "react";

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`w-full border-collapse text-sm ${props.className ?? ""}`} />;
}
