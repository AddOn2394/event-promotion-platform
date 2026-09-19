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
import { Button, Card, Field, Input, PageHeader, PageShell, StatusMessage } from "../../shared/ui";
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
      <PageShell variant="centrado">
        <StatusMessage tono="carga">Cargando…</StatusMessage>
      </PageShell>
    );
  }

  if (sinConfirmacionPrevia) return null;

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError || confirmacionQuery.isError) {
    return (
      <PageShell variant="centrado">
        <StatusMessage tono="error">No se pudo cargar tu confirmación. Intentá de nuevo más tarde.</StatusMessage>
      </PageShell>
    );
  }

  if (confirmacionQuery.data?.estado === "cancelada") {
    return (
      <PageShell variant="centrado" className="text-center">
        <p className="text-tinta">
          Tu confirmación está cancelada. Volvé a confirmar tu asistencia cuando quieras con tu mismo código.
        </p>
      </PageShell>
    );
  }

  if (cancelar.isSuccess) {
    return (
      <PageShell variant="centrado" className="text-center">
        <PageHeader
          title="Cancelaste tu asistencia"
          subtitle="Podés reconfirmar cuando quieras con tu mismo código."
        />
      </PageShell>
    );
  }

  if (editar.isSuccess) {
    return (
      <PageShell variant="centrado">
        <PageHeader title="Cambios guardados" className="text-center" />
        <Card className="mt-4 text-left text-sm">
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
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Feria de Promociones" title="Editar mi confirmación" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <CatalogoBuscador
            catalogo={catalogo}
            seleccionadosIds={seleccionadosIds}
            onAgregar={agregarItem}
            describedBy={errors.items ? "items-error" : undefined}
          />
          {errors.items ? (
            <StatusMessage id="items-error" tono="error">
              {errors.items.message}
            </StatusMessage>
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
              <StatusMessage id="editar-error" tono="error">
                {editar.error.message}
              </StatusMessage>
            ) : null}

            <Button
              type="submit"
              disabled={editar.isPending}
              aria-describedby={editar.isError ? "editar-error" : undefined}
              className="self-start"
            >
              {editar.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>

          <div className="border-t border-borde pt-4">
            <Button
              type="button"
              variant="danger"
              onClick={onCancelar}
              disabled={cancelar.isPending}
              aria-describedby={cancelar.isError ? "cancelar-error" : undefined}
            >
              {cancelar.isPending ? "Cancelando…" : "Cancelar mi asistencia"}
            </Button>
            {cancelar.isError ? (
              <StatusMessage id="cancelar-error" tono="error" className="mt-2">
                {cancelar.error.message}
              </StatusMessage>
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
    </PageShell>
  );
}
