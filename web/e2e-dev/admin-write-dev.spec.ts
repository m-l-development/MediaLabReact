import { expect, test } from '@playwright/test'
import { injectBackend, api, EMAIL, expectHub, mails, PASSWORD, rest, signInPassword } from './helpers'

/**
 * Adminhandlinger som endrer data, mot connecthub-dev med Admin-testkontoen (kjøres av run-dev.mjs med ML_DEV_ROLE=admin).
 * Bare syntetiske data som testen selv lager og fjerner igjen: én invitasjon til ch-test-e2e-…@example.com (e-posten
 * fanges av testpostkassen og sendes ikke), som trekkes tilbake; ett lite testbilde i Fellesmappe, som slettes.
 * «Glemt passord» for testkontoen selv går også bare til testpostkassen.
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'admin', 'kjøres av run-dev.mjs med Admin-kontoen')
test.beforeEach(async ({ page }) => injectBackend(page))

// 1×1 PNG
const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]
// starten av en MP4 (ftyp-boks): skal avvises som video uansett navn
const MP4 = [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 2, 0, 105, 115, 111, 109, 105, 115, 111, 50]

test('Admin: invitasjon (testpostkasse), tilbaketrekking, opplasting og sletting, video avvist, «Glemt passord»', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  const rows = ['| Handling | Resultat |', '|---|---|']
  await signInPassword(page)
  await expectHub(page)
  const who = (await rest(page, '/rest/v1/rpc/whoami', { body: {} })).body as { roles: { role: string; church_id: string | null }[] }
  const church = who.roles.find((r) => r.role === 'church_admin')?.church_id
  if (!church) throw new Error('kontoen er ikke Admin')
  const usage0 = (await rest(page, '/rest/v1/rpc/member_usage', { body: { p_church: church } })).body as { count: number; limit: number }

  // invitasjon via grensesnittet
  const addr = `ch-test-e2e-${Date.now()}@example.com`
  const before = mails().length
  await page.goto('/app/admin#/invitasjoner')
  await page.getByRole('main').getByRole('button', { name: '+ Ny invitasjon' }).click()
  const dlg = page.getByRole('dialog', { name: 'Ny invitasjon' })
  await dlg.getByLabel('E-postadresse').fill(addr)
  await expect(dlg.locator('[data-ch-member-usage]')).toBeVisible({ timeout: 20_000 })
  await dlg.getByRole('button', { name: 'Send invitasjon' }).click()
  await expect(page.getByText(/Invitasjonen er (sendt til|lagret)/)).toBeVisible({ timeout: 30_000 })
  const got = mails().slice(before)
  rows.push(`| Ny invitasjon (${usage0.count}/${usage0.limit} før) | e-post til testpostkassen: ${got.some((m) => m.to === addr) ? 'ja' : 'nei'} |`)
  expect(got.some((m) => m.to === addr)).toBe(true)
  const usage1 = (await rest(page, '/rest/v1/rpc/member_usage', { body: { p_church: church } })).body as { count: number }
  expect(usage1.count).toBe(usage0.count + 1)

  // tilbaketrekking
  const inv = (await rest(page, `/rest/v1/invitations?select=id,status&email=eq.${encodeURIComponent(addr)}`)).body as { id: string; status: string }[]
  const rv = await rest(page, '/rest/v1/rpc/revoke_invitation', { body: { p_id: inv[0]?.id } })
  const usage2 = (await rest(page, '/rest/v1/rpc/member_usage', { body: { p_church: church } })).body as { count: number }
  rows.push(`| Trekk tilbake invitasjonen | ${rv.status}; antall ${usage1.count} → ${usage2.count} |`)
  expect(usage2.count).toBe(usage0.count)

  // opplasting og sletting i Fellesmappe (bare testens eget bilde)
  const up = await api(page, 'file.upload', null, { query: `&church=${church}&folder=bilder&name=e2e-test.png`, raw: PNG, contentType: 'application/octet-stream' })
  const fileId = (up.body?.file as { id?: string } | undefined)?.id
  rows.push(`| Opplasting til Fellesmappe | ${up.status} ${up.error ?? ''} |`)
  expect(up.ok).toBe(true)
  const urls = await api(page, 'file.urls', { ids: [fileId] })
  rows.push(`| Signert adresse for filen | ${urls.status} |`)
  expect(urls.ok).toBe(true)
  const del = await api(page, 'file.delete', { id: fileId })
  rows.push(`| Sletting av testbildet | ${del.status} |`)
  expect(del.ok).toBe(true)
  const gone = (await rest(page, `/rest/v1/files?select=id&id=eq.${fileId}`)).body as unknown[]
  expect(gone.length).toBe(0)

  // video avvises alltid, også forkledd som bilde
  const vid = await api(page, 'file.upload', null, { query: `&church=${church}&folder=bilder&name=lurt.png`, raw: MP4, contentType: 'application/octet-stream' })
  rows.push(`| Video forkledd som bilde | ${vid.status} ${vid.error ?? ''} (forventet 415 video_not_allowed) |`)
  expect([vid.status, vid.error]).toEqual([415, 'video_not_allowed'])

  // «Glemt passord» for testkontoen selv → testpostkassen
  const b2 = mails().length
  const rec = await api(page, 'auth.recover', { email: EMAIL }, { anonymous: true })
  rows.push(`| «Glemt passord» | ${rec.status}; e-post til testpostkassen: ${mails().slice(b2).some((m) => m.to === EMAIL) ? 'ja' : 'nei'} |`)
  expect(rec.ok).toBe(true)

  const report = rows.join('\n')
  console.log(`\n${report}\n`)
  await info.attach('admin-skriving', { body: report, contentType: 'text/markdown' })
})
