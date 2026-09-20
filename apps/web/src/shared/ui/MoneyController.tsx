import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { MoneyInput, type MoneyInputProps } from "./MoneyInput";

type Props<T extends FieldValues> = Omit<MoneyInputProps, "value" | "onChange" | "name"> & {
  name: Path<T>;
  control: Control<T>;
};

// MoneyInput conectado a react-hook-form. Existe como componente propio (y no como un
// <Controller> dentro del <Field>) porque Field inyecta id/aria-invalid/aria-describedby con
// cloneElement en su hijo DIRECTO: si ese hijo fuera un <Controller>, los descartaría y el label
// quedaría sin control asociado. Este componente sí los recibe y se los pasa al <input>.
export function MoneyController<T extends FieldValues>({ name, control, ...resto }: Props<T>) {
  const { field } = useController({ name, control });
  return (
    <MoneyInput
      {...resto}
      name={field.name}
      ref={field.ref}
      value={field.value as number | undefined}
      onChange={field.onChange}
      onBlur={field.onBlur}
    />
  );
}
