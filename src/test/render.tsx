import type { QueryClient } from "@tanstack/react-query";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";

import { AppAdaptersProvider, createAppAdapters, type AppAdapters } from "@/app/adapters";
import { createQueryClient, QueryProvider } from "@/app/query";
import { Provider } from "@/components/ui/provider";

type ProviderOptions = {
  adapters?: AppAdapters | undefined;
  queryClient?: QueryClient | undefined;
  route?: string | undefined;
};

function buildWrapper({ adapters, queryClient, route = "/" }: ProviderOptions) {
  const composedAdapters = adapters ?? createAppAdapters({ source: "mock" });
  const client =
    queryClient ?? createQueryClient({ defaultOptions: { queries: { retry: false } } });

  return function TestProviders({ children }: { children: ReactNode }) {
    return (
      <Provider>
        <AppAdaptersProvider adapters={composedAdapters}>
          <QueryProvider client={client}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </QueryProvider>
        </AppAdaptersProvider>
      </Provider>
    );
  };
}

type RenderWithProvidersOptions = RenderOptions & ProviderOptions;

export function renderWithProviders(
  ui: ReactElement,
  { adapters, queryClient, route = "/", ...options }: RenderWithProvidersOptions = {},
) {
  window.history.pushState({}, "Test page", route);

  return render(ui, {
    wrapper: buildWrapper({ adapters, queryClient, route }),
    ...options,
  });
}

export function renderHookWithProviders<T>(
  hook: () => T,
  { adapters, queryClient, route = "/" }: ProviderOptions = {},
) {
  window.history.pushState({}, "Test page", route);

  return renderHook(hook, { wrapper: buildWrapper({ adapters, queryClient, route }) });
}
