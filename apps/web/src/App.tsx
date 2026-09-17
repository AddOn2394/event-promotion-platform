import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLoginPage } from "./admin/pages/AdminLoginPage";
import { InvitacionesPage } from "./admin/pages/InvitacionesPage";
import { LoginPage } from "./auth/pages/LoginPage";
import { ConfirmarPage } from "./registration/pages/ConfirmarPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/confirmar" element={<ConfirmarPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/invitaciones" element={<InvitacionesPage />} />
    </Routes>
  );
}
