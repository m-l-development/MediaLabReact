import { expect, test } from '@playwright/test'
import { api, dropOwnFactors, EMAIL, injectBackend, mails, PASSWORD, rest, rpc, setupMfa, signInPassword } from './helpers'

/**
 * Adminhandlinger som endrer data, mot connecthub-dev som Developer med MFA (kjøres av run-dev.mjs, løpet «drift»).
 * Bare data testen selv lager, og som fjernes igjen: to testmenigheter («E2E Testmenighet …») med navn, logo, kvote,
 * brukergrense, abonnementsforespørsel og samarbeidsgruppe – slettes til slutt (sett til sletting → endelig sletting);
 * velkomstmalen endres og settes tilbake; to kontoforespørsler fra ch-test-e2e-…@example.com (avslått og godkjent,
 * invitasjonen trekkes tilbake, forespørslene slettes). E-post går bare til testpostkassen.
 * Kalles med appens egne tjenestekall og brukerens økt (ikke klikket i grensesnittet; det er dekket av komponenttester).
 */
test.skip(!EMAIL || !PASSWORD || process.env.ML_DEV_ROLE !== 'staff', 'kjøres av run-dev.mjs med Developer')
test.beforeEach(async ({ page }) => injectBackend(page))

const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 18, 73, 68, 65, 84, 120, 156, 99, 120, 38, 34, 242, 76, 68, 132, 1, 66, 1, 0, 32, 222, 4, 57, 4, 175, 122, 106, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]

const one = <T,>(r: { body: unknown }) => (Array.isArray(r.body) ? (r.body[0] as T | undefined) : undefined)

