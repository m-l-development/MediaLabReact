/**
 * Henter looper fra Loop Studio i dagens app (kopi; dagens data endres aldri). Kan kjøres flere ganger: det som
 * allerede er hentet, hoppes over.
 * - Arbeidskopiene per mal og egne serier blir prosjekter; Disk-oppføringene blir looper på Disk.
 * - Bilder, videoer og lyd legges i «Dine medier» (video og lyd bare på denne enheten) og referansene skrives om.
 * - Malkort, personlige grunnoppsett, lydbibliotek og valg (mal, hjelpelinjer) kopieres til den nye appens egne nøkler.
 */
import { readLegacyLoop, type LegacyLoop } from '../../infrastructure/legacy-import/ukeloop'
import type { KV } from './bases'
import type { Cfg, Slide } from './engine/types'
import { isSlide } from './model'
import type { DiskEntry, LoopMediaStore, LoopRepo, WorkData } from './store'

const SRC = 'ukeloop'
const DONE = 'loop.legacy.done'

type Kind = 'img' | 'vid' | 'aud'
class Copier {
  private map = new Map<string, string | null>()
  private L: LegacyLoop
  private media: LoopMediaStore
  constructor(L: LegacyLoop, media: LoopMediaStore) {
    this.L = L
    this.media = media
  }
  /** Ny referanse for en gammel nøkkel (filen kopieres første gang); null når filen mangler. */
  async ref(key: string, kind: Kind, name: string): Promise<string | null> {
    if (this.map.has(key)) return this.map.get(key) ?? null
    let out: string | null = null
    const b = await this.L.media(key)
    if (b?.size) {
      try {
        out = await this.media.put(b, kind, name, { source: SRC, id: key })
      } catch {
        out = null
      }
    }
    this.map.set(key, out)
    return out
  }
  /** Gamle bildenøkler (img-…) og slide-videoer (vid-…) i slides og stil skrives om; andre referanser beholdes. */
  async remap(d: { slides: Slide[]; cfg: Cfg }): Promise<{ slides: Slide[]; cfg: Cfg }> {
    const img = async (v: string | null | undefined, name: string) => (typeof v === 'string' && /^img-/.test(v) && !/^img-[0-9a-f-]{36}$/.test(v) ? ((await this.ref(v, 'img', name)) ?? v) : v)
    const slides: Slide[] = []
    for (const s of d.slides) {
      const n: Slide = { ...s }
      n.bg = (await img(s.bg, 'Bakgrunn')) ?? null
      if (s.bgPort) n.bgPort = (await img(s.bgPort, 'Bakgrunn stående')) ?? null
      if (Array.isArray(s.pips)) {
        const pips = []
        for (const p of s.pips) pips.push(p && typeof p.src === 'string' ? { ...p, src: (await img(p.src, 'Bilde')) ?? p.src } : p)
        n.pips = pips
      }
      if (typeof s.vid === 'string' && /^vid-/.test(s.vid) && !/^vid-[0-9a-f-]{36}$/.test(s.vid)) n.vid = (await this.ref(s.vid, 'vid', s.vidName || 'video')) ?? s.vid
      slides.push(n)
    }
    const cfg: Cfg = { ...d.cfg }
    if (cfg.logoSrc) cfg.logoSrc = (await img(cfg.logoSrc, 'Logo')) ?? null
    if (Array.isArray(cfg.imgRules)) {
      const rules = []
      for (const r of cfg.imgRules) rules.push(r ? { ...r, bg: (await img(r.bg, r.kw || 'Fast bilde')) ?? null, bgPort: (await img(r.bgPort, (r.kw || 'Fast bilde') + ' stående')) ?? null } : r)
      cfg.imgRules = rules
    }
    return { slides, cfg }
  }
}

