import { defineConfig, devices } from '@playwright/test'

/**
 * Ekte AI-modeller i ekte Chrome (Hugging Face-nedlasting, WebGPU der den finnes). Ikke med i den vanlige kontrollen,
 * fordi modellene lastes ned fra nettet. Egen testserver uten backend (som e2e/), så ingen innlogging eller ekte data.
 *   npx playwright test -c e2e-real
 */
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results/real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5182', trace: 'retain-on-failure', ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 950 }, launchOptions: { args: ['--enable-unsafe-webgpu'] } },
  webServer: { command: 'npx vite --port 5182 --strictPort', cwd: '..', url: 'http://localhost:5182/app/', reuseExistingServer: false, timeout: 300_000, env: { ML_TEST_NO_BACKEND: '1' } },
})
