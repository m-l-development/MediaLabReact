// Paritetstest: samme klikk på to versjoner av media-lab/ (FOER_DIR og NAA_DIR), sammenligner resultatet.
import { defineConfig } from '@playwright/test';
const FOER = process.env.FOER_DIR, NAA = process.env.NAA_DIR || '../../media-lab';
export default defineConfig({
  testDir: '.', timeout: 30 * 60_000, fullyParallel: true, workers: 4, reporter: [['list']],
  use: { channel: 'chrome', reducedMotion: 'reduce', locale: 'nb-NO', viewport: { width: 1440, height: 900 }, acceptDownloads: true },
  webServer: [
    { command: `python3 -m http.server 4181 --bind 127.0.0.1 --directory "${FOER}"`, url: 'http://127.0.0.1:4181/', reuseExistingServer: false, stdout: 'ignore', stderr: 'ignore' },
    { command: `python3 -m http.server 4182 --bind 127.0.0.1 --directory "${NAA}"`, url: 'http://127.0.0.1:4182/', reuseExistingServer: false, stdout: 'ignore', stderr: 'ignore' },
  ],
});
