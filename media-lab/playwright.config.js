// Playwright: røyktester og skjermbilder. Kjør: npx playwright test
// BASE_DIR velger hvilken mappe som serveres (standard: denne mappen).
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT || 4173);
const DIR = process.env.BASE_DIR || '.';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    reducedMotion: 'reduce',
    locale: 'nb-NO',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: process.env.SERVER_CMD || `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory "${DIR}"`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
