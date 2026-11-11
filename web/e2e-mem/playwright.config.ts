import { defineConfig, devices } from '@playwright/test'

/**
 * Minnemåling mot bygget app (samme byggeprosess som produksjon, i utviklingsmodus uten backend som CSP-testen, så
 * verktøyene kan åpnes uten innlogging). Egen port; bygges på nytt ved hver kjøring.
 */
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results/mem',
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4191', actionTimeout: 15000, ...devices['Desktop Chrome'], launchOptions: { args: ['--js-flags=--expose-gc'] } },
  webServer: [{ command: `npx vite build --mode ${process.env.MEM_REACT_PROD ? 'memtest' : 'development'} --outDir dist-mem --logLevel error && npx vite preview --outDir dist-mem --port 4191 --strictPort`, cwd: '..', url: 'http://localhost:4191/app/', reuseExistingServer: false, timeout: 300000, env: { NODE_ENV: process.env.MEM_REACT_PROD ? 'production' : 'development', ML_TEST_NO_BACKEND: '1' } }],
})
