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
import { formatearFechaLimite } from "../../shared/format";
import { Button, Field, Input, PageHeader, PageShell, StatusMessage } from "../../shared/ui";
import { CajaSeleccionados } from "../components/CajaSeleccionados";
import { CatalogoBuscador } from "../components/CatalogoBuscador";
import { ExplicacionDescuento } from "../components/ExplicacionDescuento";
import { ReciboConfirmacion } from "../components/ReciboConfirmacion";
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
  const slotIdElegido = watch("slotId");
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
    if (
      !window.confirm(
        "¿Está seguro de que desea cancelar su asistencia? El horario que tiene reservado quedará liberado. Podrá volver a confirmar más adelante con el mismo correo y código, sujeto a disponibilidad de cupo.",
      )
    ) {
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
        <StatusMessage tono="error">
          No se pudo cargar su confirmación. Actualice la página o intente de nuevo en unos minutos.
        </StatusMessage>
      </PageShell>
    );
  }

  if (confirmacionQuery.data?.estado === "cancelada") {
    return (
      <PageShell variant="centrado" className="text-center">
        <p className="text-tinta">
          Su confirmación está cancelada. Para asistir a la feria, vuelva a confirmar su asistencia con el mismo correo
          y código.
        </p>
      </PageShell>
    );
  }

  if (cancelar.isSuccess) {
    return (
      <PageShell variant="centrado" className="text-center">
        <PageHeader
          title="Su asistencia fue cancelada"
          subtitle="El horario que tenía reservado quedó liberado y recibirá un correo de confirmación. Si cambia de opinión, puede volver a confirmar con el mismo correo y código, mientras haya cupo disponible."
        />
      </PageShell>
    );
  }

  if (editar.isSuccess) {
    return (
      <PageShell variant="centrado">
        <PageHeader
          title="Sus cambios fueron guardados"
          subtitle="Este es el detalle vigente de su selección."
          className="text-center"
        />
        <ReciboConfirmacion
          items={itemsSeleccionados}
          slot={slotsQuery.data.find((slot) => slot.id === slotIdElegido)}
          totales={editar.data}
          editableHastaEn={editar.data.editableHastaEn}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Feria de Promociones"
        title="Editar mi confirmación"
        subtitle={
          <>
            Modifique su selección o su horario y guarde los cambios. Puede hacerlo hasta el{" "}
            <strong>{formatearFechaLimite(confirmacionQuery.data.editableHastaEn)}</strong>; pasada esa fecha,
            comuníquese con el departamento de ventas.
          </>
        }
      />

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

            <Field
              label="Nombre"
              htmlFor="nombreCliente"
              error={errors.nombreCliente?.message}
              hint="Se conserva el nombre de su confirmación actual si lo deja sin cambios."
            >
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
            <p className="mb-3 text-sm text-apagado">
              Si ya no puede asistir, puede cancelar su asistencia: el horario que tiene reservado quedará disponible
              para otras personas.
            </p>
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
            <ExplicacionDescuento config={configQuery.data} />
            <p className="text-xs text-apagado">
              Los totales mostrados son una estimación: el total definitivo lo calcula el servidor al guardar.
            </p>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
