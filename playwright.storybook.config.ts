import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env["CI"]);

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  forbidOnly: isCI,
  fullyParallel: true,
  outputDir: "test-results/storybook",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { height: 720, width: 1280 },
      },
    },
  ],
  reporter: isCI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "line",
  retries: isCI ? 2 : 0,
  snapshotPathTemplate: "{testDir}/__image_snapshots__/{arg}{ext}",
  testDir: ".storybook",
  testMatch: "storybook.visual.ts",
  use: {
    baseURL: "http://127.0.0.1:6006",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  ...(isCI ? { workers: 2 } : {}),
});
