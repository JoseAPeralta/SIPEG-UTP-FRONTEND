import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryDevtools() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return <ReactQueryDevtools initialIsOpen={false} />;
}
