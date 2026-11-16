import { defineConfig, devices } from '@playwright/test'

/** Oppdeling av bildeveien (bisect.spec.ts): utviklingsserveren, så kildemodulene kan importeres direkte i siden. */
export default defineConfig({
  testDir: '.',
  testMatch: /bisect\.spec\.ts/,
  outputDir: '../test-results/mem-bisect',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4192', ...devices['Desktop Chrome'], launchOptions: { args: ['--js-flags=--expose-gc'] } },
  webServer: [{ command: 'npx vite --port 4192 --strictPort', cwd: '..', url: 'http://localhost:4192/app/', reuseExistingServer: false, timeout: 120000, env: { ML_TEST_NO_BACKEND: '1' } }],
})
