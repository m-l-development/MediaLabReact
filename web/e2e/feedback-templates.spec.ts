import fs from 'node:fs'
import { test, type Page } from '@playwright/test'

/**
 * Lager src/shared/feedback/templates.json: dagens oppbygning av hver applikasjon (samme trygge omriss som tilbakemeldingene
 * lagrer), til forhåndsvisningen av saker som ble sendt før omrisset fantes. Kjøres bare ved behov, når en app er endret:
 *   ML_GEN_TEMPLATES=1 npx playwright test e2e/feedback-templates.spec.ts --workers=1
 * Sidene er tomme (ingen innlogging, ingen brukerdata), så opptaket inneholder aldri brukerinnhold.
 */
test.skip(!process.env.ML_GEN_TEMPLATES, 'kjøres bare når malene skal lages på nytt')

const OUT = 'src/shared/feedback/templates.json'
/** Én eller flere visninger per applikasjon (start og redigering); forhåndsvisningen velger den som passer markeringen. */
const PAGES: { app: string; url: string; view?: string; go?: (p: Page) => Promise<void> }[] = [
  { app: 'media-lab', url: '/app/' },
  { app: 'media-library', url: '/app/medier' },
  { app: 'photo-design', url: '/app/photo-design' },
  { app: 'photo-design', url: '/app/photo-design', go: async (p) => { await p.locator('[data-tpl="photo"]').click(); await p.locator('[data-pd-view="edit"]').waitFor() } },
  { app: 'motion-design', url: '/app/motion-design' },
  { app: 'motion-design', url: '/app/motion-design', go: async (p) => { await p.getByRole('button', { name: 'Nytt prosjekt' }).click(); await p.locator('[data-format="wide"]').click(); await p.locator('[data-tpl="blank"]').click(); await p.locator('[data-md-canvas]').waitFor() } },
  { app: 'thumbnail-studio', url: '/app/thumbnail-studio' },
  { app: 'thumbnail-studio', url: '/app/thumbnail-studio?cat=sunday', go: async (p) => { await p.getByRole('button', { name: /Ny mal/ }).click(); await p.getByRole('dialog', { name: 'Ny mal' }).locator('[data-layout="base:main"]').click(); await p.locator('canvas[aria-label="Lerret"], [aria-label="Lerret"]').first().waitFor() } },
  { app: 'loop-studio', url: '/app/loop-studio' },
  { app: 'loop-studio', url: '/app/loop-studio?mal=week&demo=1', view: '?mal=…', go: async (p) => { await p.locator('[data-loop-canvas]').waitFor() } },
  { app: 'loop-editor', url: '/app/loop-studio?mal=week&demo=1', go: async (p) => { await p.locator('[data-loop-canvas]').waitFor() } },
  { app: 'isolate-subject', url: '/app/isolate-subject' },
  { app: 'mockups', url: '/app/mockups' },
  // admin krever innlogging: tegnes med falske, nøytrale data (LayoutPreview.mount.tsx, mountAdmin)
  ...['oversikt', 'brukere', 'menigheter', 'invitasjoner', 'filer/felles', 'tilbakemeldinger', 'mail', 'logg'].map((h) => ({
    app: 'connecthub-admin', url: '/app/photo-design', view: '#/' + h,
    go: async (p: Page) => {
      await p.evaluate(async (hash) => {
        const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
        for (const c of [...document.body.children]) (c as HTMLElement).style.display = 'none'
        const host = document.createElement('div')
        document.body.appendChild(host)
        M.mountAdmin(host, hash)
      }, '#/' + h)
      await p.locator('.ch-shell, main').last().waitFor()
    },
  })),
]

test('opptak av applikasjonene til forhåndsvisningen', async ({ page }, info) => {
  test.setTimeout(240_000)
  const key = info.project.name === 'mobil' ? 'm' : 'd'
  const out = JSON.parse(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '{}') as Record<string, Record<string, { v?: string; rows: string[] }[]>>
  for (const a of Object.keys(out)) delete out[a]?.[key]
  for (const p of PAGES) {
    await page.goto(p.url)
    await page.locator('main, [role=main], #root > *').first().waitFor()
    if (p.go) await p.go(page)
    await page.waitForTimeout(800)
    // varselet for lokal utvikling finnes ikke i appen brukerne ser
    await page.evaluate(() => { for (const e of document.querySelectorAll('body *')) if (/^Lokal utvikling uten innlogging/.test((e as HTMLElement).innerText || '') && e.children.length === 0) (e.closest('[role],div') as HTMLElement).style.display = 'none' })
    const rows = await page.evaluate(async () => {
      const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
      return M.pageLayout(undefined, document.body, 6000) as string[]
    })
    const list = ((out[p.app] ??= {})[key] ??= [])
    list.push(p.view ? { v: p.view, rows } : { rows })
    if (process.env.ML_SHOT) await page.screenshot({ path: `${process.env.ML_SHOT}-app-${p.app}-${list.length}-${key}.png` })
  }
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n')
})
