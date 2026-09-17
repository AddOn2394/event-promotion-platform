import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// La cookie httpOnly (ADR-013) es la única autoridad de sesión real — el 401 de
// cualquier request es lo que decide. Este contexto solo guarda el email en memoria
// para UX (mostrarlo, evitar que /admin/invitaciones se renderice "a ciegas" sin
// haber pasado nunca por login) — nunca se usa para autorizar nada.
type AdminSession = { email: string } | null;

type AdminSessionContextValue = {
  session: AdminSession;
  setSession: (session: AdminSession) => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

const STORAGE_KEY = "admin-session-email";

function leerSesionInicial(): AdminSession {
  try {
    const email = sessionStorage.getItem(STORAGE_KEY);
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AdminSession>(leerSesionInicial);

  const setSession = (next: AdminSession) => {
    setSessionState(next);
    try {
      if (next) {
        sessionStorage.setItem(STORAGE_KEY, next.email);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // sessionStorage puede fallar (ventana privada) — la sesión real sigue siendo la cookie.
    }
  };

  const value = useMemo(() => ({ session, setSession }), [session]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession debe usarse dentro de AdminSessionProvider");
  }
  return ctx;
}
