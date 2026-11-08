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
 * Global markering (TB-ED697B) i den ekte kontomenyen: Alt+Shift+M legger markeringen over menyen uten å lukke den, elementet
 * under pekeren fremheves, både element og område kan velges, og menyen virker som før etterpå.
 */
test('Alt+Shift+M markerer elementer i den åpne kontomenyen, og menyen virker som før etterpå', async ({ page }, info) => {
  const mobile = info.project.name === 'mobil'
  await page.goto('/app/photo-design')
  await page.locator('main button').first().waitFor()
  await page.evaluate(async () => {
    const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
    const host = document.createElement('div')
    document.body.appendChild(host)
    M.mountFeedback(host)
  })
  await page.locator('[data-ch-account]').last().click()
  const item = page.getByRole('button', { name: 'Konto og sikkerhet' })
  await expect(item).toBeVisible()
  await page.keyboard.press('Alt+Shift+KeyM')
  const bar = page.locator('[data-chfb-tool][role="toolbar"]')
  await expect(bar).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Send tilbakemelding' })).toHaveCount(0)
  const b = (await item.boundingBox())!
  if (!mobile) {
    // fremheving av elementet under pekeren
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    const box = page.locator('[data-chfb-tool]:not([role])')
    await expect.poll(async () => { const r = await box.boundingBox(); return r ? Math.abs(r.x - b.x) + Math.abs(r.width - b.width) : 999 }).toBeLessThan(3)
    // et område kan også velges (dra over menyen), og velges så på nytt
    await page.mouse.move(b.x + 2, b.y - 30)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width - 2, b.y + b.height, { steps: 5 })
    await page.mouse.up()
    await expect(bar).toContainText('Er markeringen riktig?')
    await expect(item).toBeVisible() // menyen er fortsatt åpen
    await bar.getByRole('button', { name: 'Velg på nytt' }).click()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  } else await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
  await expect(item).toBeVisible()
  await bar.getByRole('button', { name: 'Bekreft markering' }).click()
  const dlg = page.getByRole('dialog', { name: 'Send tilbakemelding' })
  await dlg.getByRole('radio', { name: 'Rapporter en feil' }).click()
  await expect(dlg.locator('[data-chfb-marked]')).toContainText('<button> «Konto og sikkerhet')
  await expect(page.locator('[data-chfb-tool]')).toHaveCount(0) // ingen markeringsflate igjen
  // menyen virker som før: åpne den og gå til «Konto og sikkerhet»
  page.once('dialog', (d) => void d.accept()) // «forkaste det du har skrevet?»
  await dlg.getByRole('button', { name: 'Lukk' }).first().click()
  await expect(dlg).toHaveCount(0)
  await page.locator('[data-ch-account]').last().click()
  await page.getByRole('button', { name: 'Konto og sikkerhet' }).click()
  await expect(page.locator('[data-ch-pwchange]')).toBeVisible()
})

/**
 * TB-7D30CC: under markering må skjemaet kunne scrolles (musehjul på PC, sveip på mobil). Før fanget markeringsflaten over
 * hele vinduet all scrolling, så felt under det synlige området var utilgjengelige. Utfylte verdier skal bevares, markeringen
 * skal virke, og tilbakemeldingen skal kunne sendes.
 */
