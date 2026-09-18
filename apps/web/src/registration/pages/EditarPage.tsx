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
import { Button, Field, Input } from "../../shared/ui";
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
      <main className="flex min-h-screen items-center justify-center bg-papel">
        <p className="text-apagado">Cargando…</p>
      </main>
    );
  }

  if (sinConfirmacionPrevia) return null;

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError || confirmacionQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4">
        <p role="alert" className="text-alerta">
          No se pudo cargar tu confirmación. Intentá de nuevo más tarde.
        </p>
      </main>
    );
  }

  if (confirmacionQuery.data?.estado === "cancelada") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4 text-center">
        <p className="text-tinta">
          Tu confirmación está cancelada. Volvé a confirmar tu asistencia cuando quieras con tu mismo código.
        </p>
      </main>
    );
  }

  if (cancelar.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-tinta">Cancelaste tu asistencia</h1>
          <p className="mt-2 text-apagado">Podés reconfirmar cuando quieras con tu mismo código.</p>
        </div>
      </main>
    );
  }

  if (editar.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-tinta">Cambios guardados</h1>
          <div className="mt-4 rounded-lg border border-dashed border-borde bg-superficie p-5 text-left text-sm">
            <p className="flex justify-between text-tinta">
              <span>Servicios</span>
              <span className="font-mono tabular-nums">
                {formatearCents(editar.data.subtotalServiciosCents)} — {editar.data.descuentoServiciosPct}%
              </span>
            </p>
            <p className="mt-1 flex justify-between text-tinta">
              <span>Productos</span>
              <span className="font-mono tabular-nums">
                {formatearCents(editar.data.subtotalProductosCents)} — {editar.data.descuentoProductosPct}%
              </span>
            </p>
            <p className="mt-3 flex justify-between border-t border-borde pt-3 font-semibold text-tinta">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatearCents(editar.data.totalCents)}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-jade">
          Feria de Promociones
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">Editar mi confirmación</h1>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="flex flex-col gap-6">
            <CatalogoBuscador catalogo={catalogo} seleccionadosIds={seleccionadosIds} onAgregar={agregarItem} />
            {errors.items ? (
              <p role="alert" className="text-sm text-alerta">
                {errors.items.message}
              </p>
            ) : null}

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
              <SlotSelector slots={slotsQuery.data ?? []} registration={register("slotId")} error={errors.slotId?.message} />

              <Field label="Nombre" htmlFor="nombreCliente" error={errors.nombreCliente?.message}>
                <Input
                  type="text"
                  {...register("nombreCliente", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
                />
              </Field>

              {editar.isError ? (
                <p role="alert" className="text-sm text-alerta">
                  {editar.error.message}
                </p>
              ) : null}

              <Button type="submit" disabled={editar.isPending} className="self-start">
                {editar.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </form>

            <div className="border-t border-borde pt-4">
              <Button type="button" variant="danger" onClick={onCancelar} disabled={cancelar.isPending}>
                {cancelar.isPending ? "Cancelando…" : "Cancelar mi asistencia"}
              </Button>
              {cancelar.isError ? (
                <p role="alert" className="mt-2 text-sm text-alerta">
                  {cancelar.error.message}
                </p>
              ) : null}
            </div>
          </div>

          {preview ? (
            <div className="flex flex-col gap-4 lg:sticky lg:top-10">
              <CajaSeleccionados
                id="caja-servicios"
                titulo="Servicios seleccionados"
                items={itemsSeleccionados.filter((item) => item.categoria === "servicio")}
                subtotalCents={preview.servicios.subtotalCents}
                descuentoPct={preview.servicios.descuentoPct}
                totalCents={preview.servicios.totalCents}
                onQuitar={quitarItem}
              />
              <CajaSeleccionados
                id="caja-productos"
                titulo="Productos seleccionados"
                items={itemsSeleccionados.filter((item) => item.categoria === "producto")}
                subtotalCents={preview.productos.subtotalCents}
                descuentoPct={preview.productos.descuentoPct}
                totalCents={preview.productos.totalCents}
                onQuitar={quitarItem}
              />
              <p className="text-xs text-apagado">
                Preview — el servidor recalcula el total final al guardar, este valor no es definitivo.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
