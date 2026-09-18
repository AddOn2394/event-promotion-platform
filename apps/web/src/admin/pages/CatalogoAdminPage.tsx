import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CrearCatalogoItemRequestSchema, type CrearCatalogoItemRequest } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";
import { Button, Field, Input, Select, Table } from "../../shared/ui";
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
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav />
        <h1 className="font-display text-2xl font-bold text-tinta">Catálogo</h1>

        <form onSubmit={onSubmit} noValidate className="flex max-w-sm flex-col gap-4">
          <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message}>
            <Input type="text" {...register("nombre")} />
          </Field>

          <div>
            <label htmlFor="categoria" className="text-sm font-medium text-tinta">
              Categoría
            </label>
            <Select id="categoria" className="mt-1.5" {...register("categoria")}>
              <option value="servicio">Servicio</option>
              <option value="producto">Producto</option>
            </Select>
          </div>

          <Field label="Precio (centavos)" htmlFor="precioCents" error={errors.precioCents?.message}>
            <Input type="number" min={0} step={1} {...register("precioCents", { valueAsNumber: true })} />
          </Field>

          {crear.isError ? (
            <p role="alert" className="text-sm text-alerta">
              {crear.error.message}
            </p>
          ) : null}
          {crear.isSuccess ? (
            <p role="status" className="text-sm text-jade">
              Ítem creado.
            </p>
          ) : null}

          <Button type="submit" disabled={crear.isPending} className="self-start">
            {crear.isPending ? "Creando…" : "Crear ítem"}
          </Button>
        </form>

        {catalogoQuery.isLoading ? <p className="text-sm text-apagado">Cargando…</p> : null}
        {catalogoQuery.data ? (
          <Table>
            <thead>
              <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-apagado">
                <th scope="col" className="py-2 pr-4">Nombre</th>
                <th scope="col" className="py-2 pr-4">Categoría</th>
                <th scope="col" className="py-2 pr-4">Precio</th>
                <th scope="col" className="py-2 pr-4">Activo</th>
                <th scope="col" className="py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {catalogoQuery.data.map((item) => (
                <tr key={item.id} className="border-b border-borde/60">
                  <td className="py-2 pr-4 text-tinta">{item.nombre}</td>
                  <td className="py-2 pr-4 text-tinta">{item.categoria}</td>
                  <td className="py-2 pr-4 font-mono tabular-nums text-tinta">{formatearCents(item.precioCents)}</td>
                  <td className="py-2 pr-4 text-tinta">{item.activo ? "Sí" : "No"}</td>
                  <td className="py-2">
                    {item.activo ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={desactivar.isPending}
                        onClick={() => desactivar.mutate(item.id)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        {actualizar.isError ? (
          <p role="alert" className="text-sm text-alerta">
            {actualizar.error.message}
          </p>
        ) : null}
        {desactivar.isError ? (
          <p role="alert" className="text-sm text-alerta">
            {desactivar.error.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
