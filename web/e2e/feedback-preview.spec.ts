import { expect, test } from '@playwright/test'

/**
 * TB-53E3CF: miniatyren av siden i tilbakemeldingen. Opptaket tas av en ekte side i appen, og miniatyren tegnes med samme
 * komponent som i admin. Den gule rammen skal stå der elementet står, og feltverdier, filnavn og bilder skal ikke være med.
 */
test('miniatyren viser siden, og markeringen står på riktig sted uten brukerinnhold', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('main button').first().waitFor()
  const r = await page.evaluate(async () => {
    const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
    // brukerinnhold som aldri skal være med: feltverdi, filnavn og et bilde
    const extra = document.createElement('div')
    extra.innerHTML = '<input value="hemmelig-123" style="width:200px;height:30px"><button>Ferie 2026.jpg</button><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="width:80px;height:80px">'
    document.querySelector('main')?.prepend(extra)
    const target = [...document.querySelectorAll('main button')].find((b) => b.getBoundingClientRect().width > 60 && (b.textContent || '').trim() && !/Ferie/.test(b.textContent || '')) as HTMLElement
    const tr = target.getBoundingClientRect()
    const W = innerWidth, H = innerHeight, p = (v: number) => Math.round(v * 1000) / 10
    const rect = { x: p(tr.left / W), y: p(tr.top / H), w: p(tr.width / W), h: p(tr.height / H) }
    const rows: string[] = M.pageLayout()
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:0;top:0;width:480px;z-index:99999;background:#000'
    document.body.appendChild(host)
    M.mount(host, rows, rect, W + '×' + H)
    const box = host.querySelector('[data-fb-preview]') as HTMLElement
    const hl = (host.querySelector('[data-fb-hl]') as HTMLElement).getBoundingClientRect()
    const b = box.getBoundingClientRect()
    return {
      rows, bytes: new TextEncoder().encode(JSON.stringify(rows)).length, kinds: [...new Set(rows.map((x) => x[0]))],
      want: { x: (tr.left / W) * b.width, y: (tr.top / H) * b.height, w: (tr.width / W) * b.width, h: (tr.height / H) * b.height },
      got: { x: hl.left - b.left, y: hl.top - b.top, w: hl.width, h: hl.height },
      wire: box.querySelectorAll('[data-fb-wire]').length, boxH: b.height, ratio: b.width / b.height, vr: W / H,
    }
  })
  if (process.env.ML_SHOT) await page.locator('[data-fb-preview]').screenshot({ path: process.env.ML_SHOT + '-' + test.info().project.name + '.png' })
  // kompakt: under grensen i databasen og høyst 480 px bred
  expect(r.bytes).toBeLessThanOrEqual(3000)
  expect(r.wire).toBeGreaterThan(5)
  expect(Math.abs(r.ratio - r.vr)).toBeLessThan(0.02)
  // sidens oppbygning: knapper, paneler/kort og tekst
  expect(r.kinds).toEqual(expect.arrayContaining(['b', 't']))
  // markeringen på riktig sted (±1,5 px i miniatyren)
  for (const k of ['x', 'y', 'w', 'h'] as const) expect(Math.abs(r.got[k] - r.want[k])).toBeLessThan(1.5)
  // ingen brukerinnhold
  const all = r.rows.join('\n')
  expect(all).not.toContain('hemmelig')
  expect(all).not.toContain('Ferie')
  expect(r.rows.some((x) => x.startsWith('m '))).toBe(true) // bildet er bare en tom flate
})

/**
 * TB-ED697B: global markering. Alt+Shift+M legger markeringen over det som er åpent (her en meny som lukkes ved klikk
 * utenfor, som kontomenyen), elementet under pekeren fremheves, og et klikk åpner skjemaet med markeringen.
 */
test('Alt+Shift+M markerer et element i en åpen meny, og markeringen følger med i skjemaet', async ({ page }) => {
  await page.goto('/app/photo-design')
  await page.locator('main button').first().waitFor()
  await page.evaluate(async () => {
    const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
    const host = document.createElement('div')
    document.body.appendChild(host)
    M.mountFeedback(host)
    // en meny som kontomenyen: lukkes ved pointerdown utenfor seg selv
    const menu = document.createElement('div')
    menu.id = 'test-menu'
    menu.style.cssText = 'position:fixed;right:20px;bottom:80px;z-index:2147480000;padding:12px;background:#222'
    menu.innerHTML = '<button id="menu-item" style="width:180px;height:40px">Konto og sikkerhet</button>'
    document.body.appendChild(menu)
    document.addEventListener('pointerdown', (e) => { if (!menu.contains(e.target as Node) && !(e.target as Element).closest('[data-chfb-tool]')) menu.remove() })
  })
  await page.keyboard.press('Alt+Shift+KeyM')
  const bar = page.locator('[data-chfb-tool][role="toolbar"]')
  await expect(bar).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Send tilbakemelding' })).toHaveCount(0) // skjemaet åpnes ikke først
  const item = page.locator('#menu-item')
  const b = (await item.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  // fremheving av elementet under pekeren, på samme plass som elementet
  const box = page.locator('[data-chfb-tool]:not([role]):not([role="application"])').last()
  await expect.poll(async () => { const r = await box.boundingBox(); return r ? Math.abs(r.x - b.x) + Math.abs(r.width - b.width) : 999 }).toBeLessThan(3)
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await expect(item).toBeVisible() // menyen er fortsatt åpen
  await bar.getByRole('button', { name: 'Bekreft markering' }).click()
  const dlg = page.getByRole('dialog', { name: 'Send tilbakemelding' })
  await expect(dlg).toBeVisible()
  await dlg.getByRole('radio', { name: 'Rapporter en feil' }).click()
  await expect(dlg.locator('[data-chfb-marked]')).toContainText('«Konto og sikkerhet»')
  // vanlig bruk etterpå: ingen markeringsflate igjen som blokkerer
  await expect(page.locator('[data-chfb-tool]')).toHaveCount(0)
})
