import { useState } from 'react'
import { TemplateLibrary, TemplateModal } from '../../shared/templates/TemplateLibrary'
import { ThemePicker } from '../../shared/templates/ThemePicker'
import { cleanTheme, paletteOfTheme, themeToParam, type ThemeValue } from '../../shared/templates/theme'
import { readHomeData } from './home-controller'
import { BASE_CFG, DEF_PANELS } from './model'

type KV = { get(k: string): string | null; set(k: string, v: string): boolean | void }
const TK = 'loopstudio.tpltheme'

/** Standardfargene i Loop-malene (aksent og de fem fargepanelene), vist i fargevelgeren og forhåndsvisningen. */
const STD: [string, string, string] = ['#1e3566', '#ffffff', BASE_CFG.accent ?? '#f5b82c']

function readTheme(kv: KV): ThemeValue {
  try {
    return cleanTheme(JSON.parse(kv.get(TK) ?? 'null'))
  } catch {
    return null
  }
}

/** Forhåndsvisning av en Loop-mal i valgt fargetema: panelene, aksentlinjen og tittelen. */
function Preview({ title, theme }: { title: string; theme: ThemeValue }) {
  const P = paletteOfTheme(theme)
  const panels = P ? [P.bg, P.fill, P.bg2, P.acc, P.mid] : DEF_PANELS.map((p) => p.color)
  const acc = P ? P.acc : STD[2]
  const fg = P ? P.fg : '#ffffff'
  return (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', background: P ? P.bg2 : '#0b1322' }} data-loop-tpl-preview="">
      {panels.map((c, i) => <span key={i} style={{ flex: 1, background: c, opacity: 0.85 }} />)}
      <span style={{ position: 'absolute', left: '8%', right: '8%', bottom: '14%', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
        <span style={{ width: 34, height: 4, borderRadius: 2, background: acc }} />
        <span style={{ color: fg, fontWeight: 800, fontSize: 15, textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>{title}</span>
      </span>
    </span>
  )
}

/**
 * Det felles malbiblioteket i Loop Studio: malkortene fra startsiden (egne kategorier beholdes) i samme popup som i
 * Thumbnail Studio, med «Alle maler», søk, sortering og felles fargevelger. Valgt tema følger med til editoren (`tema`),
 * som legger det på aksentfargen og fargepanelene i den nye serien. Standard = malens egne farger.
 */
export function LoopTemplates({ kv, tx, openEditor }: { kv: KV; tx: (s: string) => string; openEditor: (q: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false)
  const [theme, setThemeState] = useState<ThemeValue>(() => readTheme(kv))
  const setTheme = (v: ThemeValue) => {
    setThemeState(v)
    try {
      kv.set(TK, JSON.stringify(v))
    } catch {
      // bare for denne økten
    }
  }
  const data = open ? readHomeData(kv) : null
  const cards = data?.cards ?? []
  const cats = [...new Set(cards.map((c) => c.cat || 'Mal'))]
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0', maxWidth: 1180, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <button type="button" data-loop-tpl-open="" onClick={() => setOpen(true)}
        style={{ minHeight: 40, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 999, background: 'rgba(12,12,12,0.55)', color: '#f3f1ec', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {tx('Alle maler …')}
      </button>
      {open && (
        <TemplateModal title={tx('Maler')} lead={tx('Velg en mal for en ny loop. Velg farger øverst; Standard beholder malens egne farger.')} onClose={() => setOpen(false)}
          head={<ThemePicker value={theme} onChange={setTheme} std={STD} />}>
          <TemplateLibrary items={cards.map((c, i) => ({ id: c.id, name: c.title || tx('Uten navn'), desc: c.desc, cat: c.cat || 'Mal', order: i, base: c.base }))} cats={cats}
            catLabel={(k) => tx(k)} minW={200}
            preview={(x) => <Preview title={x.name} theme={theme} />}
            onPick={(x) => {
              setOpen(false)
              const t = themeToParam(theme)
              openEditor({ mal: x.base, id: x.id, ...(t ? { tema: t } : {}) })
            }} />
        </TemplateModal>
      )}
    </div>
  )
}
