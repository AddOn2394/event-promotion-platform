import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ConfirmarAsistenciaRequestSchema,
  calcularDescuento,
  type ConfirmarAsistenciaItem,
  type ConfirmarAsistenciaRequest,
} from "@event-promotion/shared-types";
import { useClienteSession } from "../../auth/context/ClienteSessionContext";
import { ApiError } from "../../shared/api/client";
import { Button, Field, Input, PageHeader, PageShell, StatusMessage } from "../../shared/ui";
import { CajaSeleccionados } from "../components/CajaSeleccionados";
import { CatalogoBuscador } from "../components/CatalogoBuscador";
import { ExplicacionDescuento } from "../components/ExplicacionDescuento";
import { ReciboConfirmacion } from "../components/ReciboConfirmacion";
import { SlotSelector } from "../components/SlotSelector";
import { useCatalogo } from "../api/useCatalogo";
import { useConfiguracionDescuento } from "../api/useConfiguracionDescuento";
import { useConfirmarAsistencia } from "../api/useConfirmarAsistencia";
import { useSlots } from "../api/useSlots";

export function ConfirmarPage() {
  const navigate = useNavigate();
  const { session, setSession } = useClienteSession();

  const catalogoQuery = useCatalogo();
  const slotsQuery = useSlots();
  const configQuery = useConfiguracionDescuento();
  const confirmar = useConfirmarAsistencia();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConfirmarAsistenciaRequest>({
    resolver: zodResolver(ConfirmarAsistenciaRequestSchema),
    defaultValues: { items: [], slotId: "", nombreCliente: session?.nombreCliente ?? "" },
  });

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

  // Preview no autoritativo (HU-3) — misma función que apps/api usa como fuente de
  // verdad real (ADR-025), pero con los umbrales que el propio servidor expone.
  const preview = useMemo(() => {
    if (!configQuery.data) return null;
    const itemsParaDescuento = itemsSeleccionados.map((item) => ({
      categoria: item.categoria,
      precioCents: item.precioCents,
    }));
    return calcularDescuento(itemsParaDescuento, configQuery.data);
  }, [itemsSeleccionados, configQuery.data]);

  const onSubmit = handleSubmit((values) => {
    confirmar.mutate(values, {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
          navigate("/login", { replace: true });
        }
        // HU-4: ya existe una confirmación 'confirmada' — el camino correcto es editar, no
        // reintentar un segundo POST (ese caso ya debería haberse evitado desde LoginPage,
        // pero un cliente con dos pestañas abiertas puede llegar aquí igual).
        if (error instanceof ApiError && error.status === 409) {
          navigate("/editar", { replace: true });
        }
      },
    });
  });

  // La cookie httpOnly (24h TTL) puede expirar mientras la sesión en sessionStorage
  // (sin expiración propia) sigue presente — un 401 de cualquiera de las tres queries
  // es tan autoritativo como !session para mandar de vuelta a /login.
  const sesionExpirada = [catalogoQuery.error, slotsQuery.error, configQuery.error].some(
    (error) => error instanceof ApiError && error.status === 401,
  );

  useEffect(() => {
    if (sesionExpirada) setSession(null);
    if (!session || sesionExpirada) navigate("/login", { replace: true });
  }, [session, sesionExpirada, navigate, setSession]);

  if (!session) return null;

  if (catalogoQuery.isPending || slotsQuery.isPending || configQuery.isPending) {
    return (
      <PageShell variant="centrado">
        <StatusMessage tono="carga">Cargando…</StatusMessage>
      </PageShell>
    );
  }

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError) {
    return (
      <PageShell variant="centrado">
        <StatusMessage tono="error">
          No se pudo cargar la información del formulario. Actualice la página o intente de nuevo en unos minutos.
        </StatusMessage>
      </PageShell>
    );
  }

  if (confirmar.isSuccess) {
    return (
      <PageShell variant="centrado">
        <PageHeader
          title="Su asistencia está confirmada"
          subtitle="Este es el detalle de su selección."
          className="text-center"
        />
        <ReciboConfirmacion
          items={itemsSeleccionados}
          slot={slotsQuery.data.find((slot) => slot.id === slotIdElegido)}
          totales={confirmar.data}
          editableHastaEn={confirmar.data.editableHastaEn}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Feria de Promociones"
        title="Confirmar asistencia"
        subtitle="Elija los servicios y productos que le interesan, reserve un horario y confirme. Recibirá un correo con el detalle de su selección."
      />
      <ol className="mt-4 list-decimal pl-5 text-sm text-tinta">
        <li>Elija los servicios y productos de su interés en el catálogo.</li>
        <li>Seleccione el horario al que desea asistir.</li>
        <li>Revise su selección y confirme su asistencia.</li>
      </ol>

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
              hint="Si desea corregirlo o completarlo, escríbalo aquí; de lo contrario se conserva el nombre de su invitación."
            >
              <Input
                type="text"
                {...register("nombreCliente", { setValueAs: (v: string) => (v === "" ? undefined : v) })}
              />
            </Field>

            {confirmar.isError ? (
              <StatusMessage id="confirmar-error" tono="error">
                {confirmar.error.message}
              </StatusMessage>
            ) : null}

            <Button
              type="submit"
              disabled={confirmar.isPending}
              aria-describedby={confirmar.isError ? "confirmar-error" : undefined}
              className="self-start"
            >
              {confirmar.isPending ? "Confirmando…" : "Confirmar asistencia"}
            </Button>
          </form>
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
              Los totales mostrados son una estimación: el total definitivo lo calcula el servidor al confirmar.
            </p>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
