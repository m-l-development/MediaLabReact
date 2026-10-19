import { expect, test, type Page } from '@playwright/test'
import { api, EMAIL, expectHub, injectBackend, PASSWORD, rest, signInPassword } from './helpers'

/**
 * Store opplastinger mot connecthub-dev med Admin-testkontoen (kjøres av run-dev.mjs i løpet «admin»): bilder og filer
 * høyst 30 MB, logoer høyst 10 MB. Filene går direkte til lagringen (upload.start → PUT → upload.finish), fordi Vercel
 * tar imot høyst 4,5 MB per forespørsel. Bare testens egne filer lastes opp, og alle slettes igjen.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

const MB = 1024 * 1024
const PNG_HEAD = [137, 80, 78, 71, 13, 10, 26, 10]
const MP4_HEAD = [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]

/** Direkte opplasting fra nettleseren (som appen): start → PUT til den signerte lenken → finish. Bytene lages i nettleseren. */
async function direct(page: Page, start: Record<string, unknown>, o: { head?: number[]; bytes?: number; finishTwice?: boolean } = {}) {
  const s = await api(page, 'upload.start', start)
  if (!s.ok) return { start: s }
  const b = s.body as { id: string; url: string; mime: string }
  const put = await page.evaluate(async ({ url, mime, n, head }) => {
    const buf = new Uint8Array(n)
    buf.set(head)
    const r = await fetch(url, { method: 'PUT', headers: { 'content-type': mime, 'x-upsert': 'false' }, body: buf })
    return r.status
  }, { url: b.url, mime: b.mime, n: o.bytes ?? Number(start.size), head: o.head ?? PNG_HEAD })
  const fin = await api(page, 'upload.finish', { id: b.id })
  const again = o.finishTwice ? await api(page, 'upload.finish', { id: b.id }) : null
  return { start: s, put, fin, again, file: (fin.body?.file as { id?: string; file_size?: number } | undefined) }
}

