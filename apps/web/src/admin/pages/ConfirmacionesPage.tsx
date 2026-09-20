import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatearCents, type EstadoInvitacionAdmin } from "@event-promotion/shared-types";
import { API_URL } from "../../shared/api/client";
import {
  Field,
  PageHeader,
  PageShell,
  Select,
  StatusMessage,
  Table,
  TableCell,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "../../shared/ui";
import { useConfirmacionesAdmin } from "../api/useConfirmacionesAdmin";
import { AdminNav } from "../components/AdminNav";
import { useAdminSession } from "../context/AdminSessionContext";

const ETIQUETA_ESTADO: Record<EstadoInvitacionAdmin, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  sin_respuesta: "Sin respuesta",
  rebotada: "Rebotada",
  fallida: "Fallida",
};

const ESTADOS: EstadoInvitacionAdmin[] = ["confirmada", "cancelada", "sin_respuesta", "rebotada", "fallida"];

// HU-8 (ADR-024): listado filtrable por los 5 estados (nunca agrupados, ADR-030) + export CSV. El
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
    <PageShell>
      <div className="flex flex-col gap-6">
        <AdminNav />
        <PageHeader title="Confirmaciones" />

        <div className="flex flex-wrap items-end gap-4">
          <Field label="Filtrar por estado" htmlFor="filtro-estado">
            <Select value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoInvitacionAdmin | "")}>
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETA_ESTADO[estado]}
                </option>
              ))}
            </Select>
          </Field>

          <a
            href={`${API_URL}/admin/confirmaciones/export.csv`}
            className="text-sm font-medium text-jade underline hover:text-jade/80"
          >
            Exportar CSV
          </a>
        </div>

        {confirmacionesQuery.isLoading ? <StatusMessage tono="carga">Cargando…</StatusMessage> : null}
        {confirmacionesQuery.isError ? <StatusMessage tono="error">No se pudo cargar el listado.</StatusMessage> : null}
        {confirmacionesQuery.data?.length === 0 ? (
          <StatusMessage tono="vacio">
            {filtro ? "Ninguna invitación tiene este estado." : "Todavía no hay invitaciones."}
          </StatusMessage>
        ) : null}
        {confirmacionesQuery.data && confirmacionesQuery.data.length > 0 ? (
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Slot</TableHeaderCell>
                <TableHeaderCell last>Total</TableHeaderCell>
              </TableHeaderRow>
            </thead>
            <tbody>
              {confirmacionesQuery.data.map((c) => (
                <TableRow key={c.idinvitacion}>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.nombreCliente ?? "—"}</TableCell>
                  <TableCell>{ETIQUETA_ESTADO[c.estado]}</TableCell>
                  <TableCell>{c.slot ? new Date(c.slot.fechaHoraInicio).toLocaleString() : "—"}</TableCell>
                  <TableCell last className="font-mono tabular-nums">
                    {c.totalCents !== null ? formatearCents(c.totalCents) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        ) : null}
      </div>
    </PageShell>
  );
}
