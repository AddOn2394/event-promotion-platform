import { Link } from "react-router-dom";

// Navegación simple entre las pantallas del admin panel (ADR-013) — sin librería de
// layout, coherente con el resto de apps/web (formularios HTML planos).
export function AdminNav() {
  return (
    <nav aria-label="Admin">
      <ul>
        <li>
          <Link to="/admin/invitaciones">Invitaciones</Link>
        </li>
        <li>
          <Link to="/admin/confirmaciones">Confirmaciones</Link>
        </li>
        <li>
          <Link to="/admin/catalogo">Catálogo</Link>
        </li>
        <li>
          <Link to="/admin/slots">Slots y deadline</Link>
        </li>
        <li>
          <Link to="/admin/descuento">Umbrales de descuento</Link>
        </li>
      </ul>
    </nav>
  );
}
