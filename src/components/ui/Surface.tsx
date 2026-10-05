import { chakra, defineRecipe, type RecipeVariantProps } from "@chakra-ui/react";

const surfaceRecipe = defineRecipe({
  base: {
    bg: "surface.raised",
    borderColor: "border.subtle",
    borderWidth: "1px",
  },
  defaultVariants: {
    elevation: "flat",
    padding: "none",
    radius: "panel",
  },
  variants: {
    elevation: {
      flat: {},
      overlay: { boxShadow: "overlay" },
      raised: { boxShadow: "raised" },
    },
    padding: {
      none: {},
      normal: { p: 6 },
      roomy: { p: { base: 5, md: 8 } },
      tight: { p: { base: 3, md: 4 } },
    },
    radius: {
      control: { rounded: "xl" },
      panel: { rounded: "3xl" },
    },
    interactive: {
      true: {
        transition: "transform 160ms ease, box-shadow 160ms ease",
        _hover: { boxShadow: "interactive", transform: "translateY(-3px)" },
      },
    },
    selected: {
      true: { borderColor: "accent.solid", borderWidth: "2px" },
    },
  },
});

export type SurfaceVariantProps = RecipeVariantProps<typeof surfaceRecipe>;
export type SurfacePadding = NonNullable<SurfaceVariantProps["padding"]>;

/** Chakra surface primitive that centralizes panel elevation, padding and selection styles. */
export const Surface = chakra("div", surfaceRecipe);
