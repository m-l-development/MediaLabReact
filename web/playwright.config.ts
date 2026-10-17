import { defineConfig, devices } from '@playwright/test'

/**
 * Nettlesertester (docs/testing.md): den nye appen (/app/) og – til visuell sammenligning – dagens app.
 * Begge kjøres lokalt uten backend (som `npm run dev` uten .env.local): den nye appen på en egen testserver (5181,
 * ML_TEST_NO_BACKEND=1), så testene aldri når connecthub-dev selv om .env.local finnes, og dev-serveren på 5180 er urørt.
 */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/warmup.ts',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5181',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    // alltid en fersk server (en gjenbrukt server kan ha utdaterte moduler etter mange endringer)
    { command: 'npx vite --port 5181 --strictPort', url: 'http://localhost:5181/app/', reuseExistingServer: false, timeout: 120000, env: { ML_TEST_NO_BACKEND: '1' } },
    // Dagens app på en egen, fast port (5173 kan være opptatt av andre prosjekter).
    { command: 'npx vite --port 5190 --strictPort', cwd: '../media-lab', url: 'http://localhost:5190/login', reuseExistingServer: false, timeout: 120000 },
    // Bygget appen for CSP-testen (e2e/csp.spec.ts): samme byggeprosess som produksjon, men med utviklingsunntaket
    // «uten backend» (NODE_ENV og mode development, så React er i utviklingsutgave), så verktøyene kan åpnes uten innlogging. Bygges på nytt ved hver kjøring.
    { command: 'npx vite build --mode development --outDir dist-csp --logLevel error && npx vite preview --outDir dist-csp --port 4180 --strictPort', url: 'http://localhost:4180/app/', reuseExistingServer: false, timeout: 240000, env: { NODE_ENV: 'development', ML_TEST_NO_BACKEND: '1' } },
  ],
})
