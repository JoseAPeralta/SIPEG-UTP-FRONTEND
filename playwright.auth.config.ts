import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.browser.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "test-results/auth",
  use: {
    baseURL: "http://localhost:5189",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm exec vite --host localhost --port 5189 --strictPort",
    url: "http://localhost:5189/e2e/auth.fixture.html",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
