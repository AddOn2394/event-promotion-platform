import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLoginPage } from "./admin/pages/AdminLoginPage";
import { CatalogoAdminPage } from "./admin/pages/CatalogoAdminPage";
import { ConfiguracionDescuentoPage } from "./admin/pages/ConfiguracionDescuentoPage";
import { ConfirmacionesPage } from "./admin/pages/ConfirmacionesPage";
import { InvitacionesPage } from "./admin/pages/InvitacionesPage";
import { SlotsAdminPage } from "./admin/pages/SlotsAdminPage";
import { LoginPage } from "./auth/pages/LoginPage";
import { ConfirmarPage } from "./registration/pages/ConfirmarPage";
import { EditarPage } from "./registration/pages/EditarPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/confirmar" element={<ConfirmarPage />} />
      <Route path="/editar" element={<EditarPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/invitaciones" element={<InvitacionesPage />} />
      <Route path="/admin/confirmaciones" element={<ConfirmacionesPage />} />
      <Route path="/admin/catalogo" element={<CatalogoAdminPage />} />
      <Route path="/admin/slots" element={<SlotsAdminPage />} />
      <Route path="/admin/descuento" element={<ConfiguracionDescuentoPage />} />
    </Routes>
  );
}
