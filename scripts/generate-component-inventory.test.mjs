import { describe, expect, it } from "vitest";

import {
  createComponentInventory,
  renderComponentInventoryMarkdown,
} from "./generate-component-inventory.mjs";

const storybookIndex = {
  entries: {
    "shared-ui-card--default": {
      componentPath: "./src/components/ui/Card.tsx",
      id: "shared-ui-card--default",
      importPath: "./src/components/ui/Card.stories.tsx",
      name: "Default",
      tags: ["autodocs", "test"],
      title: "Shared/UI/Card",
      type: "story",
    },
    "shared-ui-card--docs": {
      id: "shared-ui-card--docs",
      importPath: "./src/components/ui/Card.stories.tsx",
      name: "Docs",
      tags: ["autodocs"],
      title: "Shared/UI/Card",
      type: "docs",
    },
    "shared-ui-card--selected": {
      componentPath: "./src/components/ui/Card.tsx",
      id: "shared-ui-card--selected",
      importPath: "./src/components/ui/Card.stories.tsx",
      name: "Selected",
      tags: ["play-fn", "test"],
      title: "Shared/UI/Card",
      type: "story",
    },
    "features-agenda-filter--default": {
      componentPath: "./src/features/agenda/ui/Filter.tsx",
      id: "features-agenda-filter--default",
      importPath: "./src/features/agenda/ui/Filter.stories.tsx",
      name: "Default",
      tags: ["test"],
      title: "Features/Agenda/Filter",
      type: "story",
    },
  },
  v: 5,
};

describe("createComponentInventory", () => {
  it("groups stories by component and produces deterministic paths and ordering", () => {
    expect(createComponentInventory(storybookIndex)).toEqual({
      components: [
        {
          componentPath: "src/features/agenda/ui/Filter.tsx",
          stories: [{ id: "features-agenda-filter--default", name: "Default", tags: ["test"] }],
          storyPath: "src/features/agenda/ui/Filter.stories.tsx",
          title: "Features/Agenda/Filter",
        },
        {
          componentPath: "src/components/ui/Card.tsx",
          stories: [
            { id: "shared-ui-card--default", name: "Default", tags: ["autodocs", "test"] },
            { id: "shared-ui-card--selected", name: "Selected", tags: ["play-fn", "test"] },
          ],
          storyPath: "src/components/ui/Card.stories.tsx",
          title: "Shared/UI/Card",
        },
      ],
      schemaVersion: 1,
      source: "storybook-static/index.json",
    });
  });

  it("rejects an invalid Storybook index", () => {
    expect(() => createComponentInventory({ entries: [] })).toThrow(
      "Storybook index must contain an entries object.",
    );
  });
});

describe("renderComponentInventoryMarkdown", () => {
  it("renders component paths, story paths and story identifiers", () => {
    const inventory = createComponentInventory(storybookIndex);

    expect(renderComponentInventoryMarkdown(inventory)).toContain(
      "| `Shared/UI/Card` | `src/components/ui/Card.tsx` | `src/components/ui/Card.stories.tsx` | 2 |",
    );
    expect(renderComponentInventoryMarkdown(inventory)).toContain(
      "- `shared-ui-card--selected`: Selected (`play-fn`, `test`)",
    );
  });
});
