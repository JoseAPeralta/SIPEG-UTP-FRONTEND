import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

function serviceWorkerAsset(): Plugin {
  return {
    apply: "build",
    generateBundle() {
      this.emitFile({
        fileName: "sw.js",
        source: readFileSync(resolvePath("./src/pwa/serviceWorker.js"), "utf8"),
        type: "asset",
      });
    },
    name: "sipeg-service-worker",
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerAsset()],
  resolve: {
    alias: {
      "@": resolvePath("./src"),
      "@components": resolvePath("./src/components"),
      "@hooks": resolvePath("./src/hooks"),
      "@pages": resolvePath("./src/pages"),
      "@store": resolvePath("./src/store"),
      "@theme": resolvePath("./src/theme"),
      "@utils": resolvePath("./src/utils"),
    },
  },
});
