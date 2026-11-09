/**
 * Visninger i appene som ikke har egen nettadresse (redigering i Photo Design, Motion Design, Thumbnail Studio og Loop
 * Studio). Brukes to steder:
 * - ved innsending: hvilken visning brukeren var i (`marked.ui`, noen få byte), se app/Feedback.tsx
 * - i innboksen: forhåndsvisningen åpner samme visning i den ekte appen ved å trykke de samme knappene (LivePreview.tsx)
 * detect = finnes bare i visningen; url = tillegg til adressen; steps = knapper som trykkes, i rekkefølge.
 */
export interface ViewDef { id: string; detect: string; url?: string; steps: string[] }

const LOOP_EDIT: ViewDef = { id: 'edit', detect: '[data-loop-canvas]', url: '?mal=week&demo=1', steps: [] }
export const VIEWS: Record<string, ViewDef[]> = {
  'photo-design': [{ id: 'edit', detect: '[data-pd-view="edit"]', steps: ['[data-tpl="photo"]'] }],
  'motion-design': [{ id: 'edit', detect: '[data-md-canvas]', steps: ['[data-md-new]', '[data-format="wide"]', '[data-tpl="blank"]'] }],
  'thumbnail-studio': [{ id: 'edit', detect: '[data-ts-canvas]', url: '?cat=sunday', steps: ['[data-ts-new]', '[data-layout="base:main"]'] }],
  'loop-studio': [LOOP_EDIT],
  'loop-editor': [LOOP_EDIT],
}

/** Visningen brukeren er i nå (undefined = startvisningen eller en app uten egne visninger). */
export function currentView(app: string, root: ParentNode = document): string | undefined {
  return VIEWS[app]?.find((v) => root.querySelector(v.detect))?.id
}

/** Adressen i den nye appen for en applikasjon (også saker fra de gamle .dc.html-sidene). */
export function appPath(app: string | null | undefined, page: string | null | undefined): string | null {
  const p = String(page ?? '')
  if (p.startsWith('/app/')) return p.replace(/:id/g, '').split(/[?#]/)[0] ?? null
  const map: Record<string, string> = { 'media-lab': '/app/', 'media-library': '/app/medier', 'connecthub-admin': '/app/admin', 'loop-editor': '/app/loop-studio' }
  if (!app) return null
  if (map[app]) return map[app] as string
  return /^(photo-design|motion-design|thumbnail-studio|loop-studio|isolate-subject|mockups)$/.test(app) ? '/app/' + app : null
}
