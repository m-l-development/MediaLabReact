import { expect, test, type Page } from '@playwright/test'

/**
 * TB-2CD75B (forts.): flytting innen samme dag, flytting av en dagslide forbi en annen dag (dagen følger sliden), og
 * dra-og-slipp med fingeren på mobil (hold på kortet, dra, slipp). Rekkefølgen er lagret etter ny innlasting.
 */
const PROGRAM = 'Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen'
/** Kortene som «dag · tittel», f.eks. «MANDAG · BØNN». */
const cards = (page: Page) => page.locator('[data-loop-card]').evaluateAll((els) => els.map((e) => {
  const t = (e.textContent ?? '').replace(/\s+/g, ' ').toUpperCase()
  const day = /MANDAG|TIRSDAG|ONSDAG/.exec(t)?.[0] ?? '?'
  const title = /BØNN|LOVSANG|UNGDOM|KOR/.exec(t)?.[0] ?? '?'
  return `${day} · ${title}`
}))

async function setup(page: Page) {
  await page.goto('/app/loop-studio?mal=week')
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  // mobil: panelene ligger under «Rediger», slidene under «Forhåndsvis»
  const mobile = await page.getByRole('button', { name: 'Rediger', exact: true }).isVisible()
  if (mobile) await page.getByRole('button', { name: 'Rediger', exact: true }).click()
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByPlaceholder(PROGRAM).fill('Mandag kl 19 Bønn\nMandag kl 21 Lovsang\nTirsdag kl 18 Ungdom\nOnsdag kl 20 Kor')
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  if (mobile) await page.getByRole('button', { name: 'Forhåndsvis', exact: true }).click()
  await expect(page.locator('[data-loop-card]')).toHaveCount(4)
  await page.waitForTimeout(900)
  expect(await cards(page)).toEqual(['MANDAG · BØNN', 'MANDAG · LOVSANG', 'TIRSDAG · UNGDOM', 'ONSDAG · KOR'])
}

/** Musdra av kort `from` til venstre halvdel av kort `to` (innsetting foran det). */
async function mouseDrag(page: Page, from: number, to: number) {
  const c = page.locator('[data-loop-card]')
  const t = (await c.nth(to).boundingBox())!
  await c.nth(from).hover()
  await page.mouse.down()
  await page.mouse.move(t.x + 20, t.y + 40, { steps: 8 })
  await expect(page.locator('[data-loop-drop]')).toHaveCount(1)
  await page.mouse.up()
}

test('samme dag og mellom dager: dagen følger sliden, de andre beholder sin dag, lagret etter innlasting', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'musdra testes på PC')
  await setup(page)
  // innen samme dag: Lovsang foran Bønn
  await mouseDrag(page, 1, 0)
  await expect.poll(() => cards(page)).toEqual(['MANDAG · LOVSANG', 'MANDAG · BØNN', 'TIRSDAG · UNGDOM', 'ONSDAG · KOR'])
  // mellom dager: Bønn (mandag) foran Kor (onsdag) – den er fortsatt mandag, tirsdag og onsdag er uendret
  await page.waitForTimeout(900)
  await mouseDrag(page, 1, 3)
  await expect.poll(() => cards(page)).toEqual(['MANDAG · LOVSANG', 'TIRSDAG · UNGDOM', 'MANDAG · BØNN', 'ONSDAG · KOR'])
  // «Oppdater videoen» og ny innlasting: rekkefølgen og dagene står
  await page.getByRole('button', { name: 'Program', exact: true }).click()
  await page.getByRole('button', { name: 'Oppdater videoen' }).click()
  await page.waitForTimeout(3000)
  await page.reload()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => cards(page)).toEqual(['MANDAG · LOVSANG', 'TIRSDAG · UNGDOM', 'MANDAG · BØNN', 'ONSDAG · KOR'])
})

test('mobil: hold og dra med fingeren flytter sliden; kort trykk velger bare', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'berøring testes på mobil (Chrome)')
  await setup(page)
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  const c = page.locator('[data-loop-card]')
  await c.nth(3).scrollIntoViewIfNeeded()
  // kort trykk: ingen flytting
  const a = (await c.nth(3).boundingBox())!
  await touch('touchStart', a.x + 40, a.y + 30)
  await touch('touchEnd', 0, 0)
  await page.waitForTimeout(500)
  expect(await cards(page)).toEqual(['MANDAG · BØNN', 'MANDAG · LOVSANG', 'TIRSDAG · UNGDOM', 'ONSDAG · KOR'])

  // hold på Kor (onsdag) og dra den foran Ungdom (tirsdag)
  await c.nth(2).scrollIntoViewIfNeeded()
  const from = (await c.nth(3).boundingBox())!
  const to = (await c.nth(2).boundingBox())!
  const sx = from.x + 30, sy = from.y + 30
  await touch('touchStart', sx, sy)
  await page.waitForTimeout(500)
  await expect(page.locator('[data-loop-drop]')).toHaveCount(1)
  for (let i = 1; i <= 8; i++) await touch('touchMove', sx + ((to.x + 10 - sx) * i) / 8, sy)
  await expect(page.locator('[data-loop-drop]')).toHaveCount(1)
  await touch('touchEnd', 0, 0)
  await expect.poll(() => cards(page)).toEqual(['MANDAG · BØNN', 'MANDAG · LOVSANG', 'ONSDAG · KOR', 'TIRSDAG · UNGDOM'])
  await expect(page.locator('[data-loop-drop]')).toHaveCount(0)
  // lagret etter ny innlasting
  await page.waitForTimeout(3000)
  await page.reload()
  await expect(page.locator('[data-loop-canvas]')).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => cards(page)).toEqual(['MANDAG · BØNN', 'MANDAG · LOVSANG', 'ONSDAG · KOR', 'TIRSDAG · UNGDOM'])
})
