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
      <main>
        <p>Cargando…</p>
      </main>
    );
  }

  if (catalogoQuery.isError || slotsQuery.isError || configQuery.isError) {
    return (
      <main>
        <p role="alert">No se pudo cargar la información del formulario. Intentá de nuevo más tarde.</p>
      </main>
    );
  }

  if (confirmar.isSuccess) {
    return (
      <main>
        <h1>Confirmación registrada</h1>
        <p>Servicios: {formatearCents(confirmar.data.subtotalServiciosCents)} — descuento {confirmar.data.descuentoServiciosPct}%</p>
        <p>Productos: {formatearCents(confirmar.data.subtotalProductosCents)} — descuento {confirmar.data.descuentoProductosPct}%</p>
        <p>Total: {formatearCents(confirmar.data.totalCents)}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Confirmar asistencia</h1>

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
            <strong>Preview — el servidor recalcula el total final al confirmar, este valor no es definitivo.</strong>
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

        {confirmar.isError ? (
          <p role="alert">
            {confirmar.error instanceof ApiError && confirmar.error.status === 409
              ? "Ya existe una confirmación para esta invitación."
              : confirmar.error.message}
          </p>
        ) : null}

        <button type="submit" disabled={confirmar.isPending}>
          {confirmar.isPending ? "Confirmando…" : "Confirmar asistencia"}
        </button>
      </form>
    </main>
  );
}
