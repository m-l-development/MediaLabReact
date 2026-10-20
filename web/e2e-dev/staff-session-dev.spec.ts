import { test } from '@playwright/test'
import { EMAIL, injectBackend, PASSWORD, setupMfa, signInPassword } from './helpers'

/**
 * Bare for prøvekjøringen av produksjonstesten mot connecthub-dev (run-dev.mjs, løpet «prodtest»): lager stabsøkten
 * (innlogging + MFA med testkontoen) og lagrer den i ML_DEV_SESSION_OUT, slik eieren gjør med --save-staff-session i
 * produksjonen. Ingen kontroller her – innlogging og MFA testes ikke.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'staff-session' || !process.env.ML_DEV_SESSION_OUT, 'kjøres av run-dev.mjs (prodtest)')
test.beforeEach(async ({ page }) => injectBackend(page))

test('stabsøkt for prøvekjøringen av produksjonstesten', async ({ page, context }, info) => {
  test.skip(info.project.name === 'mobil', 'én gang')
  await signInPassword(page)
  await setupMfa(page)
  await context.storageState({ path: process.env.ML_DEV_SESSION_OUT })
})
