import AppFontPicker from '../../components/fontpicker/AppFontPicker'
import type { FontEntry } from '../../components/fontpicker/FontPicker.jsx'
import type { TextStyle } from '../../components/fontpicker/TextStyle.jsx'

export interface LoopFontPop {
  font: string
  title: TextStyle
  kicker: TextStyle
  onTitle: (ts: TextStyle) => void
  onKicker: (ts: TextStyle) => void
  onPreview: (f: FontEntry | null) => void
}

/**
 * Loop Studio: fontpopupen for overskriften og for kickeren. Fonten er felles for hele loopen (som før); stilen
 * (størrelse, avstand, former, effekter …) lagres hver for seg (cfg.ts.title / cfg.ts.kicker).
 */
export function LoopFontPicker({ pop, onFont }: { pop: LoopFontPop | undefined; onFont: (f: string) => void }) {
  if (!pop) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div data-fontpop="title">
        <AppFontPicker font={pop.font} onFont={(p) => onFont(p.font)} onPreview={pop.onPreview} text="Overskrift"
          textStyle={pop.title} onTextStyleChange={pop.onTitle} color="#ffffff" baseSize={144} label="Font – overskrift" />
      </div>
      <div data-fontpop="kicker">
        <AppFontPicker font={pop.font} onFont={(p) => onFont(p.font)} onPreview={pop.onPreview} text="KICKER"
          textStyle={pop.kicker} onTextStyleChange={pop.onKicker} color="#ffffff" baseSize={24} label="Font – kicker" />
      </div>
    </div>
  )
}
