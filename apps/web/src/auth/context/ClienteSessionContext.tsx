import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Igual que AdminSessionContext: la cookie httpOnly (ADR-011) es la única autoridad real.
// Esto solo guarda email/nombreCliente en memoria para prellenar /confirmar (HU-3) y para
// que la pantalla sepa que nunca pasó por /login sin tener que adivinarlo desde un 401.
type ClienteSession = { email: string; nombreCliente: string | null } | null;

type ClienteSessionContextValue = {
  session: ClienteSession;
  setSession: (session: ClienteSession) => void;
};

const ClienteSessionContext = createContext<ClienteSessionContextValue | null>(null);

const STORAGE_KEY = "cliente-session";

function leerSesionInicial(): ClienteSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClienteSession) : null;
  } catch {
    return null;
  }
}

export function ClienteSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ClienteSession>(leerSesionInicial);

  const setSession = (next: ClienteSession) => {
    setSessionState(next);
    try {
      if (next) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // sessionStorage puede fallar (ventana privada) — la sesión real sigue siendo la cookie.
    }
  };

  const value = useMemo(() => ({ session, setSession }), [session]);

  return <ClienteSessionContext.Provider value={value}>{children}</ClienteSessionContext.Provider>;
}

export function useClienteSession(): ClienteSessionContextValue {
  const ctx = useContext(ClienteSessionContext);
  if (!ctx) {
    throw new Error("useClienteSession debe usarse dentro de ClienteSessionProvider");
  }
  return ctx;
}
