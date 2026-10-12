import { defineConfig, devices } from '@playwright/test'

/**
 * Verifisering mot ekte connecthub-dev (docs/lokal-servertest.md): kjøres bare for hånd, aldri i den vanlige kontrollen.
 * Bruker dev-serveren som allerede kjører på 5180 med backend, og en testkonto fra terminalens miljø (ML_DEV_EMAIL og
 * ML_DEV_PASSWORD) – aldri fra filer. Testene leser bare: ingen knapper som endrer data trykkes.
 */
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results/dev',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5180', trace: 'off', screenshot: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
})
