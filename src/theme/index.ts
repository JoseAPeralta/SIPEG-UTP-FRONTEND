import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        "accent.contrast": { value: { base: "#FFFFFF", _dark: "#2B1209" } },
        "accent.muted": {
          value: { base: "{colors.terracotta.50}", _dark: "{colors.terracotta.950}" },
        },
        "accent.solid": {
          value: { base: "{colors.terracotta.700}", _dark: "{colors.terracotta.300}" },
        },
        "border.subtle": {
          value: { base: "rgba(51, 38, 31, 0.14)", _dark: "rgba(255, 253, 249, 0.14)" },
        },
        "surface.canvas": { value: { base: "#FBF7F2", _dark: "#1C1410" } },
        "surface.raised": { value: { base: "#FFFDF9", _dark: "#261C16" } },
        "surface.subtle": { value: { base: "#F3EAE2", _dark: "#33251C" } },
        "text.default": { value: { base: "#33261F", _dark: "#F7EFE8" } },
        "text.muted": { value: { base: "#6B5A4F", _dark: "#C9B8AC" } },
      },
    },
    tokens: {
      colors: {
        terracotta: {
          50: { value: "#FBF0EA" },
          100: { value: "#F5DED2" },
          200: { value: "#EFBFA6" },
          300: { value: "#E59A72" },
          400: { value: "#D4764B" },
          500: { value: "#C2552F" },
          600: { value: "#AD4523" },
          700: { value: "#9C3A1E" },
          800: { value: "#7E2F18" },
          900: { value: "#6E2411" },
          950: { value: "#4A2413" },
        },
        success: {
          50: { value: "#EAF5EC" },
          100: { value: "#D3EAD8" },
          200: { value: "#ABD4B5" },
          300: { value: "#7DB88D" },
          500: { value: "#3A7D50" },
          600: { value: "#2F6B3A" },
          700: { value: "#245A31" },
          900: { value: "#14351B" },
        },
        warning: {
          50: { value: "#FCF3E7" },
          100: { value: "#F8E5C9" },
          300: { value: "#E9BB85" },
          500: { value: "#C47A1F" },
          600: { value: "#A75E12" },
          700: { value: "#8F520F" },
          900: { value: "#5C3108" },
        },
        danger: {
          50: { value: "#FBE9E7" },
          100: { value: "#F6D2CE" },
          300: { value: "#E49A92" },
          500: { value: "#B3261E" },
          600: { value: "#9E211A" },
          700: { value: "#8A1C16" },
          900: { value: "#5C120E" },
        },
        neutral: {
          50: { value: "#F6F2EF" },
          100: { value: "#EAE2DC" },
          300: { value: "#C7B8AE" },
          500: { value: "#6E5F55" },
          700: { value: "#3C3129" },
          900: { value: "#1E1713" },
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
