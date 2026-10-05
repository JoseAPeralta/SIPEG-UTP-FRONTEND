import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppAdaptersProvider } from "./AppAdaptersProvider";
import { useAppAdapters } from "./appAdaptersContext";
import { createAppAdapters } from "./createAppAdapters";

function AdapterProbe() {
  const adapters = useAppAdapters();

  return <p>{typeof adapters.activityCatalog.loadCatalog}</p>;
}

describe("AppAdaptersProvider", () => {
  it("should expose the composed adapters to consumers", () => {
    render(
      <AppAdaptersProvider adapters={createAppAdapters({ source: "mock" })}>
        <AdapterProbe />
      </AppAdaptersProvider>,
    );

    expect(screen.getByText("function")).toBeInTheDocument();
  });

  it("should fail loudly when a consumer is rendered outside the provider", () => {
    expect(() => render(<AdapterProbe />)).toThrow(/AppAdaptersProvider/);
  });
});
