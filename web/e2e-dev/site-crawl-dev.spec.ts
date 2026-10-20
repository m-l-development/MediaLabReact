import { expect, test, type Page } from '@playwright/test'
import { dropOwnFactors, EMAIL, expectHub, injectBackend, PASSWORD, setupMfa, signInPassword } from './helpers'

/**
 * Gjennomgang av hele nettstedet for én rolle mot connecthub-dev (kjøres av run-dev.mjs i løpene user, admin, dev og mod).
 * Bare lesing: åpner forsiden, Medier, alle verktøyene, en ukjent adresse og alle admin-seksjonene på PC (1440) og mobil
 * (390), og feiler ved sidefeil, konsollfeil, mislykkede kall, feilsiden («Noe gikk galt»), vannrett rulling på mobil,
 * interne lenker som ikke finnes, og seksjoner rollen ikke skal se. Innlogging og MFA er bare oppsett her, ikke testet.
 */
const ROLE = process.env.ML_DEV_ROLE ?? ''
test.skip(!EMAIL || !PASSWORD || !['user', 'admin', 'staff'].includes(ROLE), 'kjøres av run-dev.mjs')
test.beforeEach(async ({ page }) => injectBackend(page))

const TOOLS = ['loop-studio', 'thumbnail-studio', 'motion-design', 'photo-design', 'isolate-subject', 'mockups']
const ALL = ['oversikt', 'brukere', 'menigheter', 'tilgang', 'invitasjoner', 'filer', 'samarbeid', 'abonnement', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail', 'logg']
const STAFF_ONLY = ['samarbeid', 'tilbakemeldinger', 'opprydning', 'foresporsler', 'mail']
const SIZES = [['desktop', { width: 1440, height: 900 }], ['mobil', { width: 390, height: 844 }]] as const

// Vercel legger sitt eget verktøylinjeskript (vercel.live) inn i forhåndsvisninger; appens CSP blokkerer det, som den skal.
// Det finnes ikke i produksjonen og er ikke appens feil, så det telles bare ikke mot en forhåndsvisning.
// bare forhåndsvisninger (samme mønster som run-dev.mjs --remote); produksjonsadressen media-lab-react-vyef.vercel.app er ikke med
const PREVIEW = /^https:\/\/media-lab-react-vyef-[a-z0-9-]+-media-lab3\.vercel\.app\/?$/.test(process.env.ML_DEV_BASE ?? '')
const vercelLive = (s: string) => PREVIEW && s.includes('vercel.live')

function watch(page: Page) {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`sidefeil: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => {
    // Nettleseren logger selv 4xx-svar som konsollfeil; de fanges (med adresse) av response-lytteren under.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()) && !vercelLive(m.text())) problems.push(`konsoll: ${m.text().slice(0, 160)}`)
  })
  page.on('response', (r) => {
    const u = r.url()
    if (r.status() >= 400 && (/supabase\.co/.test(u) || u.includes('/api/') || u.startsWith(new URL(page.url() || 'http://x').origin))) problems.push(`${r.status()} ${r.request().method()} ${u.replace(/\?.*$/, '').replace(/^https?:\/\/[^/]+/, '')}`)
  })
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText ?? ''
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(f) && !vercelLive(r.url())) problems.push(`nett: ${f} ${r.url().replace(/\?.*$/, '').slice(0, 120)}`)
  })
  return problems
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
  await page.waitForTimeout(600)
}

/** Vannrett rulling på siden (mobil) og interne lenker. */
async function layout(page: Page) {
  return page.evaluate(() => {
    const over = document.documentElement.scrollWidth - window.innerWidth
    const links = [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith(location.origin))
    return { over, links: [...new Set(links)] }
  })
}

test('hele nettstedet: sider, verktøy og admin-seksjoner for rollen (bare lesing)', async ({ page, request }, info) => {
  test.skip(info.project.name === 'mobil', 'kjøres én gang; mobilbredden sjekkes i testen')
  test.skip(PREVIEW && ROLE === 'staff', 'stab logger inn via dagens innloggingsside med eget MFA-oppsett i Vercel-miljøet; stab kjøres lokalt')
  test.setTimeout(900_000)
  const problems = watch(page)
  const rows = ['| Bredde | Side | Resultat |', '|---|---|---|']
  const fails: string[] = []
  const links = new Set<string>()
  await signInPassword(page)
  if (ROLE === 'staff') await setupMfa(page)
  else await expectHub(page)
  try {
    const visit = async (label: string, url: string, ready: () => Promise<unknown>, w: string, width: number) => {
      const before = problems.length
      await page.goto(url)
      await ready()
      await settle(page)
      const crashed = await page.getByRole('heading', { name: 'Noe gikk galt' }).count()
      const l = await layout(page)
      l.links.forEach((h) => links.add(h))
      const found = problems.slice(before)
      if (crashed) found.push('feilsiden «Noe gikk galt»')
      if (width < 500 && l.over > 1) found.push(`vannrett rulling ${l.over}px`)
      rows.push(`| ${w} | ${label} | ${found.length ? found.join('; ').slice(0, 300) : 'ok'} |`)
      if (found.length) fails.push(`${w} ${label}: ${found.join('; ')}`)
    }
    for (const [w, size] of SIZES) {
      await page.setViewportSize(size)
      await visit('forsiden', '/app/', () => expectHub(page), w, size.width)
      await visit('Medier', '/app/medier', () => expect(page.locator('main')).toBeVisible({ timeout: 30_000 }), w, size.width)
      for (const tool of TOOLS) {
        await visit(tool, `/app/${tool}`, () => expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 45_000 }), w, size.width)
      }
      await visit('ukjent adresse', '/app/finnes-ikke-xyz', () => expect(page.getByRole('heading', { name: 'Siden finnes ikke' })).toBeVisible({ timeout: 30_000 }), w, size.width)

      await page.goto('/app/admin')
      await expect(page.locator('.ch-nav')).toBeVisible({ timeout: 45_000 })
      const nav = await page.locator('.ch-nav a[href*="#/"]').evaluateAll((as) => [...new Set(as.map((a) => (a.getAttribute('href') ?? '').replace(/^.*#\//, '').split('/')[0]))])
      const want = ROLE === 'staff' ? ALL : ROLE === 'admin' ? ALL.filter((s) => !STAFF_ONLY.includes(s)) : ['oversikt', 'menigheter', 'filer']
      rows.push(`| ${w} | admin-meny | ${nav.join(', ')} |`)
      if (ROLE === 'user') {
        const extra = nav.filter((s) => !want.includes(s))
        if (extra.length) fails.push(`${w} meny: Bruker ser ${extra.join(', ')}`)
      } else {
        expect(nav.sort(), `${w} menyen for ${ROLE}`).toEqual([...want].sort())
      }
      for (const sec of ALL) {
        const visible = nav.includes(sec)
        await visit(`admin #/${sec}${visible ? '' : ' (skjult)'}`, `/app/admin#/${sec}`, () => expect(page.locator('main h1').first()).toBeVisible({ timeout: 45_000 }), w, size.width)
        const h1 = ((await page.locator('main h1').first().textContent()) ?? '').trim()
        if (!visible && sec !== 'oversikt' && h1 !== 'Ingen tilgang') fails.push(`${w} #/${sec}: skjult seksjon viser «${h1}» i stedet for «Ingen tilgang»`)
        if (visible && h1 === 'Ingen tilgang') fails.push(`${w} #/${sec}: synlig seksjon viser «Ingen tilgang»`)
        if (w === 'mobil') await page.screenshot({ path: info.outputPath(`${sec}-mobil.png`) })
      }
    }
    // Interne lenker (ikke ankre): skal svare uten feil.
    for (const href of links) {
      const u = new URL(href)
      if (u.hash && u.pathname === new URL(page.url()).pathname) continue
      const r = await request.get(u.origin + u.pathname + u.search, { maxRedirects: 5 })
      if (r.status() >= 400) fails.push(`lenke ${u.pathname}: ${r.status()}`)
    }
    rows.push(`| – | interne lenker | ${links.size} kontrollert |`)
  } finally {
    const report = rows.join('\n')
    console.log(`\n${ROLE} ${EMAIL.split('@')[0]}:\n${report}\n`)
    await info.attach('rapport', { body: report, contentType: 'text/markdown' })
    if (ROLE === 'staff') await dropOwnFactors(page).catch(() => undefined)
  }
  expect(fails, fails.join('\n')).toEqual([])
})
