import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

type StoryEntry = {
  id: string;
  name: string;
  title: string;
  type: "story";
};

type StorybookIndex = {
  entries: Record<string, StoryEntry | { type: string }>;
};

const storybookIndex = JSON.parse(
  readFileSync(new URL("../storybook-static/index.json", import.meta.url), "utf8"),
) as StorybookIndex;

const stories = Object.values(storybookIndex.entries)
  .filter((entry): entry is StoryEntry => entry.type === "story")
  .sort((first, second) => first.id.localeCompare(second.id));

const PLAY_FINISHED_GLOBAL = "__SIPEG_PLAY_FINISHED__";

async function checkStoryAccessibility(page: Parameters<typeof injectAxe>[0]) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await checkA11y(page, "#storybook-root", {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Axe is already running")) {
        throw error;
      }
      await page.waitForTimeout(100);
    }
  }

  throw new Error("Storybook accessibility audit did not become available.");
}

test.describe("Storybook visual and accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((globalName: string) => {
      const globals = globalThis as typeof globalThis & Record<string, unknown>;

      globals[globalName] = new Promise<void>((resolve) => {
        const subscribe = () => {
          const channel = globals["__STORYBOOK_ADDONS_CHANNEL__"] as
            { once: (event: string, listener: () => void) => void } | undefined;

          if (!channel) {
            window.setTimeout(subscribe, 10);
            return;
          }

          channel.once("storyFinished", () => resolve());
        };

        subscribe();
      });
    }, PLAY_FINISHED_GLOBAL);
  });

  for (const story of stories) {
    test(`${story.title} / ${story.name}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);

      const storyRoot = page.locator("#storybook-root");
      await expect(storyRoot).toBeVisible();
      await page.evaluate(async (globalName: string) => {
        const globals = globalThis as typeof globalThis & Record<string, unknown>;

        await (globals[globalName] as Promise<void> | undefined);
      }, PLAY_FINISHED_GLOBAL);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      await injectAxe(page);
      await checkStoryAccessibility(page);
      await expect(storyRoot).toHaveScreenshot(`${story.id}.png`);
    });
  }
});
