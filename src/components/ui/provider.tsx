import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { system } from "@theme/index";

export type ProviderProps = {
  children: ReactNode;
};

/** Installs the SIPEG Chakra system and color-mode provider. */
export function Provider({ children }: ProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange enableSystem>
        {children}
      </ThemeProvider>
    </ChakraProvider>
  );
}