test('skjemaet kan scrolles under markering, verdiene bevares og tilbakemeldingen sendes med markeringen', async ({ page }, info) => {
  const mobile = info.project.name === 'mobil'
  if (!mobile) await page.setViewportSize({ width: 1460, height: 600 }) // lavt vindu, så skjemaet må scrolles
  await page.goto('/app/photo-design')
  await page.locator('main button').first().waitFor()
  await page.evaluate(async () => {
    const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
    const host = document.createElement('div')
    document.body.appendChild(host)
    M.mountFeedback(host)
  })
  await page.getByRole('button', { name: 'Send tilbakemelding' }).last().click()
  const dlg = page.getByRole('dialog', { name: 'Send tilbakemelding' })
  await dlg.getByRole('radio', { name: 'Rapporter en feil' }).click()
  await dlg.getByLabel(/Hva fungerer ikke som forventet/).fill('Knappen eksporterer ikke')
  await dlg.getByRole('button', { name: 'Marker et område på skjermen' }).click()
  const bar = page.locator('[data-chfb-tool][role="toolbar"]')
  await expect(bar).toBeVisible()
  if (mobile) await bar.getByRole('button', { name: 'Vis skjemaet' }).click() // mobil: skjemaet dekker skjermen og er skjult først
  await expect(dlg).toBeVisible()
  const panel = (await dlg.boundingBox())!
  const top0 = await dlg.evaluate((el) => el.scrollTop)
  expect(await dlg.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  // scroll i skjemaet mens markeringen er aktiv: opp hvis det står nederst (knappen ligger nederst), ellers ned – og tilbake
  const scrollBy = async (dir: 1 | -1) => {
    if (mobile) {
      const { fingerDrag } = await import('./touch')
      await fingerDrag(page, { x: panel.x + panel.width / 2, y: panel.y + panel.height * (dir > 0 ? 0.8 : 0.3) }, 0, -dir * panel.height * 0.45, { steps: 8 })
    } else {
      await page.mouse.move(panel.x + panel.width / 2, panel.y + panel.height / 2)
      await page.mouse.wheel(0, dir * 600)
    }
  }
  const dir = top0 > 100 ? -1 : 1
  await scrollBy(dir)
  await expect.poll(() => dlg.evaluate((el) => el.scrollTop)).not.toBeCloseTo(top0, -2)
  const top1 = await dlg.evaluate((el) => el.scrollTop)
  expect(Math.sign(top1 - top0)).toBe(dir)
  await scrollBy(dir === 1 ? -1 : 1)
  await expect.poll(async () => Math.sign((await dlg.evaluate((el) => el.scrollTop)) - top1)).toBe(-dir)
  await expect(bar).toBeVisible() // markeringen er fortsatt aktiv
  // marker et element i appen (mobil: skjul skjemaet først, det dekker hele skjermen)
  if (mobile) await bar.getByRole('button', { name: 'Skjul skjemaet' }).click()
  // et element i appen som ikke ligger under instruksjonen eller skjemaet
  const t = await page.evaluate((px) => {
    const r = [...document.querySelectorAll('main button')].map((b) => b.getBoundingClientRect()).find((q) => q.top > 140 && q.bottom < innerHeight - 20 && q.right < px && q.width > 20)
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null
  }, mobile ? 10000 : panel.x)
  if (!t) throw new Error('fant ikke et element å markere')
  if (mobile) await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2)
  else await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2)
  await bar.getByRole('button', { name: 'Bekreft markering' }).click()
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('[data-chfb-marked]')).toBeVisible()
  // verdien er bevart, skjemaet kan fortsatt scrolles, og innsendingen tar med markeringen
  await expect(dlg.getByLabel(/Hva fungerer ikke som forventet/)).toHaveValue('Knappen eksporterer ikke')
  await dlg.getByLabel(/Hva gjorde du, og hva skjedde/).fill('Trykket på Eksporter, ingenting skjedde')
  await dlg.getByRole('button', { name: 'Send inn' }).click()
  await expect(dlg.locator('[data-chfb-ref]')).toHaveText('TB-TEST01')
  const sent = await page.evaluate(() => (window as unknown as { __fbSent: { description: string; marked: { mode: string; rect: object; layout: unknown[] } } }).__fbSent)
  expect(JSON.stringify(sent)).toContain('Knappen eksporterer ikke')
  expect(sent.marked.mode).toBe('element')
  expect(sent.marked.layout.length).toBeGreaterThan(0)
  // skjemaet (åpent ved siden av på PC) er ikke med i omrisset, og markeringen holder seg under grensen i databasen
  expect(sent.marked.layout.join(' / ')).not.toMatch(/Send inn|Avbryt|Marker/)
  expect(new TextEncoder().encode(JSON.stringify(sent.marked)).length + sent.marked.layout.length).toBeLessThanOrEqual(4000)
})

