import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CrearCatalogoItemRequestSchema, type CrearCatalogoItemRequest } from "@event-promotion/shared-types";
import { formatearCents } from "../../shared/format";
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
    <main>
      <AdminNav />
      <h1>Catálogo</h1>

      <form onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" type="text" {...register("nombre")} />
          {errors.nombre ? <p role="alert">{errors.nombre.message}</p> : null}
        </div>

        <div>
          <label htmlFor="categoria">Categoría</label>
          <select id="categoria" {...register("categoria")}>
            <option value="servicio">Servicio</option>
            <option value="producto">Producto</option>
          </select>
        </div>

        <div>
          <label htmlFor="precioCents">Precio (centavos)</label>
          <input id="precioCents" type="number" min={0} step={1} {...register("precioCents", { valueAsNumber: true })} />
          {errors.precioCents ? <p role="alert">{errors.precioCents.message}</p> : null}
        </div>

        {crear.isError ? <p role="alert">{crear.error.message}</p> : null}
        {crear.isSuccess ? <p role="status">Ítem creado.</p> : null}

        <button type="submit" disabled={crear.isPending}>
          {crear.isPending ? "Creando…" : "Crear ítem"}
        </button>
      </form>

      {catalogoQuery.isLoading ? <p>Cargando…</p> : null}
      {catalogoQuery.data ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Categoría</th>
              <th scope="col">Precio</th>
              <th scope="col">Activo</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {catalogoQuery.data.map((item) => (
              <tr key={item.id}>
                <td>{item.nombre}</td>
                <td>{item.categoria}</td>
                <td>{formatearCents(item.precioCents)}</td>
                <td>{item.activo ? "Sí" : "No"}</td>
                <td>
                  {item.activo ? (
                    <button type="button" disabled={desactivar.isPending} onClick={() => desactivar.mutate(item.id)}>
                      Desactivar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actualizar.isPending}
                      onClick={() =>
                        actualizar.mutate({
                          id: item.id,
                          body: { nombre: item.nombre, categoria: item.categoria, precioCents: item.precioCents, activo: true },
                        })
                      }
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