test('Store opplastinger: 25 MB direkte til lagringen, grenser 30 MB / logoer 10 MB, innholdskontroll og opprydding', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(300_000)
  const rows = ['| Kontroll | Resultat |', '|---|---|']
  const ok = (label: string, cond: boolean) => { rows.push(`| ${label} | ${cond ? 'ja' : '**NEI**'} |`); expect(cond, label).toBe(true) }
  const cleanup: string[] = []
  await signInPassword(page)
  await expectHub(page)
  const who = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string; church_id: string | null }[] }
  const church = who.roles.find((r) => r.role === 'church_admin')?.church_id
  if (!church) throw new Error('kontoen er ikke Admin')
  try {
    // 1. API: 25 MB i Fellesmappe
    const big = await direct(page, { kind: 'file', church, folder: 'bilder', name: 'e2e-25mb.png', mime: 'image/png', size: 25 * MB })
    if (big.file?.id) cleanup.push(big.file.id)
    ok(`25 MB lastes opp direkte til lagringen og registreres (start ${big.start.status}, PUT ${big.put}, finish ${big.fin?.status})`, !!big.file?.id && big.put === 200)
    const row = (await rest(page, `/rest/v1/files?select=file_size,mime_type&id=eq.${big.file?.id}`)).body as { file_size: number; mime_type: string }[]
    ok('Databasen har riktig størrelse og type', row[0]?.file_size === 25 * MB && row[0]?.mime_type === 'image/png')
    const urls = await api(page, 'file.urls', { ids: [big.file?.id] })
    const href = (urls.body?.urls as Record<string, string> | undefined)?.[big.file?.id ?? '']
    const len = href ? await page.evaluate(async (u) => (await (await fetch(u)).arrayBuffer()).byteLength, href) : 0
    ok('Filen kan hentes igjen med full størrelse (signert lenke)', len === 25 * MB)

    // 2. grenser før noe lagres
    const s31 = await api(page, 'upload.start', { kind: 'file', church, folder: 'bilder', name: 'x.png', mime: 'image/png', size: 30 * MB + 1 })
    ok(`Over 30 MB avvises før opplasting (${s31.status} ${s31.error})`, s31.status === 413 && s31.error === 'too_large')
    const s30 = await api(page, 'upload.start', { kind: 'file', church, folder: 'logoer', name: 'logo.png', mime: 'image/png', size: 10 * MB + 1 })
    ok(`Logo over 10 MB avvises (${s30.status} ${s30.error})`, s30.status === 413 && s30.error === 'logo_too_large')
    const vid = await api(page, 'upload.start', { kind: 'file', church, folder: 'bilder', name: 'klipp.mp4', mime: 'video/mp4', size: 1000 })
    ok(`Video avvises før opplasting (${vid.status} ${vid.error})`, vid.status === 415 && vid.error === 'video_not_allowed')

    // 3. omgåelser: større fil enn oppgitt, video forkledd som bilde, over bøttegrensen, fullføre to ganger
    const lie = await direct(page, { kind: 'file', church, folder: 'bilder', name: 'liten.png', mime: 'image/png', size: 1000 }, { bytes: 5 * MB })
    if (lie.file?.id) cleanup.push(lie.file.id)
    ok(`Fil som er større enn oppgitt avvises og slettes (${lie.fin?.status} ${lie.fin?.error})`, lie.fin?.status === 422 && lie.fin?.error === 'upload_mismatch')
    const mp4 = await direct(page, { kind: 'file', church, folder: 'bilder', name: 'bilde.png', mime: 'image/png', size: 4096 }, { head: MP4_HEAD })
    if (mp4.file?.id) cleanup.push(mp4.file.id)
    ok(`Video forkledd som bilde avvises etter opplasting (${mp4.fin?.status} ${mp4.fin?.error})`, mp4.fin?.status === 415 && mp4.fin?.error === 'video_not_allowed')
    const over = await direct(page, { kind: 'file', church, folder: 'bilder', name: 'over.png', mime: 'image/png', size: 1000 }, { bytes: 30 * MB + 1 })
    ok(`Lagringen tar ikke imot over 30 MB selv med gyldig lenke (PUT ${over.put}, finish ${over.fin?.status})`, (over.put ?? 0) >= 400 && (over.fin?.status ?? 0) >= 400)
    const twice = await direct(page, { kind: 'file', church, folder: 'bilder', name: 'e2e-to.png', mime: 'image/png', size: 2048 }, { finishTwice: true })
    if (twice.file?.id) cleanup.push(twice.file.id)
    ok(`Samme opplasting kan bare fullføres én gang (${twice.fin?.status}, så ${twice.again?.status})`, twice.fin?.status === 200 && twice.again?.status === 410)

    // 4. grensesnittet: Fellesmappe med 25 MB, og tydelig melding over 30 MB
    await page.goto('/app/admin#/filer/felles')
    const input = page.locator('[data-ch-upload] input[type=file]')
    await expect(input).toBeAttached({ timeout: 30_000 })
    const buf = Buffer.alloc(25 * MB)
    Buffer.from(PNG_HEAD).copy(buf)
    const name = `e2e-ui-${Date.now()}.png`
    await input.setInputFiles({ name, mimeType: 'image/png', buffer: buf })
    await expect.poll(async () => ((await rest(page, `/rest/v1/files?select=id&church_id=eq.${church}&file_name=eq.${name}`)).body as unknown[]).length, { timeout: 120_000 }).toBe(1)
    const ui = (await rest(page, `/rest/v1/files?select=id&church_id=eq.${church}&file_name=eq.${name}`)).body as { id: string }[]
    cleanup.push(ui[0].id)
    ok('Grensesnittet laster opp 25 MB til Fellesmappe', true)
    const tooBig = Buffer.alloc(30 * MB + 1)
    Buffer.from(PNG_HEAD).copy(tooBig)
    await input.setInputFiles({ name: 'for-stor.png', mimeType: 'image/png', buffer: tooBig })
    await expect(page.getByText('Filen er for stor (maks 30 MB).').first()).toBeVisible({ timeout: 30_000 })
    ok('Grensesnittet viser «Filen er for stor (maks 30 MB)» og laster ikke opp', ((await rest(page, `/rest/v1/files?select=id&church_id=eq.${church}&file_name=eq.for-stor.png`)).body as unknown[]).length === 0)
  } finally {
    for (const id of cleanup) {
      const d = await api(page, 'file.delete', { id })
      rows.push(`| Opprydding: testfil slettet | ${d.status} |`)
    }
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('upload-limits', { body: report, contentType: 'text/markdown' })
  }
})
