import type { Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import { AppAdaptersProvider, createAppAdapters } from "../src/app/adapters";
import { QueryProvider } from "../src/app/query";
import { Provider } from "../src/components/ui/provider";
import "../src/styles/global.css";

const adapters = createAppAdapters({ source: "mock" });

const preview: Preview = {
  decorators: [
    (Story) => (
      <Provider>
        <AppAdaptersProvider adapters={adapters}>
          <QueryProvider persist={false}>
            <MemoryRouter>
              <Story />
            </MemoryRouter>
          </QueryProvider>
        </AppAdaptersProvider>
      </Provider>
    ),
  ],
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "padded",
    options: {
      storySort: {
        order: ["Shared", "Features", "Layout"],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
