import { expect, test, type Page } from '@playwright/test'
import { api, EMAIL, expectHub, injectBackend, PASSWORD, rest, rpc, signInAs } from './helpers'

/**
 * Logokopien på forsiden (commit 336b389) med Admin i «CH-test Menighet A» (kjøres av run-dev.mjs i løpet «admin»):
 * 1. Bytte av logo: ny logo vises med en gang, kopien av den gamle fjernes. Originallogoen settes tilbake og testbildet
 *    («e2e-logo-<tid>.png») slettes til slutt.
 * 2. «Logg ut og fjern mine lokale data» fjerner logokopien (ml2:<bruker>:logo.*).
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin')
test.beforeEach(async ({ page }) => injectBackend(page))

// 2×2 PNG (samme som i de andre testene)
const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 18, 73, 68, 65, 84, 120, 156, 99, 120, 38, 34, 242, 76, 68, 132, 1, 66, 1, 0, 32, 222, 4, 57, 4, 175, 122, 106, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]
const logoKeys = (p: Page, uid: string) => p.evaluate((pre) => Object.keys(localStorage).filter((k) => k.startsWith(pre)), `ml2:${uid}:logo.`)

test('logokopien: bytte av logo og «Slett lokale data»', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(180_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  await signInAs(page, EMAIL, PASSWORD)
  await expectHub(page)
  const who = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { id?: string; user_id?: string; churches: { id: string; name: string; logo_file_id: string | null }[] }
  const uid = who.user_id ?? who.id ?? ''
  const church = who.churches.find((c) => c.name === 'CH-test Menighet A')
  if (!church?.logo_file_id) throw new Error('testmenigheten har ingen logo')
  const orig = church.logo_file_id
  const img = page.locator('[data-ch-hub-church] img')
  let made = ''
  try {
    await page.goto('/app/')
    await expect(img).toBeVisible({ timeout: 30_000 })
    const before = await img.getAttribute('src')
    rows.push(`| Logokopi lagret under brukerens prefiks | ${(await logoKeys(page, uid)).join(', ') === `ml2:${uid}:logo.${orig}` ? 'ja' : '**NEI**'} |`)

    // 1. bytte av logo (som Admin-siden gjør: opplasting til Logoer + set_church_logo)
    const up = await api(page, 'file.upload', null, { query: `&church=${church.id}&folder=logoer&name=e2e-logo-${Date.now()}.png`, raw: PNG, contentType: 'application/octet-stream' })
    made = String((up.body?.file as { id?: string } | undefined)?.id ?? '')
    expect(made).toMatch(/^[0-9a-f-]{36}$/)
    expect((await rpc(page, 'set_church_logo', { p_church: church.id, p_file: made })).status).toBeLessThan(300)
    await page.goto('/app/')
    await expect.poll(async () => (await img.getAttribute('src')) !== before, { timeout: 30_000 }).toBe(true)
    await expect.poll(() => logoKeys(page, uid), { timeout: 10_000 }).toEqual([`ml2:${uid}:logo.${made}`])
    rows.push('| Etter bytte: ny logo vises, kopien av den gamle er fjernet | ja |')

    // originallogoen tilbake
    expect((await rpc(page, 'set_church_logo', { p_church: church.id, p_file: orig })).status).toBeLessThan(300)
    await page.goto('/app/')
    await expect.poll(async () => (await img.getAttribute('src')) === before, { timeout: 30_000 }).toBe(true)
    rows.push('| Originallogoen satt tilbake og vist | ja |')

    // TB-9AF961: logo og navn også på mobil (390 px): synlig, riktig størrelse, og navnet flyter ikke over
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/app/')
    await expect(img).toBeVisible({ timeout: 30_000 })
    const m = await page.locator('[data-ch-hub-church]').evaluate((el) => {
      const i = (el.querySelector('img') as HTMLImageElement).getBoundingClientRect(), r = el.getBoundingClientRect()
      return { w: Math.round(i.width), h: Math.round(i.height), over: el.scrollWidth > el.clientWidth + 1, inside: r.right <= window.innerWidth + 0.5 }
    })
    await page.locator('[data-ch-hub-church]').screenshot({ path: info.outputPath('logo-mobil.png') })
    rows.push(`| Mobil (390 px): logo ${m.w}×${m.h}, innenfor skjermen, ingen overflyt | ${m.inside && !m.over ? 'ja' : '**NEI**'} |`)
    expect([m.w, m.h, m.inside, m.over]).toEqual([32, 32, true, false])
    await page.setViewportSize({ width: 1280, height: 800 })

    // 2. «Logg ut og fjern mine lokale data»
    await page.getByRole('button', { name: 'Konto' }).click()
    await page.getByRole('button', { name: /Konto og sikkerhet/ }).click()
    await page.locator('[data-ch-wipe]').click()
    await page.locator('[data-ch-wipe-go]').click()
    await expect(page.getByLabel('E-post').or(page.getByRole('button', { name: 'Bruk en annen konto' })).first()).toBeVisible({ timeout: 30_000 })
    const left = await logoKeys(page, uid)
    rows.push(`| «Slett lokale data»: logokopier igjen | ${left.length} |`)
    expect(left).toEqual([])
  } finally {
    if (made) {
      if (!(await page.evaluate(() => !!document.querySelector('[data-ch-hub-church]')).catch(() => false))) { await signInAs(page, EMAIL, PASSWORD); await expectHub(page) }
      await rpc(page, 'set_church_logo', { p_church: church.id, p_file: orig })
      const del = await api(page, 'file.delete', { id: made })
      rows.push(`| Opprydding: originallogo satt, testbildet slettet | ${del.status} |`)
    }
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('hub-logo-cache', { body: report, contentType: 'text/markdown' })
  }
})
