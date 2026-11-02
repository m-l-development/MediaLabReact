import type { Page } from '@playwright/test'

/**
 * Mobil (shared/ui/MobileDock): åpner panelet `key` i ikonlinjen nederst (Legg til, Lag, Rediger …) hvis det ikke
 * allerede er åpent. På PC finnes ingen ikonlinje, og da gjør den ingenting – så de samme testene går på begge.
 */
export async function dock(page: Page, key: string): Promise<void> {
  const tab = page.locator(`[data-dock-tab="${key}"]`)
  if (!(await tab.count())) return
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click()
}
