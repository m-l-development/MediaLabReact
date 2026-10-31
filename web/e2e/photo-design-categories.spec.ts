import { expect, test, type Page } from '@playwright/test'

/**
 * TB-8E2793: kategorier i Photo Design. Lage og velge kategori (tomt navn og duplikat uansett store/små bokstaver
 * håndteres), lagre mal i valgt kategori, gi prosjekter kategori i editoren og fra prosjektkortet, filtrere
 * «Mine prosjekter», nye prosjekter i valgt kategori, tom kategori, og at alt står etter ny innlasting og gjenåpning.
 */
test.beforeEach(() => test.skip(test.info().project.name === 'mobil', 'kategoriene testes på PC'))

/** Svarene på nettleserens spørsmål (navn), i rekkefølge; bekreftelser uten svar i køen godtas. */
const queue: string[] = []
const answer = (_page: Page, text: string) => void queue.push(text)
const chip = (page: Page, cat: string) => page.locator(`[data-pd-projects] [data-pd-projcat="${cat}"]`)
const projects = (page: Page) => page.locator('[data-pd-projects] [data-project]')

async function newProject(page: Page, name: string) {
  await page.locator('[data-tpl="photo"]').click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.getByLabel('Prosjektnavn').fill(name)
}
async function saveAndHome(page: Page) {
  await page.getByRole('button', { name: 'Lagre', exact: true }).click()
  await expect(page.getByText(/^Lagret/).first()).toBeVisible()
  await page.getByRole('button', { name: /Prosjekter/ }).first().click()
  await expect(page.locator('[data-tpl="photo"]')).toBeVisible()
}

test('kategorier: lage, velge, duplikat og tomt navn, mal og prosjekt i kategori, filter, flytt, lagring', async ({ page }) => {
  test.slow()
  const errors: string[] = []
  queue.length = 0
  page.on('dialog', (d) => void (d.type() === 'prompt' ? d.accept(queue.shift() ?? '') : d.accept()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/photo-design')

  // prosjekt 1 i editoren: ny kategori «Ungdom» under Stil, prosjektet legges i den
  await newProject(page, 'Plakat A')
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  answer(page, '  Ungdom  ')
  await page.getByRole('button', { name: 'Ny kategori for prosjektet' }).click()
  await expect(page.locator('[data-pd-doc-cat]')).toHaveValue('Ungdom')
  // duplikat (andre bokstaver) og tomt navn: ingen ny kategori
  answer(page, 'UNGDOM')
  await page.getByRole('button', { name: 'Ny kategori for prosjektet' }).click()
  await expect(page.getByText('Kategorien «Ungdom» finnes allerede og er valgt.')).toBeVisible()
  answer(page, '   ')
  await page.getByRole('button', { name: 'Ny kategori for prosjektet' }).click()
  await expect(page.getByText('Skriv et navn på kategorien.')).toBeVisible()
  // navn med «s» og flere mellomrom: mellomrommene slås sammen, bokstavene beholdes
  answer(page, 'Søndags   skole ')
  await page.getByRole('button', { name: 'Ny kategori for prosjektet' }).click()
  await expect(page.locator('[data-pd-doc-cat]')).toHaveValue('Søndags skole')
  await page.locator('[data-pd-doc-cat]').selectOption('Ungdom')
  const opts = await page.locator('[data-pd-doc-cat] option').allTextContents()
  expect(opts.filter((o) => o.toLowerCase() === 'ungdom')).toHaveLength(1)
  // malen lagres i valgt malkategori (Ungdom)
  await page.getByLabel('Kategori', { exact: true }).selectOption('Ungdom')
  answer(page, 'Ungdomsplakat')
  await page.getByRole('button', { name: 'Lagre som mal' }).click()
  await expect(page.getByText('Malen er lagret.')).toBeVisible()
  await saveAndHome(page)

  // prosjekt 2 uten kategori
  await newProject(page, 'Plakat B')
  await saveAndHome(page)

  // startsiden: malen ligger under Ungdom; prosjektene filtreres per kategori
  await page.getByRole('button', { name: 'Ungdom · 1', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Ungdomsplakat' })).toBeVisible()
  await expect(chip(page, '*')).toContainText('2')
  await chip(page, 'Ungdom').click()
  await expect(projects(page)).toHaveCount(1)
  await expect(projects(page).first()).toHaveAttribute('data-project', 'Plakat A')
  await chip(page, '').click()
  await expect(projects(page)).toHaveCount(1)
  await expect(projects(page).first()).toHaveAttribute('data-project', 'Plakat B')

  // ny, tom kategori fra startsiden: valgt, tom melding
  answer(page, 'Kor')
  await page.locator('[data-pd-projcat-new]').click()
  await expect(chip(page, 'Kor')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-pd-projcat-empty]')).toBeVisible()
  await expect(projects(page)).toHaveCount(0)
  // nytt prosjekt mens «Kor» er valgt: havner i Kor
  await expect(page.getByText('Nye prosjekter lagres i «Kor».')).toBeVisible()
  await newProject(page, 'Plakat C')
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await expect(page.locator('[data-pd-doc-cat]')).toHaveValue('Kor')
  await saveAndHome(page)
  await expect(projects(page)).toHaveCount(1)
  await expect(projects(page).first()).toHaveAttribute('data-project', 'Plakat C')

  // flytt Plakat B (uten kategori) til Kor fra kortet
  await chip(page, '*').click()
  await page.locator('[data-project="Plakat B"] [data-pd-proj-cat]').selectOption('Kor')
  await expect(page.getByText('Prosjektet ligger nå i «Kor».')).toBeVisible()
  await chip(page, 'Kor').click()
  await expect(projects(page)).toHaveCount(2)

  // ny innlasting: kategorier, filter og plassering står; gjenåpnet prosjekt har sin kategori
  await page.reload()
  await expect(chip(page, 'Kor')).toHaveAttribute('aria-pressed', 'true')
  await expect(projects(page)).toHaveCount(2)
  await chip(page, 'Ungdom').click()
  await expect(projects(page)).toHaveCount(1)
  await projects(page).first().getByRole('button', { name: 'Plakat A' }).click()
  await expect(page.locator('[data-pd-view="edit"]')).toBeVisible()
  await page.getByRole('button', { name: 'Stil', exact: true }).click()
  await expect(page.locator('[data-pd-doc-cat]')).toHaveValue('Ungdom')
  expect(errors).toEqual([])
})