const parse = <T>(raw: string | null): T | null => {
  try {
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
const tplOfSlot = (slot: string) => (slot === 'ukeloop.v2' ? 'week' : slot === 'ukeloop.v5.youth' ? 'youth' : slot.startsWith('ukeloop.v2.') ? slot.slice(11) : null)

/** Bare én henting om gangen (StrictMode og raske åpninger kan starte den to ganger samtidig). */
const running = new Map<string, Promise<{ added: number }>>()
export function importLegacyLoop(userId: string | null, media: LoopMediaStore, repo: LoopRepo, kv: KV): Promise<{ added: number }> {
  const key = userId ?? 'local'
  const hit = running.get(key)
  if (hit) return hit
  const p = run(userId, media, repo, kv).finally(() => running.delete(key))
  running.set(key, p)
  return p
}

async function run(userId: string | null, media: LoopMediaStore, repo: LoopRepo, kv: KV): Promise<{ added: number }> {
  const L = await readLegacyLoop(userId)
  if (!L) return { added: 0 }
  const C = new Copier(L, media)
  let added = 0
  try {
    /* arbeidskopiene (ukeloop.v2 …, ukeloop.custom.<id>) */
    const lastTpl = L.get('ukeloop.tpl') || 'week'
    /* egne serier: malen står i Disk-listen eller på malkortet (videoen lå under video.<mal>) */
    const diskRaw = parse<{ id?: string; base?: string }[]>(L.get('loopstudio.disk.v1')) ?? []
    const cards = parse<{ cards?: { id?: string; base?: string }[] }>(L.get('loopstudio.tpls.v1'))?.cards ?? []
    const baseOf = (id: string) => [...(Array.isArray(diskRaw) ? diskRaw : []), ...(Array.isArray(cards) ? cards : [])].find((x) => x?.id === id)?.base
    for (const [slot, raw] of L.slots) {
      if (repo.hasLegacy(SRC, slot) || repo.hasWork(slot)) continue
      const d = parse<Partial<WorkData>>(raw)
      if (!d || !Array.isArray(d.slides)) continue
      const slides = d.slides.filter(isSlide)
      const mapped = await C.remap({ slides, cfg: d.cfg && typeof d.cfg === 'object' ? d.cfg : {} })
      const tpl = tplOfSlot(slot) ?? baseOf(slot.slice(15)) ?? lastTpl
      const out: WorkData = { programText: String(d.programText ?? ''), ...mapped, videoName: '', audioName: '', video: null, audio: null }
      /* bakgrunnsvideoen lå per mal (video / video.<mal>), lydsporet var felles (audio) */
      if (d.videoName) {
        const v = await C.ref(tpl === 'week' ? 'video' : 'video.' + tpl, 'vid', d.videoName)
        if (v) { out.video = v; out.videoName = d.videoName }
      }
      if (d.audioName) {
        const a = await C.ref('audio', 'aud', d.audioName)
        if (a) { out.audio = a; out.audioName = d.audioName }
      }
      await repo.saveWork(slot, out, slot.startsWith('ukeloop.custom.') ? 'Loop' : 'Loop – ' + tpl, { source: SRC, id: slot })
      if (slides.length) added++
    }
    /* Disk */
    const disk = parse<Partial<DiskEntry>[]>(L.get('loopstudio.disk.v1'))
    if (Array.isArray(disk)) {
      const cur = repo.diskList(), next = [...cur]
      const fresh: string[] = []
      for (const e of disk) {
        if (!e || typeof e.id !== 'string' || !/^d-[a-z0-9]{4,16}$/.test(e.id) || !e.data || !Array.isArray(e.data.slides)) continue
        if (cur.some((x) => x.id === e.id) || repo.hasLegacy(SRC + '-disk', e.id)) continue
        const mapped = await C.remap({ slides: e.data.slides.filter(isSlide), cfg: e.data.cfg && typeof e.data.cfg === 'object' ? e.data.cfg : {} })
        next.push({ id: e.id, name: String(e.name || 'Uten navn').slice(0, 60), base: String(e.base || 'blank'), savedAt: Number(e.savedAt) || Date.now(), fav: !!e.fav, count: Number(e.count) || mapped.slides.filter((x) => !x.hidden).length, data: { programText: String(e.data.programText ?? ''), ...mapped } })
        fresh.push(e.id)
      }
      if (fresh.length) {
        await repo.setDisk(next, (id) => (fresh.includes(id) ? { source: SRC + '-disk', id } : undefined))
        added += fresh.length
      }
    }
    /* små innstillinger kopieres én gang (den nye appen har egne nøkler) */
    if (!kv.get(DONE)) {
      for (const k of ['loopstudio.tpls.v1', 'ukeloop.tpl', 'ukeloop.guide', 'ukeloop.guideFlip', 'medialab.units']) {
        const v = L.get(k)
        if (v != null && kv.get(k) == null) kv.set(k, v)
      }
      const bases = parse<{ id: string; data?: { slides?: Slide[]; cfg?: Cfg } }[]>(L.get('loopstudio.bases.v1'))
      if (Array.isArray(bases) && kv.get('loopstudio.bases.v1') == null) {
        const out = []
        for (const b of bases) {
          if (!b?.data || !Array.isArray(b.data.slides)) continue
          out.push({ ...b, data: { ...b.data, ...(await C.remap({ slides: b.data.slides.filter(isSlide), cfg: b.data.cfg ?? {} })) } })
        }
        kv.set('loopstudio.bases.v1', JSON.stringify(out))
      }
      const lib = parse<{ id: string; name: string; size: number; dur: number; at: number }[]>(L.get('ukeloop.audiolib.v1'))
      if (Array.isArray(lib) && kv.get('ukeloop.audiolib.v1') == null) {
        const out = []
        for (const t of lib) {
          if (!t || typeof t.id !== 'string') continue
          const r = await C.ref('lib:' + t.id, 'aud', t.name || 'lyd')
          if (r) out.push({ ...t, id: r })
        }
        kv.set('ukeloop.audiolib.v1', JSON.stringify(out))
      }
      kv.set(DONE, '1')
    }
  } finally {
    L.close()
  }
  await repo.flush()
  return { added }
}
