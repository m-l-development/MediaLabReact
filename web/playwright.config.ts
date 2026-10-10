import { defineConfig, devices } from '@playwright/test'

/**
 * Nettlesertester (docs/testing.md): den nye appen (/app/) og – til visuell sammenligning – dagens app.
 * Begge kjøres lokalt uten backend (som `npm run dev` uten .env.local).
 */
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'npx vite --port 5180 --strictPort', url: 'http://localhost:5180/app/', reuseExistingServer: true, timeout: 120000 },
    // Dagens app på en egen, fast port (5173 kan være opptatt av andre prosjekter).
    { command: 'npx vite --port 5190 --strictPort', cwd: '../media-lab', url: 'http://localhost:5190/home', reuseExistingServer: false, timeout: 120000 },
  ],
})
