import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CrearCatalogoItemRequestSchema, formatearCents, type CrearCatalogoItemRequest } from "@event-promotion/shared-types";
import {
  Button,
  Field,
  Input,
  PageHeader,
  PageShell,
  Select,
  StatusMessage,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "../../shared/ui";
import { useActualizarCatalogoItem } from "../api/useActualizarCatalogoItem";
import { useCatalogoAdmin } from "../api/useCatalogoAdmin";
import { useCrearCatalogoItem } from "../api/useCrearCatalogoItem";
import { useDesactivarCatalogoItem } from "../api/useDesactivarCatalogoItem";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

// HU-9 (ADR-007): CRUD + soft-delete de catálogo. Reactivar un ítem desactivado usa el
// mismo PATCH de reemplazo completo que editar (activo=true).
export function CatalogoAdminPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const catalogoQuery = useCatalogoAdmin();
  const crear = useCrearCatalogoItem();
  const actualizar = useActualizarCatalogoItem();
  const desactivar = useDesactivarCatalogoItem();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrearCatalogoItemRequest>({
    resolver: zodResolver(CrearCatalogoItemRequestSchema),
    defaultValues: { nombre: "", categoria: "servicio", precioCents: 0 },
  });

  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

  const onSubmit = handleSubmit((values) => {
    crear.mutate(values, { onSuccess: () => reset() });
  });

  if (!session) return null;

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <AdminNav />
        <PageHeader title="Catálogo" />

        <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-4">
          <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message}>
            <Input type="text" {...register("nombre")} />
          </Field>

          <Field label="Categoría" htmlFor="categoria">
            <Select {...register("categoria")}>
              <option value="servicio">Servicio</option>
              <option value="producto">Producto</option>
            </Select>
          </Field>

          <Field label="Precio (centavos)" htmlFor="precioCents" error={errors.precioCents?.message}>
            <Input type="number" min={0} step={1} {...register("precioCents", { valueAsNumber: true })} />
          </Field>

          {crear.isError ? <StatusMessage tono="error">{crear.error.message}</StatusMessage> : null}
          {crear.isSuccess ? <StatusMessage tono="exito">Ítem creado.</StatusMessage> : null}

          <Button type="submit" disabled={crear.isPending} className="self-start">
            {crear.isPending ? "Creando…" : "Crear ítem"}
          </Button>
        </form>

        {catalogoQuery.isLoading ? <StatusMessage tono="carga">Cargando…</StatusMessage> : null}
        {catalogoQuery.data?.length === 0 ? (
          <StatusMessage tono="vacio">Todavía no hay ítems en el catálogo. Cree el primero con el formulario de arriba.</StatusMessage>
        ) : null}
        {catalogoQuery.data && catalogoQuery.data.length > 0 ? (
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Categoría</TableHeaderCell>
                <TableHeaderCell>Precio</TableHeaderCell>
                <TableHeaderCell>Activo</TableHeaderCell>
                <TableHeaderCell last>Acción</TableHeaderCell>
              </TableHeaderRow>
            </thead>
            <tbody>
              {catalogoQuery.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nombre}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell className="font-mono tabular-nums">{formatearCents(item.precioCents)}</TableCell>
                  <TableCell>{item.activo ? "Sí" : "No"}</TableCell>
                  <TableCell last>
                    {item.activo ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={desactivar.isPending}
                        onClick={() => desactivar.mutate(item.id)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={actualizar.isPending}
                        onClick={() =>
                          actualizar.mutate({
                            id: item.id,
                            body: { nombre: item.nombre, categoria: item.categoria, precioCents: item.precioCents, activo: true },
                          })
                        }
                      >
                        Reactivar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        ) : null}
        {actualizar.isError ? <StatusMessage tono="error">{actualizar.error.message}</StatusMessage> : null}
        {desactivar.isError ? <StatusMessage tono="error">{desactivar.error.message}</StatusMessage> : null}
      </div>
    </PageShell>
  );
}
