import { describe, expect, it } from "vitest";

import {
  parseStoryIdList,
  readStoryEntries,
  selectStoryEntriesById,
  shouldBuildStorybook,
} from "./storybook-suite.mjs";

const storybookIndex = {
  entries: {
    "shared-ui-card--default": {
      id: "shared-ui-card--default",
      name: "Default",
      title: "Shared/UI/Card",
      type: "story",
    },
    "shared-ui-card--selected": {
      id: "shared-ui-card--selected",
      name: "Selected",
      title: "Shared/UI/Card",
      type: "story",
    },
    "features-auth-loginform--default": {
      id: "features-auth-loginform--default",
      name: "Default",
      title: "Features/Auth/LoginForm",
      type: "story",
    },
    "shared-ui-card--docs": {
      id: "shared-ui-card--docs",
      name: "Docs",
      title: "Shared/UI/Card",
      type: "docs",
    },
  },
};

describe("parseStoryIdList", () => {
  it("should accept ids separated by commas or whitespace", () => {
    expect(parseStoryIdList("a--one, b--two   c--three")).toEqual(["a--one", "b--two", "c--three"]);
  });

  it("should drop empty values and duplicates while preserving order", () => {
    expect(parseStoryIdList(" a--one ,, a--one ,b--two ")).toEqual(["a--one", "b--two"]);
  });

  it("should return an empty list for missing input", () => {
    expect(parseStoryIdList(undefined)).toEqual([]);
    expect(parseStoryIdList("   ")).toEqual([]);
  });
});

describe("readStoryEntries", () => {
  it("should keep only stories and sort them by id", () => {
    expect(readStoryEntries(storybookIndex).map((entry) => entry.id)).toEqual([
      "features-auth-loginform--default",
      "shared-ui-card--default",
      "shared-ui-card--selected",
    ]);
  });

  it("should reject an index without entries", () => {
    expect(() => readStoryEntries({})).toThrow(/entries/i);
  });
});

describe("selectStoryEntriesById", () => {
  it("should return every story when no id is requested", () => {
    expect(selectStoryEntriesById(readStoryEntries(storybookIndex), [])).toHaveLength(3);
  });

  it("should keep only the requested stories in a stable order", () => {
    const entries = readStoryEntries(storybookIndex);

    expect(
      selectStoryEntriesById(entries, ["shared-ui-card--selected", "shared-ui-card--default"]),
    ).toEqual([entries[1], entries[2]]);
  });

  it("should fail with the unknown ids instead of silently skipping them", () => {
    expect(() =>
      selectStoryEntriesById(readStoryEntries(storybookIndex), ["nope--missing"]),
    ).toThrow(/nope--missing/);
  });

  it("should suggest the closest known ids when one is misspelled", () => {
    expect(() =>
      selectStoryEntriesById(readStoryEntries(storybookIndex), ["shared-ui-card--defaul"]),
    ).toThrow(/shared-ui-card--default/);
  });

  it("should not suggest anything for an unrelated id", () => {
    let message = "";

    try {
      selectStoryEntriesById(readStoryEntries(storybookIndex), ["nope--missing"]);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("nope--missing");
    expect(message).not.toContain("quiso decir");
  });
});

describe("shouldBuildStorybook", () => {
  it("should build when there is no previous build", () => {
    expect(shouldBuildStorybook({ buildExists: false, buildTimestamp: null })).toBe(true);
  });

  it("should reuse a build newer than the sources", () => {
    expect(
      shouldBuildStorybook({
        buildExists: true,
        buildTimestamp: 2_000,
        newestSourceTimestamp: 1_000,
      }),
    ).toBe(false);
  });

  it("should rebuild when a source is newer than the build", () => {
    expect(
      shouldBuildStorybook({
        buildExists: true,
        buildTimestamp: 1_000,
        newestSourceTimestamp: 2_000,
      }),
    ).toBe(true);
  });
});
