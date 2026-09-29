// Funksjonstester for forsiden. Kjøres mot både originalen (.dc.html) og React-versjonen, som skal oppføre seg likt.
import { test, expect } from '@playwright/test';

const VARIANTS = [
  { name: 'original', url: '/media-lab.dc.html' },
  { name: 'react', url: '/' },
];
const card = (page, title) => page.locator('a, button').filter({ hasText: title }).first();

for (const V of VARIANTS) {
  test.describe(V.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear(); } });
    });

    test('mapper: SoMe/Tools, Tilbake og nettleserens tilbake-knapp', async ({ page }) => {
      await page.goto(V.url);
      await expect(card(page, 'Loop Studio')).toBeVisible();
      await card(page, 'SoMe').click();
      await expect(page).toHaveURL(/#some$/);
      await expect(page.locator('a[href="motion-design.dc.html"], a[data-ml-href="motion-design.dc.html"]')).toBeVisible();
      await expect(page.locator('a[href="photo-design.dc.html"], a[data-ml-href="photo-design.dc.html"]')).toBeVisible();
      await expect(card(page, 'Loop Studio')).toHaveCount(0);
      await page.getByRole('button', { name: 'Tilbake' }).click();
      await expect(card(page, 'Loop Studio')).toBeVisible();
      await expect(page).not.toHaveURL(/#/);
      await card(page, 'Tools').click();
      await expect(page).toHaveURL(/#tools$/);
      await expect(page.getByText('Isolate Subject')).toBeVisible();
      await expect(page.getByText('Mockups', { exact: true })).toBeVisible();
      await page.goBack();
      await expect(card(page, 'Loop Studio')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('Isolate Subject')).toBeVisible();
    });

    test('språk NO/EN lagres og oversetter', async ({ page }) => {
      await page.goto(V.url);
      await expect(page.getByText('Åpne').first()).toBeVisible();
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByText('Åpne')).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('medialab.lang'))).toBe('en');
      await card(page, 'SoMe').click();
      await expect(page.getByText('Åpne')).toHaveCount(0);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await page.getByRole('button', { name: 'NO', exact: true }).click();
      await expect(page.getByText('Åpne').first()).toBeVisible();
    });

    test('lys/mørk lagres', async ({ page }) => {
      await page.goto(V.url);
      const root = page.locator('[data-ml-theme]');
      await expect(root).toHaveAttribute('data-ml-theme', 'dark');
      await page.getByRole('button', { name: 'Bytt til lys modus' }).click();
      await expect(root).toHaveAttribute('data-ml-theme', 'light');
      expect(await page.evaluate(() => [localStorage.getItem('medialab.theme'), getComputedStyle(document.body).backgroundColor])).toEqual(['light', 'rgb(228, 225, 218)']);
      await page.reload();
      await expect(root).toHaveAttribute('data-ml-theme', 'light');
      await page.getByRole('button', { name: 'Bytt til mørk modus' }).click();
      await expect(root).toHaveAttribute('data-ml-theme', 'dark');
    });

    test('lenker, hover og admin', async ({ page }) => {
      await page.goto(V.url);
      const loop = card(page, 'Loop Studio');
      const before = await loop.evaluate(e => getComputedStyle(e).borderColor);
      await loop.hover();
      await expect(loop).toHaveAttribute('data-ml-href', 'loop-studio.dc.html');
      await expect.poll(() => loop.evaluate(e => getComputedStyle(e).borderColor)).not.toBe(before);
      await expect(page.locator('[aria-label="Admin"]')).toHaveCount(1);
      await loop.click();
      await expect(page).toHaveURL(/\/loop-studio\.dc\.html$/);
    });
  });
}
