import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        "accent.contrast": { value: { base: "white", _dark: "#130406" } },
        "accent.muted": { value: { base: "{colors.utp.50}", _dark: "{colors.utp.950}" } },
        "accent.solid": { value: { base: "{colors.utp.700}", _dark: "{colors.utp.300}" } },
        "border.subtle": {
          value: { base: "rgba(54, 35, 35, 0.14)", _dark: "rgba(255, 255, 255, 0.14)" },
        },
        "surface.canvas": { value: { base: "#f8f1e7", _dark: "#170f11" } },
        "surface.raised": {
          value: { base: "rgba(255, 252, 246, 0.86)", _dark: "rgba(39, 25, 29, 0.86)" },
        },
        "surface.subtle": { value: { base: "#efe3d2", _dark: "#26191d" } },
        "text.default": { value: { base: "#201717", _dark: "#fff7ef" } },
        "text.muted": { value: { base: "#695a55", _dark: "#d8c7bd" } },
      },
    },
    tokens: {
      colors: {
        graphite: {
          50: { value: "#f6f4f2" },
          100: { value: "#e5ded9" },
          700: { value: "#3c3030" },
          900: { value: "#1b1414" },
        },
        utp: {
          50: { value: "#fff0ed" },
          100: { value: "#ffd6ce" },
          300: { value: "#ff8a78" },
          500: { value: "#e63b31" },
          700: { value: "#a81520" },
          900: { value: "#5d0912" },
          950: { value: "#32040a" },
        },
      },
      fonts: {
        body: { value: "Archivo, ui-sans-serif, system-ui, sans-serif" },
        heading: { value: "'Source Serif 4', Georgia, serif" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
