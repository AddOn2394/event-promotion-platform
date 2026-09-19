import { NavLink } from "react-router-dom";

const ENLACES = [
  { to: "/admin/invitaciones", label: "Invitaciones" },
  { to: "/admin/confirmaciones", label: "Confirmaciones" },
  { to: "/admin/catalogo", label: "Catálogo" },
  { to: "/admin/slots", label: "Slots y deadline" },
  { to: "/admin/descuento", label: "Umbrales de descuento" },
];

// Navegación simple entre las pantallas del admin panel (ADR-013) — sin librería de
// layout, coherente con el resto de apps/web (formularios HTML planos).
export function AdminNav() {
  return (
    <nav aria-label="Admin" className="border-b border-borde pb-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
        {ENLACES.map((enlace) => (
          <li key={enlace.to}>
            <NavLink
              to={enlace.to}
              className={({ isActive }) => (isActive ? "text-tinta" : "text-apagado hover:text-jade")}
            >
              {enlace.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
