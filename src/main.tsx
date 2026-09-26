import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "@/App";
import { AppAdaptersProvider, createAppAdapters } from "@/app/adapters";
import { QueryDevtools, QueryProvider } from "@/app/query";
import { Provider } from "@/components";
import { registerServiceWorker } from "@/pwa/registerServiceWorker";
import "@/styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const adapters = createAppAdapters();

createRoot(rootElement).render(
  <StrictMode>
    <Provider>
      <AppAdaptersProvider adapters={adapters}>
        <QueryProvider>
          <QueryDevtools />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryProvider>
      </AppAdaptersProvider>
    </Provider>
  </StrictMode>,
);

registerServiceWorker();
