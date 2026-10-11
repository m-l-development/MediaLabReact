import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRESETS, TRSTD } from './controller'
import { ANIMS, BLENDS, FORMATS, LOOKS, OVANIMS, TEMPLATES, TRANS } from './engine/model'
import { WHISPER_MODELS } from './engine/transcribe'
import { EN, tr } from './texts'

const DIR = path.resolve(__dirname)
const FILES = ['controller.ts', 'fields.ts', 'Home.tsx', 'Editor.tsx', 'Panels.tsx', 'Props.tsx', 'Timeline.tsx', 'MotionDesign.tsx', 'files.ts', 'transfer.ts', 'engine/export.ts', 'engine/transcribe.ts', 'engine/packfile.ts']

/** Tekster som sendes til oversettelse: tx('…'), flash('…'), { p: '…' }, feltbyggerne og menyene. */
const CALLS = /\b(?:tx|flash|confirm|head|note|range|color|select|toggle|seg|num|area|act|mi|t)\(\s*'((?:[^'\\]|\\.)+)'|\b(?:p|l|d|title|label): '((?:[^'\\]|\\.)+)'|Error\('((?:[^'\\]|\\.)+)'\)|onProgress\((?:\d+, |pct, )?'((?:[^'\\]|\\.)+)'/g

describe('engelske tekster', () => {
  it('alle tekster i grensesnittet har engelsk oversettelse', () => {
    const missing = new Set<string>()
    let checked = 0
    for (const f of FILES) {
      const src = fs.readFileSync(path.join(DIR, f), 'utf8')
      for (const m of src.matchAll(CALLS)) {
        const s = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').replace(/\\'/g, "'")
        if (!/[a-zæøåA-ZÆØÅ]{2}/.test(s) || /^[a-z][a-zA-Z0-9-]*$/.test(s) || /^(Ctrl\+|Delete|abort|canvas|bad)/.test(s)) continue
        checked++
        if (!(s in EN)) missing.add(`${f}: ${s}`)
      }
    }
    // Mønsteret må faktisk finne tekstene (ellers ville testen bestått uten å sjekke noe)
    expect(checked).toBeGreaterThan(350)
    const lists = [...TRANS, ...ANIMS, ...LOOKS, ...BLENDS, ...OVANIMS].map((x) => x[1])
    for (const s of [...lists, ...FORMATS.map((f) => f.name), ...TEMPLATES.flatMap((t) => [t.name, t.desc]), ...TRSTD.map((x) => x[1]), ...PRESETS.flatMap((p) => [p.l, p.d]), ...WHISPER_MODELS.flatMap((w) => [w[1], w[2]])]) {
      if (!(s in EN)) missing.add(s)
    }
    expect([...missing]).toEqual([])
  })

  it('variabler og ukjente tekster', () => {
    expect(tr('en', '{n} valgt', { n: 3 })).toBe('3 selected')
    expect(tr('no', '{n} valgt', { n: 3 })).toBe('3 valgt')
    expect(tr('en', 'Ukjent melding fra motoren')).toBe('Ukjent melding fra motoren')
  })
})
