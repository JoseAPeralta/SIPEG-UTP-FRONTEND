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
      css: false,
      deps: {
        optimizer: {
          client: {
            enabled: true,
            include: [
              "@chakra-ui/react",
              "@emotion/react",
              "@tanstack/react-query",
              "@testing-library/react",
              "@testing-library/user-event",
              "react-router",
            ],
          },
        },
      },
      environment: "jsdom",
      fsModuleCache: true,
      globals: true,
      setupFiles: ["./src/setupTests.ts"],
      testTimeout: 15000,
    },
  }),
);
