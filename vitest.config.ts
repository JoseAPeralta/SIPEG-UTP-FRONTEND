import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/main.tsx", "src/setupTests.ts", "src/test/**", "src/**/*.d.ts"],
        provider: "v8",
        reporter: ["text", "html", "lcov"],
      },
      css: true,
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/setupTests.ts"],
    },
  }),
);