/**
 * Miniatyren skal være lesbar på alle sider: etiketter får plass (ellers vises bare formen), den gule rammen ligger øverst med
 * elementets navn helt innenfor miniatyren, og saker uten lagret omriss får en omtrentlig side i stedet for en tom ramme.
 */
test('miniatyren er ryddig og lesbar på ulike sider, også saker uten omriss', async ({ page }, info) => {
  const check = (withLayout: boolean) => page.evaluate(async (withLayout) => {
    const M = await import('/app/src/shared/feedback/LayoutPreview.mount.tsx' as string)
    document.querySelector('[data-test-host]')?.remove()
    const target = [...document.querySelectorAll('main button')].find((b) => { const q = b.getBoundingClientRect(); return q.width > 20 && q.height > 10 && q.top > 60 && q.bottom < innerHeight }) as HTMLElement
    const tr = target.getBoundingClientRect(), W = innerWidth, H = innerHeight, p = (v: number) => Math.round(v * 1000) / 10
    const rect = { x: p(tr.left / W), y: p(tr.top / H), w: p(tr.width / W), h: p(tr.height / H) }
    const host = document.createElement('div')
    host.dataset.testHost = ''
    host.style.cssText = 'position:fixed;left:0;top:0;width:min(480px,100vw);z-index:99999;background:#000'
    document.body.appendChild(host)
    M.mount(host, withLayout ? M.pageLayout() : undefined, rect, W + '×' + H, { tag: 'button', role: 'button', label: (target.getAttribute('aria-label') || target.innerText).trim() })
    const box = host.querySelector('[data-fb-preview]') as HTMLElement, b = box.getBoundingClientRect()
    const hl = (box.querySelector('[data-fb-hl]') as HTMLElement).getBoundingClientRect()
    const tag = (box.querySelector('[data-fb-hl-tag]') as HTMLElement).getBoundingClientRect()
    const within = (q: DOMRect, o: DOMRect) => q.left >= o.left - 0.5 && q.top >= o.top - 0.5 && q.right <= o.right + 0.5 && q.bottom <= o.bottom + 0.5
    // etiketter: minst tre tegn synlige og innenfor sin boks
    const bad = [...box.querySelectorAll('[data-fb-label]')].filter((l) => {
      const q = l.getBoundingClientRect(), par = (l.parentElement as HTMLElement).getBoundingClientRect()
      return q.width < parseFloat(getComputedStyle(l).fontSize) * 1.2 || q.right > par.right + 0.5 || q.bottom > par.bottom + 1
    }).map((l) => l.textContent)
    const top = document.elementFromPoint(hl.left + hl.width / 2, hl.top + hl.height / 2)
    return { mode: box.dataset.fbPreview, wires: box.querySelectorAll('[data-fb-wire]').length, labels: box.querySelectorAll('[data-fb-label]').length, bad,
      hlOnTop: !!top?.closest('[data-fb-hl]'), tagInside: within(tag, b), fitsHost: b.width <= host.getBoundingClientRect().width + 0.5, ratio: Math.abs(b.width / b.height - W / H) }
  }, withLayout)
  const shot = async (name: string) => { if (process.env.ML_SHOT) await page.locator('[data-fb-preview]').screenshot({ path: `${process.env.ML_SHOT}-${name}-${info.project.name}.png` }) }
  for (const path of ['photo-design', 'loop-studio', 'thumbnail-studio', 'motion-design']) {
    await page.goto('/app/' + path)
    await page.locator('main button').first().waitFor()
    const r = await check(true)
    await shot(path)
    expect(r, path).toMatchObject({ mode: 'layout', bad: [], hlOnTop: true, tagInside: true, fitsHost: true })
    expect(r.wires, path).toBeGreaterThan(5)
    expect(r.ratio, path).toBeLessThan(0.03)
  }
  // sak uten omriss: omtrentlig side med det markerte elementet tegnet i rammen, ikke en tom ramme
  const r = await check(false)
  await shot('uten-omriss')
  expect(r).toMatchObject({ mode: 'fallback', bad: [], hlOnTop: true, tagInside: true, fitsHost: true })
  expect(r.wires).toBeGreaterThan(5)
})
