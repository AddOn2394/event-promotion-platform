import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AdminSessionProvider } from "./admin/context/AdminSessionContext";
import { ClienteSessionProvider } from "./auth/context/ClienteSessionContext";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No se encontró el elemento #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <ClienteSessionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClienteSessionProvider>
      </AdminSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
