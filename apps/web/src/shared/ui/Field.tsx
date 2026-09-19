import { cloneElement, isValidElement, type ReactElement } from "react";
import { StatusMessage } from "./StatusMessage";

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactElement;
};

// aria-invalid/aria-describedby van en el control real (input/select), no en este
// wrapper — cloneElement los inyecta una sola vez acá en vez de repetirlos en cada pantalla.
export function Field({ label, htmlFor, error, hint, children }: Props) {
  const errorId = `${htmlFor}-error`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: htmlFor,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      } as Record<string, unknown>)
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-tinta">
        {label}
      </label>
      {control}
      {hint && !error ? <p className="text-sm text-apagado">{hint}</p> : null}
      {error ? (
        <StatusMessage id={errorId} tono="error">
          {error}
        </StatusMessage>
      ) : null}
    </div>
  );
}
