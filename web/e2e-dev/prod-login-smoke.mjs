// BARE LESING: kontroll av produksjonens offentlige innloggingsside etter publisering av Menighetsbrukeren.
// Laster bare /login (ingen innlogging, ingen kall som skriver). Bruk: node e2e-dev/prod-login-smoke.mjs [adresse]
import { chromium } from '@playwright/test'

const BASE = process.argv[2] || 'https://media-lab-react-vyef.vercel.app'
const browser = await chromium.launch()
const out = []
try {
  for (const [name, viewport] of [['PC', { width: 1280, height: 800 }], ['mobil', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    const r = await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await page.locator('[data-ch-kind], input[type=email]').first().waitFor({ timeout: 20000 }).catch(() => undefined)
    const kinds = await page.locator('[data-ch-kind]').count()
    let user = false, button = false, noEmail = false, email = false
    if (kinds === 2) {
      await page.locator('[data-ch-kind="parish"]').click()
      user = await page.locator('[data-ch-parish-username]').isVisible()
      button = await page.getByRole('button', { name: 'Logg inn som menighetsbruker' }).isVisible()
      noEmail = (await page.getByLabel('E-post').count()) === 0
      await page.locator('[data-ch-kind="personal"]').click()
      email = await page.getByLabel('E-post').isVisible()
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    out.push({ name, status: r?.status(), kinds, parishForm: user && button && noEmail, personalForm: email, overflow })
    await ctx.close()
  }
} finally {
  await browser.close()
}
for (const o of out) console.log(JSON.stringify(o))
const ok = out.every((o) => o.status === 200 && o.kinds === 2 && o.parishForm && o.personalForm && o.overflow <= 1)
console.log(ok ? 'PROD /login: OK' : 'PROD /login: FEIL')
process.exitCode = ok ? 0 : 1
