import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "on",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "node scripts/serve-review-console.mjs",
    url: "http://127.0.0.1:4173/healthz",
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: "4173",
      HOST: "127.0.0.1"
    }
  }
});
