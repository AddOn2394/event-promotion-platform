import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EstadoInvitacionAdmin } from "@event-promotion/shared-types";
import { API_URL } from "../../shared/api/client";
import { formatearCents } from "../../shared/format";
import { Select, Table } from "../../shared/ui";
import { useConfirmacionesAdmin } from "../api/useConfirmacionesAdmin";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

const ETIQUETA_ESTADO: Record<EstadoInvitacionAdmin, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  sin_respuesta: "Sin respuesta",
  rebotada: "Rebotada",
};

const ESTADOS: EstadoInvitacionAdmin[] = ["confirmada", "cancelada", "sin_respuesta", "rebotada"];

// HU-8 (ADR-024): listado filtrable por los 4 estados (nunca agrupados) + export CSV. El
// export es un link directo al endpoint (Content-Disposition: attachment) — el navegador
// lo descarga con la cookie de sesión de admin, sin que apps/web procese el CSV.
export function ConfirmacionesPage() {
  const navigate = useNavigate();
  const { session } = useAdminSession();
  const [filtro, setFiltro] = useState<EstadoInvitacionAdmin | "">("");
  const confirmacionesQuery = useConfirmacionesAdmin(filtro || undefined);

  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <main className="min-h-screen bg-papel px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <AdminNav />
        <h1 className="font-display text-2xl font-bold text-tinta">Confirmaciones</h1>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="filtro-estado" className="text-sm font-medium text-tinta">
              Filtrar por estado
            </label>
            <Select
              id="filtro-estado"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as EstadoInvitacionAdmin | "")}
              className="mt-1.5"
            >
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETA_ESTADO[estado]}
                </option>
              ))}
            </Select>
          </div>

          <a
            href={`${API_URL}/admin/confirmaciones/export.csv`}
            className="text-sm font-medium text-jade underline hover:text-jade/80"
          >
            Exportar CSV
          </a>
        </div>

        {confirmacionesQuery.isLoading ? <p className="text-sm text-apagado">Cargando…</p> : null}
        {confirmacionesQuery.isError ? (
          <p role="alert" className="text-sm text-alerta">
            No se pudo cargar el listado.
          </p>
        ) : null}
        {confirmacionesQuery.data ? (
          <Table>
            <thead>
              <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-apagado">
                <th scope="col" className="py-2 pr-4">Email</th>
                <th scope="col" className="py-2 pr-4">Nombre</th>
                <th scope="col" className="py-2 pr-4">Estado</th>
                <th scope="col" className="py-2 pr-4">Slot</th>
                <th scope="col" className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {confirmacionesQuery.data.map((c) => (
                <tr key={c.idinvitacion} className="border-b border-borde/60">
                  <td className="py-2 pr-4 text-tinta">{c.email}</td>
                  <td className="py-2 pr-4 text-tinta">{c.nombreCliente ?? "—"}</td>
                  <td className="py-2 pr-4 text-tinta">{ETIQUETA_ESTADO[c.estado]}</td>
                  <td className="py-2 pr-4 text-tinta">{c.slot ? new Date(c.slot.fechaHoraInicio).toLocaleString() : "—"}</td>
                  <td className="py-2 font-mono tabular-nums text-tinta">
                    {c.totalCents !== null ? formatearCents(c.totalCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </div>
    </main>
  );
}
