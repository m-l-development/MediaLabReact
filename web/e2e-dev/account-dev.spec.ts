import crypto from 'node:crypto'
import { expect, test } from '@playwright/test'
import { appears, EMAIL, expectHub, injectBackend, mailLinkTo, mails, PASSWORD, signInAs, signOut } from './helpers'

/**
 * Konto mot connecthub-dev med den syntetiske kontoen ch-test-user (kjøres av run-dev.mjs, løpet «konto»): bytt passord
 * i kontomenyen, og hele «Glemt passord»-flyten fra innloggingssiden via lenken i testpostkassen. run-dev.mjs gir kontoen
 * et nytt tilfeldig passord etterpå. Passordene skrives aldri ut. Ingen ekte e-post sendes.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'user', 'kjøres av run-dev.mjs med Bruker-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

const newPw = () => crypto.randomBytes(15).toString('base64url') + 'Aa1!'

test('Konto: bytt passord, og «Glemt passord» via lenken i e-posten', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(240_000)
  const rows = ['| Steg | Resultat |', '|---|---|']
  try {
    // 1. bytt passord i kontomenyen
    await signInAs(page, EMAIL, PASSWORD)
    await expectHub(page)
    const pw1 = newPw()
    await page.getByRole('button', { name: 'Konto' }).click()
    await page.getByRole('button', { name: /Konto og sikkerhet/ }).click()
    await page.getByRole('button', { name: 'Bytt passord' }).first().click()
    await page.getByLabel('Gammelt passord', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Nytt passord', { exact: true }).fill(pw1)
    await page.getByLabel('Bekreft nytt passord', { exact: true }).fill(pw1)
    await page.getByRole('button', { name: 'Bytt passord' }).last().click()
    await expect(page.getByText(/Passordet er endret/)).toBeVisible({ timeout: 20_000 })
    rows.push('| Bytt passord i kontomenyen | «Passordet er endret …» |')
    await page.keyboard.press('Escape')
    await signOut(page)
    await signInAs(page, EMAIL, PASSWORD)
    const oldRefused = await appears(page.getByRole('alert').first(), 15_000)
    await signInAs(page, EMAIL, pw1)
    await expectHub(page)
    rows.push(`| Gammelt passord avvises / nytt virker | ${oldRefused ? 'ja' : 'ikke bekreftet'} / ja |`)
    await signOut(page)

    // 2. «Glemt passord» fra innloggingssiden (samme side som e-postlenkene og /login bruker)
    const before = mails().length
    await page.goto('/login')
    await page.getByRole('button', { name: /Glemt passordet\?/ }).click()
    await page.getByLabel('E-post').fill(EMAIL)
    await page.getByRole('button', { name: 'Send lenke' }).click()
    await expect(page.getByText(/Sjekk e-posten din/)).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => mails().slice(before).some((m) => m.to === EMAIL), { timeout: 20_000 }).toBe(true)
    const link = mailLinkTo(EMAIL)
    rows.push(`| Lenke til testpostkassen | ${link ? 'ja' : '**nei**'} |`)
    expect(link).toBeTruthy()
    const url = new URL(link as string)
    await page.goto(url.pathname + url.search)
    await page.getByRole('button', { name: 'Fortsett' }).click()
    const pw2 = newPw()
    await page.getByLabel('Nytt passord', { exact: true }).fill(pw2)
    await page.getByLabel('Bekreft nytt passord', { exact: true }).fill(pw2)
    await page.getByRole('button', { name: 'Lagre nytt passord' }).click()
    await expect(page.getByText('Passordet er endret')).toBeVisible({ timeout: 20_000 })
    rows.push('| Lenken åpnet, nytt passord lagret | ja |')
    await signInAs(page, EMAIL, pw2)
    await expectHub(page)
    rows.push('| Innlogging med passordet fra «Glemt passord» | ja |')
  } finally {
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('konto', { body: report, contentType: 'text/markdown' })
  }
})
