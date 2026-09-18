import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EstadoInvitacionAdmin } from "@event-promotion/shared-types";
import { API_URL } from "../../shared/api/client";
import { formatearCents } from "../../shared/format";
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
    <main>
      <AdminNav />
      <h1>Confirmaciones</h1>

      <div>
        <label htmlFor="filtro-estado">Filtrar por estado</label>
        <select
          id="filtro-estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoInvitacionAdmin | "")}
        >
          <option value="">Todos</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {ETIQUETA_ESTADO[estado]}
            </option>
          ))}
        </select>
      </div>

      <p>
        <a href={`${API_URL}/admin/confirmaciones/export.csv`}>Exportar CSV</a>
      </p>

      {confirmacionesQuery.isLoading ? <p>Cargando…</p> : null}
      {confirmacionesQuery.isError ? <p role="alert">No se pudo cargar el listado.</p> : null}
      {confirmacionesQuery.data ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Nombre</th>
              <th scope="col">Estado</th>
              <th scope="col">Slot</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {confirmacionesQuery.data.map((c) => (
              <tr key={c.idinvitacion}>
                <td>{c.email}</td>
                <td>{c.nombreCliente ?? "—"}</td>
                <td>{ETIQUETA_ESTADO[c.estado]}</td>
                <td>{c.slot ? new Date(c.slot.fechaHoraInicio).toLocaleString() : "—"}</td>
                <td>{c.totalCents !== null ? formatearCents(c.totalCents) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
