import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminSessionProvider } from "../admin/context/AdminSessionContext";
import { ClienteSessionProvider } from "../auth/context/ClienteSessionContext";

export function renderWithProviders(ui: ReactElement, { initialEntries = ["/"] }: { initialEntries?: string[] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSessionProvider>
        <ClienteSessionProvider>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </ClienteSessionProvider>
      </AdminSessionProvider>
    </QueryClientProvider>,
  );
}
