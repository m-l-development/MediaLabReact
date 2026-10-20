import { defineConfig, devices } from '@playwright/test'

/**
 * Produksjonstesten (docs/produksjonstest.md). Startes bare av run-prod.mjs (produksjonen) eller run-dev.mjs (prøvekjøring
 * mot connecthub-dev), aldri av den vanlige kontrollen. Én test om gangen, og stopp ved første feil: i produksjonen skal
 * ingenting fortsette etter noe uventet. Mobilbredde sjekkes inne i testene.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  outputDir: '../test-results/prod',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 300_000,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 }, trace: 'off', screenshot: 'off', video: 'off' },
})
