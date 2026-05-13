import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas E2E ligeras contra una instancia ya levantada.
 * Uso: PLAYWRIGHT_BASE_URL=https://jobshours.com npm run test:e2e
 * Local: en otra terminal `npm run dev` y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npm run test:e2e`
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3002',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
