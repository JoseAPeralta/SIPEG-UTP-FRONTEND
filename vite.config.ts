import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
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
