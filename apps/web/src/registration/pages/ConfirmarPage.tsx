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
import { formatearCents } from "../../shared/format";
import { Button, Field, Input } from "../../shared/ui";
import { CajaSeleccionados } from "../components/CajaSeleccionados";
import { CatalogoBuscador } from "../components/CatalogoBuscador";
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
      <main className="flex min-h-screen items-center justify-center bg-papel">
        <p role="status" className="text-apagado">Cargando…</p>
      </main>
    );
  }

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4">
        <p role="alert" className="text-alerta">
          No se pudo cargar la información del formulario. Intentá de nuevo más tarde.
        </p>
      </main>
    );
  }

  if (confirmar.isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-tinta">Confirmación registrada</h1>
          <div className="mt-4 rounded-lg border border-dashed border-borde bg-superficie p-5 text-left text-sm">
            <p className="flex justify-between text-tinta">
              <span>Servicios</span>
              <span className="font-mono tabular-nums">
                {formatearCents(confirmar.data.subtotalServiciosCents)} — {confirmar.data.descuentoServiciosPct}%
              </span>
            </p>
            <p className="mt-1 flex justify-between text-tinta">
              <span>Productos</span>
              <span className="font-mono tabular-nums">
                {formatearCents(confirmar.data.subtotalProductosCents)} — {confirmar.data.descuentoProductosPct}%
              </span>
            </p>
            <p className="mt-3 flex justify-between border-t border-borde pt-3 font-semibold text-tinta">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatearCents(confirmar.data.totalCents)}</span>
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
        <h1 className="mt-1 font-display text-2xl font-bold text-tinta">Confirmar asistencia</h1>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="flex flex-col gap-6">
            <CatalogoBuscador
              catalogo={catalogo}
              seleccionadosIds={seleccionadosIds}
              onAgregar={agregarItem}
              describedBy={errors.items ? "items-error" : undefined}
            />
            {errors.items ? (
              <p id="items-error" role="alert" className="text-sm text-alerta">
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

              {confirmar.isError ? (
                <p id="confirmar-error" role="alert" className="text-sm text-alerta">
                  {confirmar.error instanceof ApiError && confirmar.error.status === 409
                    ? "Ya existe una confirmación para esta invitación."
                    : confirmar.error.message}
                </p>
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
              <p className="text-xs text-apagado">
                Preview — el servidor recalcula el total final al confirmar, este valor no es definitivo.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
