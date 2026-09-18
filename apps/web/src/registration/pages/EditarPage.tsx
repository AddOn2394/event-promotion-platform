import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  EditarConfirmacionRequestSchema,
  calcularDescuento,
  type ConfirmarAsistenciaItem,
  type EditarConfirmacionRequest,
} from "@event-promotion/shared-types";
import { useClienteSession } from "../../auth/context/ClienteSessionContext";
import { ApiError } from "../../shared/api/client";
import { formatearCents } from "../../shared/format";
import { CajaSeleccionados } from "../components/CajaSeleccionados";
import { CatalogoBuscador } from "../components/CatalogoBuscador";
import { SlotSelector } from "../components/SlotSelector";
import { useCancelarConfirmacion } from "../api/useCancelarConfirmacion";
import { useCatalogo } from "../api/useCatalogo";
import { useConfiguracionDescuento } from "../api/useConfiguracionDescuento";
import { useConfirmacionPropia } from "../api/useConfirmacionPropia";
import { useEditarConfirmacion } from "../api/useEditarConfirmacion";
import { useSlots } from "../api/useSlots";

// HU-4/HU-5: misma UI de selección/slot que ConfirmarPage (HU-3), precargada con la
// confirmación vigente — edita en vez de crear. Cancelar (HU-6) vive en esta misma
// pantalla porque el spec la agrupa como "acciones sobre mi confirmación ya hecha".
export function EditarPage() {
  const navigate = useNavigate();
  const { session, setSession } = useClienteSession();

  const catalogoQuery = useCatalogo();
  const slotsQuery = useSlots();
  const configQuery = useConfiguracionDescuento();
  const confirmacionQuery = useConfirmacionPropia();
  const editar = useEditarConfirmacion();
  const cancelar = useCancelarConfirmacion();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditarConfirmacionRequest>({
    resolver: zodResolver(EditarConfirmacionRequestSchema),
    defaultValues: { items: [], slotId: "", nombreCliente: session?.nombreCliente ?? "" },
  });

  useEffect(() => {
    if (!confirmacionQuery.data) return;
    reset({
      items: confirmacionQuery.data.items.map((item) => ({
        catalogoItemId: item.catalogoItemId,
        categoria: item.categoria,
      })),
      slotId: confirmacionQuery.data.slotId,
      nombreCliente: confirmacionQuery.data.nombreCliente ?? undefined,
    });
  }, [confirmacionQuery.data, reset]);

  const items = watch("items");
  const catalogo = catalogoQuery.data ?? [];

  const seleccionadosIds = useMemo(() => new Set(items.map((item) => item.catalogoItemId)), [items]);
  const itemsSeleccionados = useMemo(
    () => catalogo.filter((item) => seleccionadosIds.has(item.id)),
    [catalogo, seleccionadosIds],
  );

  function agregarItem(item: { id: string; categoria: ConfirmarAsistenciaItem["categoria"] }) {
    if (seleccionadosIds.has(item.id)) return;
    setValue("items", [...items, { catalogoItemId: item.id, categoria: item.categoria }], {
      shouldValidate: true,
    });
  }

  function quitarItem(id: string) {
    setValue(
      "items",
      items.filter((item) => item.catalogoItemId !== id),
      { shouldValidate: true },
    );
  }

  const preview = useMemo(() => {
    if (!configQuery.data) return null;
    const itemsParaDescuento = itemsSeleccionados.map((item) => ({
      categoria: item.categoria,
      precioCents: item.precioCents,
    }));
    return calcularDescuento(itemsParaDescuento, configQuery.data);
  }, [itemsSeleccionados, configQuery.data]);

  const onSubmit = handleSubmit((values) => {
    editar.mutate(values, {
      onError: manejarErrorDeSesion,
    });
  });

  function manejarErrorDeSesion(error: Error) {
    if (error instanceof ApiError && error.status === 401) {
      setSession(null);
      navigate("/login", { replace: true });
    }
  }

  function onCancelar() {
    if (!window.confirm("¿Seguro que querés cancelar tu asistencia? Podés reconfirmar después con tu mismo código.")) {
      return;
    }
    cancelar.mutate(undefined, { onError: manejarErrorDeSesion });
  }

  const sesionExpirada = [
    catalogoQuery.error,
    slotsQuery.error,
    configQuery.error,
    confirmacionQuery.error,
  ].some((error) => error instanceof ApiError && error.status === 401);

  const sinConfirmacionPrevia = confirmacionQuery.error instanceof ApiError && confirmacionQuery.error.status === 404;

  useEffect(() => {
    if (sesionExpirada) setSession(null);
    if (!session || sesionExpirada) navigate("/login", { replace: true });
    else if (sinConfirmacionPrevia) navigate("/confirmar", { replace: true });
  }, [session, sesionExpirada, sinConfirmacionPrevia, navigate, setSession]);

  if (!session) return null;

  if (
    catalogoQuery.isPending ||
    slotsQuery.isPending ||
    configQuery.isPending ||
    confirmacionQuery.isPending
  ) {
    return (
      <main>
        <p>Cargando…</p>
      </main>
    );
  }

  if (sinConfirmacionPrevia) return null;

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError || confirmacionQuery.isError) {
    return (
      <main>
        <p role="alert">No se pudo cargar tu confirmación. Intentá de nuevo más tarde.</p>
      </main>
    );
  }

  if (confirmacionQuery.data?.estado === "cancelada") {
    return (
      <main>
        <p>Tu confirmación está cancelada. Volvé a confirmar tu asistencia cuando quieras con tu mismo código.</p>
      </main>
    );
  }

  if (cancelar.isSuccess) {
    return (
      <main>
        <h1>Cancelaste tu asistencia</h1>
        <p>Podés reconfirmar cuando quieras con tu mismo código.</p>
      </main>
    );
  }

  if (editar.isSuccess) {
    return (
      <main>
        <h1>Cambios guardados</h1>
        <p>Servicios: {formatearCents(editar.data.subtotalServiciosCents)} — descuento {editar.data.descuentoServiciosPct}%</p>
        <p>Productos: {formatearCents(editar.data.subtotalProductosCents)} — descuento {editar.data.descuentoProductosPct}%</p>
        <p>Total: {formatearCents(editar.data.totalCents)}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Editar mi confirmación</h1>

      <CatalogoBuscador catalogo={catalogo} seleccionadosIds={seleccionadosIds} onAgregar={agregarItem} />

      {preview ? (
        <>
          <CajaSeleccionados
            titulo="Servicios seleccionados"
            items={itemsSeleccionados.filter((item) => item.categoria === "servicio")}
            subtotalCents={preview.servicios.subtotalCents}
            descuentoPct={preview.servicios.descuentoPct}
            totalCents={preview.servicios.totalCents}
            onQuitar={quitarItem}
          />
          <CajaSeleccionados
            titulo="Productos seleccionados"
            items={itemsSeleccionados.filter((item) => item.categoria === "producto")}
            subtotalCents={preview.productos.subtotalCents}
            descuentoPct={preview.productos.descuentoPct}
            totalCents={preview.productos.totalCents}
            onQuitar={quitarItem}
          />
          <p>
            <strong>Preview — el servidor recalcula el total final al guardar, este valor no es definitivo.</strong>
          </p>
        </>
      ) : null}
      {errors.items ? <p role="alert">{errors.items.message}</p> : null}

      <form onSubmit={onSubmit} noValidate>
        <SlotSelector slots={slotsQuery.data ?? []} registration={register("slotId")} error={errors.slotId?.message} />

        <div>
          <label htmlFor="nombreCliente">Nombre</label>
          <input
            id="nombreCliente"
            type="text"
            {...register("nombreCliente", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
          />
          {errors.nombreCliente ? <p role="alert">{errors.nombreCliente.message}</p> : null}
        </div>

        {editar.isError ? <p role="alert">{editar.error.message}</p> : null}

        <button type="submit" disabled={editar.isPending}>
          {editar.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <button type="button" onClick={onCancelar} disabled={cancelar.isPending}>
        {cancelar.isPending ? "Cancelando…" : "Cancelar mi asistencia"}
      </button>
      {cancelar.isError ? <p role="alert">{cancelar.error.message}</p> : null}
    </main>
  );
}
