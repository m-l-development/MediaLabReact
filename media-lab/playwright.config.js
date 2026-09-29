// Sammenligner React-sidene med originalene (legacy-dc/, nås på /_original/ i preview) og grunnlinjen.
// Kjør: npm run build && npx playwright test
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  updateSnapshots: 'none',
  snapshotPathTemplate: 'tests/__baseline__/{projectName}/{arg}{ext}',
  expect: { toMatchSnapshot: { maxDiffPixelRatio: 0.002, threshold: 0.1 } },
  use: { baseURL: 'http://127.0.0.1:4174', channel: 'chrome', reducedMotion: 'reduce', locale: 'nb-NO' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobil', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: { command: 'npx vite preview --port 4174 --strictPort', url: 'http://127.0.0.1:4174/', reuseExistingServer: false, stdout: 'ignore', stderr: 'pipe' },
});
