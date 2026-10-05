import { lazy, Suspense } from "react";

import { resolveQueryDevtools } from "./queryDevtoolsEnvironment";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then(({ ReactQueryDevtools: Component }) => ({
    default: Component,
  })),
);

export function QueryDevtools() {
  if (!resolveQueryDevtools()) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
}
