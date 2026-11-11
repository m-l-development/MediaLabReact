import { defineConfig, devices } from '@playwright/test'
/** Som playwright.config.ts, men mot utviklingsserveren (raskere runder under arbeidet). */
export default defineConfig({
  testDir: '.', outputDir: '../test-results/mem', workers: 1, retries: 0, reporter: [['list']],
  use: { baseURL: 'http://localhost:5181', actionTimeout: 15000, ...devices['Desktop Chrome'] },
  webServer: [{ command: 'npx vite --port 5181 --strictPort', cwd: '..', url: 'http://localhost:5181/app/', reuseExistingServer: false, timeout: 120000, env: { ML_TEST_NO_BACKEND: '1' } }],
})
