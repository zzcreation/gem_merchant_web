import { defineConfig, devices } from '@playwright/test'

// Dedicated port — sibling projects (e.g. pass_doudou) often claim Vite's default 5173.
const DEV_PORT = 5183
const DEV_URL = `http://127.0.0.1:${DEV_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: DEV_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:worker',
      url: 'http://127.0.0.1:8787',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${DEV_PORT}`,
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
