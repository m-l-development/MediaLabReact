import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

// testene som bruker Chrome-kanalen (eksport med H.264), vet da at de kjører i WebKit
process.env.ML_WEBKIT = '1'

/**
 * iPhone-emulering i WebKit (Safari-motoren): de samme mobiltestene som Pixel 7-prosjektet («mobil» i
 * playwright.config.ts), men med iPhone 15-profil og Playwrights WebKit. Prosjektet heter også «mobil», så testenes
 * mobilvalg og skip-regler gjelder uendret. Ikke med i den vanlige kontrollen/CI (krever `npx playwright install webkit`).
 *   npx playwright test -c playwright.iphone.config.ts
 * Merk: dette er WebKit-motoren på PC, ikke ekte iOS Safari på en iPhone.
 */
export default defineConfig({
  ...base,
  outputDir: 'test-results/iphone',
  // kortet «Media Lab som web-app» (Legg til på Hjem-skjerm, bare iOS-Safari) dekker siden til det lukkes; testene starter
  // som en bruker som har trykket «Ikke nå» (selve kortet testes i platform.spec.ts)
  projects: [{ name: 'mobil', use: { ...devices['iPhone 15'], storageState: { cookies: [], origins: [{ origin: 'http://localhost:5181', localStorage: [{ name: 'medialab.pwa.later', value: String(Date.now()) }] }] } } }],
})