test('Admin (Developer): menighetens livsløp, kvote, grense, abonnement, samarbeidsgruppe, e-postmal, kontoforespørsler, opprydning', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang')
  test.setTimeout(400_000)
  const rows = ['| Handling | Resultat |', '|---|---|']
  const bad: string[] = []
  const step = async (label: string, run: () => Promise<string>) => {
    try {
      rows.push(`| ${label} | ${await run()} |`)
    } catch (e) {
      bad.push(label)
      rows.push(`| ${label} | **FEIL**: ${String((e as Error).message).split('\n')[0]?.slice(0, 180)} |`)
    }
  }
  const must = (ok: boolean, msg: string) => { if (!ok) throw new Error(msg) }
  await signInPassword(page)
  await setupMfa(page)
  const churches: { id: string; name: string }[] = []
  const stamp = Date.now()
  let welcome: { subject: string; blocks: unknown[] } | null = null
  let welcomeSaved = false
  const reqIds: string[] = []
  try {
    // testmenigheter fra en tidligere, avbrutt kjøring (bare testens eget navnemønster) slettes først
    const old = ((await rest(page, `/rest/v1/churches?select=id,name&name=like.${encodeURIComponent('E2E Testmenighet *')}`)).body as { id: string; name: string }[] | null) ?? []
    for (const o of old.filter((x) => /^E2E Testmenighet [AB] \d+( omdøpt)?$/.test(x.name))) churches.push(o)
    if (churches.length) rows.push(`| Etterlatte testmenigheter fra før (slettes til slutt) | ${churches.length} |`)
    const leftovers = churches.length

    // ---------- menighetens livsløp ----------
    await step('Opprett to testmenigheter', async () => {
      for (const n of ['A', 'B']) {
        const r = await rest(page, '/rest/v1/churches?select=id,name,status', { method: 'POST', body: { name: `E2E Testmenighet ${n} ${stamp}` }, headers: { Prefer: 'return=representation' } })
        const c = one<{ id: string; name: string; status: string }>(r)
        must(r.status === 201 && !!c, `${r.status} ${r.code ?? ''}`)
        churches.push({ id: c!.id, name: c!.name })
      }
      return `201, status ${churches.length === 2 ? 'active' : '?'}`
    })
    const [c1, c2] = churches.slice(leftovers)
    if (!c1 || !c2) throw new Error('testmenighetene ble ikke laget')
    await step('Gi nytt navn', async () => {
      const name = `${c1.name} omdøpt`
      const r = await rest(page, `/rest/v1/churches?id=eq.${c1.id}`, { method: 'PATCH', body: { name } })
      const now = one<{ name: string }>(await rest(page, `/rest/v1/churches?select=name&id=eq.${c1.id}`))
      must(now?.name === name, `${r.status}, navnet er «${now?.name}»`)
      c1.name = name
      return `${r.status}; navnet endret`
    })
    await step('Logo: stab uten Admin-rolle avvises; som ekstra Admin: last opp til Logoer og sett som logo', async () => {
      const denied = await api(page, 'file.upload', null, { query: `&church=${c1.id}&folder=logoer&name=e2e-avvist.png`, raw: PNG, contentType: 'application/octet-stream' })
      const self = await rpc(page, 'request_admin_access', { p_church: c1.id, p_duration: '1d' }) // menigheten har ingen Admin: midlertidig tilgang uten godkjenning
      const up = await api(page, 'file.upload', null, { query: `&church=${c1.id}&folder=logoer&name=e2e-logo-${stamp}.png`, raw: PNG, contentType: 'application/octet-stream' })
      const fid = (up.body?.file as { id?: string } | undefined)?.id
      must(up.ok && !!fid, `opplasting ${up.status} ${up.error ?? ''}`)
      const r = await rpc(page, 'set_church_logo', { p_church: c1.id, p_file: fid })
      const now = one<{ logo_file_id: string }>(await rest(page, `/rest/v1/churches?select=logo_file_id&id=eq.${c1.id}`))
      const off = await rpc(page, 'remove_self_as_admin', { p_church: c1.id })
      must(denied.status === 403 && now?.logo_file_id === fid, `uten Admin ${denied.status}, set_church_logo ${r.status} ${r.code ?? ''}`)
      return `uten Admin-rolle ${denied.status} ${denied.error ?? ''}; ekstra Admin ${self.status}, opplasting ${up.status}, logo satt ${r.status}, ekstra Admin fjernet ${off.status}`
    })
    await step('Egen lagringskvote og tilbakestilling', async () => {
      const s = await rpc(page, 'set_church_quota', { p_church: c1.id, p_quota_mb: 123 })
      const a = one<{ storage_quota_mb: number; quota_custom: boolean }>(await rest(page, `/rest/v1/churches?select=storage_quota_mb,quota_custom&id=eq.${c1.id}`))
      const r = await rpc(page, 'reset_church_quota', { p_church: c1.id })
      const b = one<{ storage_quota_mb: number; quota_custom: boolean }>(await rest(page, `/rest/v1/churches?select=storage_quota_mb,quota_custom&id=eq.${c1.id}`))
      must(a?.storage_quota_mb === 123 && a.quota_custom && !b?.quota_custom, `${JSON.stringify(a)} → ${JSON.stringify(b)}`)
      return `${s.status}: 123 MB (egen) → ${r.status}: ${b?.storage_quota_mb} MB (fra planen)`
    })
    await step('Brukergrense for menigheten (stab med MFA)', async () => {
      const s = await rpc(page, 'set_member_limit', { p_church: c1.id, p_limit: 5, p_reason: 'Automatisk test (e2e-dev)' })
      const u = (await rpc(page, 'member_usage', { p_church: c1.id })).body as { limit: number; count: number }
      must(s.status === 200 && u.limit === 5, `${s.status} ${s.code ?? ''}, grense ${u?.limit}`)
      return `${s.status}; grense ${u.limit}, brukere ${u.count}`
    })
    await step('Abonnement: be om plan (som ekstra Admin) og avgjør (stab)', async () => {
      const plans = (await rpc(page, 'plans_admin', {})).body as { code: string; active: boolean }[]
      const plan = plans.find((p) => p.active)?.code
      must(!!plan, 'ingen aktiv plan')
      const self = await rpc(page, 'request_admin_access', { p_church: c1.id, p_duration: '1d' }) // menigheten har ingen Admin: midlertidig tilgang uten godkjenning
      const req = await rpc(page, 'request_subscription', { p_church: c1.id, p_plan: plan, p_free: true, p_reason: 'Automatisk test (e2e-dev)' })
      const sr = one<{ id: string; status: string }>(await rest(page, `/rest/v1/subscription_requests?select=id,status&church_id=eq.${c1.id}&order=created_at.desc&limit=1`))
      must(!!sr, `forespørsel ${req.status} ${req.code ?? ''}`)
      const dec = await rpc(page, 'decide_subscription_request', { p_id: sr!.id, p_approve: true, p_note: 'Automatisk test' })
      const after = one<{ status: string }>(await rest(page, `/rest/v1/subscription_requests?select=status&id=eq.${sr!.id}`))
      await rpc(page, 'remove_self_as_admin', { p_church: c1.id })
      must(dec.status < 300 && after?.status !== 'pending', `avgjørelse ${dec.status} ${dec.code ?? ''}, status ${after?.status}`)
      return `ekstra Admin ${self.status}, forespørsel ${req.status}, avgjort ${dec.status} → ${after?.status}`
    })
    let link = ''
    await step('Samarbeidsgruppe: opprett, endre, avslutt', async () => {
      const g = await rpc(page, 'create_group', { p_name: `E2E gruppe ${stamp}`, p_description: 'Automatisk test', p_churches: [c1.id, c2.id] })
      link = typeof g.body === 'string' ? g.body : ((g.body as { id?: string } | null)?.id ?? '')
      must(g.status === 200 && !!link, `${g.status} ${g.code ?? ''}`)
      const u = await rpc(page, 'update_group', { p_link: link, p_name: `E2E gruppe ${stamp} endret`, p_description: 'Endret' })
      const e = await rpc(page, 'end_link', { p_link: link })
      const st = one<{ status: string }>(await rest(page, `/rest/v1/church_links?select=status&id=eq.${link}`))
      must(e.status < 300, `avslutt ${e.status} ${e.code ?? ''}`)
      return `opprettet ${g.status}, endret ${u.status}, avsluttet ${e.status} (status ${st?.status ?? 'ikke synlig'})`
    })

    // ---------- e-postmal ----------
    await step('E-postmal: endre velkomstmalen, testutsending, tilbake', async () => {
      const saved = ((await rpc(page, 'mail_templates', {})).body as { key: string; subject: string; blocks: unknown[] }[] | null) ?? []
      const cur = saved.find((x) => x.key === 'welcome')
      welcomeSaved = !!cur
      welcome = cur ? { subject: cur.subject, blocks: cur.blocks } : null
      const blocks = cur?.blocks ?? [{ t: 'logo' }, { t: 'h', text: 'Velkommen til MediaLab!' }, { t: 'p', text: 'Test fra e2e-dev.' }, { t: 'link', label: 'Opprett brukeren min' }]
      const subject = `E2E-test ${stamp}`
      const s = await rpc(page, 'save_mail_template', { p_key: 'welcome', p_subject: subject, p_blocks: blocks })
      must(s.status < 300, `lagre ${s.status} ${s.code ?? ''}`)
      const before = mails().length
      const t = await api(page, 'mail.test', { key: 'welcome' })
      const got = mails().slice(before).some((m) => m.subject.includes(subject))
      must(t.ok && got, `testutsending ${t.status} ${t.error ?? ''}, nytt emne i testpostkassen: ${got}`)
      return `lagret ${s.status}; testutsending med nytt emne til testpostkassen: ja`
    })

    // ---------- kontoforespørsler ----------
    const ask = async (n: string) => {
      const f = await api(page, 'request.form', {}, { anonymous: true })
      const token = (f.body as { token?: string } | null)?.token
      await page.waitForTimeout(3200) // skjemaet må ha vært åpent i minst 3 s
      const email = `ch-test-e2e-${stamp}${n}@example.com`
      const s = await api(page, 'request.submit', { name: `E2E Forespørsel ${n}`, phone: '+47 400 00 000', email, church: 'E2E Testmenighet', token }, { anonymous: true })
      const list = ((await rpc(page, 'account_requests_list', {})).body as { id: string; email: string; status: string }[] | null) ?? []
      return { submit: s, row: list.find((r) => r.email === email), email }
    }
    await step('Kontoforespørsel: send inn (uten innlogging), notat, avslå, slett', async () => {
      const a = await ask('1')
      must(a.submit.ok && !!a.row, `innsending ${a.submit.status} ${a.submit.error ?? ''}, i innboksen: ${!!a.row}`)
      reqIds.push(a.row!.id)
      const note = await rpc(page, 'add_account_request_note', { p_id: a.row!.id, p_note: 'Automatisk test' })
      const rej = await rpc(page, 'reject_account_request', { p_id: a.row!.id, p_reason: 'Automatisk test (e2e-dev)' })
      const del = await rpc(page, 'delete_account_request', { p_id: a.row!.id })
      reqIds.pop()
      must(rej.status < 300 && del.status < 300, `avslag ${rej.status} ${rej.code ?? ''}, sletting ${del.status}`)
      return `innsendt ${a.submit.status}, notat ${note.status}, avslått ${rej.status}, slettet ${del.status}`
    })
    await step('Kontoforespørsel: godkjenn til testmenigheten (invitasjon til testpostkassen), trekk tilbake, slett', async () => {
      const b = await ask('2')
      must(b.submit.ok && !!b.row, `innsending ${b.submit.status} ${b.submit.error ?? ''}`)
      reqIds.push(b.row!.id)
      const before = mails().length
      const ap = await api(page, 'request.approve', { id: b.row!.id, mode: 'existing', role: 'user', church_id: c2.id })
      const inv = one<{ id: string }>(await rest(page, `/rest/v1/invitations?select=id&email=eq.${encodeURIComponent(b.email)}&status=eq.pending`))
      const mailed = mails().slice(before).some((m) => m.to === b.email)
      const rv = inv ? await rpc(page, 'revoke_invitation', { p_id: inv.id }) : { status: 0 }
      const del = await rpc(page, 'delete_account_request', { p_id: b.row!.id })
      if (del.status < 300) reqIds.pop()
      must(ap.ok && !!inv && mailed, `godkjenning ${ap.status} ${ap.error ?? ''}, invitasjon ${!!inv}, e-post ${mailed}`)
      return `godkjent ${ap.status}, invitasjon laget og sendt til testpostkassen, trukket tilbake ${rv.status}, slettet ${del.status}`
    })

    // ---------- opprydning ----------
    await step('Opprydning: oversikt (bare lesing)', async () => {
      const o = await rpc(page, 'cleanup_overview', {})
      must(o.status === 200, `${o.status}`)
      return `200; ${(o.body as unknown[] | null)?.length ?? 0} menighet(er) i oversikten`
    })
  } finally {
    // e-postmalen tilbake
    const back = welcome as { subject: string; blocks: unknown[] } | null
    const r = welcomeSaved && back ? await rpc(page, 'save_mail_template', { p_key: 'welcome', p_subject: back.subject, p_blocks: back.blocks }) : await rpc(page, 'reset_mail_template', { p_key: 'welcome' })
    rows.push(`| Velkomstmalen tilbake (${welcomeSaved ? 'lagret versjon' : 'standard'}) | ${r.status} |`)
    for (const id of reqIds) await rpc(page, 'delete_account_request', { p_id: id }).catch(() => undefined)
    // testmenighetene slettes: sett til sletting → endelig sletting (med navnet som bekreftelse)
    for (const c of churches) {
      const s = await rpc(page, 'set_church_status', { p_church: c.id, p_status: 'pending_deletion' })
      const p = await api(page, 'church.purge', { church_id: c.id, confirm_name: c.name })
      const gone = ((await rest(page, `/rest/v1/churches?select=id&id=eq.${c.id}`)).body as unknown[] | null)?.length === 0
      rows.push(`| Slett «${c.name}» | til sletting ${s.status}, endelig sletting ${p.status} ${p.error ?? ''}; borte: ${gone ? 'ja' : '**nei**'} |`)
      if (!gone) bad.push('sletting')
    }
    rows.push(`| MFA-faktor fjernet etter testen | ${(await dropOwnFactors(page)).join(', ') || '–'} |`)
    const report = rows.join('\n')
    console.log(`\n${report}\n`)
    await info.attach('admin-drift', { body: report, contentType: 'text/markdown' })
  }
  expect(bad).toEqual([])
})
