'use no memo'
/**
 * Panorama (Photo Design): kildebildene settes sammen automatisk (engine/pano), og alt kan justeres med forhåndsvisning:
 * projeksjon, synsvinkel, horisont, rotasjon, søm, eksponering, beskjæring (automatisk, hele eller egen – dra i rammen)
 * og hvert bilde for seg (dra bildet i forhåndsvisningen eller bruk glidebryterne; ta bilder ut og inn).
 * «Bruk» lager panoramaet i full oppløsning som et bildelag med oppskriften, så det kan redigeres igjen senere.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import type { PhotoController, PState } from './controller'
import { baseOf, canvasFits, mk } from './engine/render'
import { PanoClient } from './engine/pano/client'
import { outline, placeCams, PANO_DEFAULT, type Analysis, type Img, type PanoParams, type Rendered } from './engine/pano/stitch'
import type { PanoRecipe } from './engine/model'
import { isIOS } from '../../shared/platform/ios'
import { Range } from './Ui'
import type { Phrase, Tx } from './texts'
import s from './PhotoDesign.module.css'

const R2D = 180 / Math.PI
const AN_MAX = 1100
const PV_MAX = 1500

function imgOf(c: HTMLCanvasElement): Img {
  const g = c.getContext('2d', { willReadFrequently: true })!
  const d = g.getImageData(0, 0, c.width, c.height)
  return { w: c.width, h: c.height, data: d.data }
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

type Busy = { stage: string; k: number } | null
const STAGE: Record<string, Phrase> = { load: 'Leser bildene …', features: 'Finner kjennetegn i bildene …', match: 'Finner overlapp mellom bildene …', fov: 'Beregner synsvinkelen …', align: 'Retter inn bildene …', gain: 'Utjevner eksponeringen …', render: 'Setter sammen i full oppløsning …', save: 'Lagrer panoramaet …' }

export function PanoDialog({ c, S, tx }: { c: PhotoController; S: PState; tx: Tx }) {
  const P = S.pano!
  const client = useMemo(() => new PanoClient(), [])
  useEffect(() => () => client.dispose(), [client])
  const rec = P.recipe
  const [an, setAn] = useState<Analysis | null>(rec && sameList(rec.srcs, P.srcs) ? rec.an : null)
  const [p, setP] = useState<PanoParams>(rec?.p ?? { ...PANO_DEFAULT })
  const [scale, setScale] = useState(rec?.scale ?? 1)
  const [busy, setBusy] = useState<Busy>(null)
  const [err, setErr] = useState<Phrase | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [editCrop, setEditCrop] = useState(false)
  const [pv, setPv] = useState<Rendered | null>(null)
  const [imgs, setImgs] = useState<{ key: string; an: Img[]; pv: Img[]; full: { w: number; h: number }[] } | null>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const pvSeq = useRef(0)
  const key = P.srcs.join('|')

  // kildebildene: analysestørrelse og forhåndsvisningsstørrelse
  useEffect(() => {
    let live = true
    if (P.srcs.length < 2) return
    void (async () => {
      setBusy({ stage: 'load', k: 0 })
      const A: Img[] = [], V: Img[] = [], F: { w: number; h: number }[] = []
      for (let i = 0; i < P.srcs.length; i++) {
        const E = await c.panoMedia(P.srcs[i]!)
        if (!live) return
        if (!E) { setErr('Et av bildene kunne ikke leses.'); setBusy(null); return }
        A.push(imgOf(baseOf(E, AN_MAX)))
        V.push(imgOf(baseOf(E, PV_MAX)))
        F.push({ w: E.w, h: E.h })
        setBusy({ stage: 'load', k: (i + 1) / P.srcs.length })
      }
      if (!live) return
      client.drop('pv:' + key)
      setImgs({ key, an: A, pv: V, full: F })
      setBusy(null)
    })()
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // analyse (når bildene er klare og ingen gyldig analyse finnes)
  useEffect(() => {
    if (!imgs || imgs.key !== key || (an && an.cams.length === P.srcs.length)) return
    let live = true
    void (async () => {
      setErr(null)
      setBusy({ stage: 'features', k: 0 })
      const hint = await Promise.all(P.srcs.map((x) => c.panoFov(x)))
      try {
        const res = await client.analyze(imgs.an, hint.every((h) => h) ? hint : [], (stage, k) => live && setBusy({ stage, k }))
        if (!live) return
        const placed = res.cams.filter(Boolean).length
        if (placed < 2) setErr('Fant for lite overlapp mellom bildene. Ta bildene fra samme sted, med omtrent en tredjedel overlapp.')
        setAn(res)
        setP((q) => ({ ...q, off: [], use: [] }))
      } catch {
        if (live) setErr('Panoramaet kunne ikke settes sammen.')
      }
      if (live) setBusy(null)
    })()
    return () => { live = false }
  }, [imgs, an]) // eslint-disable-line react-hooks/exhaustive-deps

  // forhåndsvisning (den siste endringen vinner)
  const pvP = useMemo<PanoParams>(() => (editCrop ? { ...p, crop: 'none' } : p), [p, editCrop])
  useEffect(() => {
    if (!imgs || !an || an.cams.length !== imgs.pv.length) return
    const id = ++pvSeq.current
    const t = setTimeout(() => {
      void client.render('pv:' + imgs.key, imgs.pv, an, pvP, { maxW: PV_MAX, maxH: 900 }).then((r) => {
        if (id !== pvSeq.current) return
        setPv(r)
        const el = cv.current
        if (!el) return
        el.width = r.w
        el.height = r.h
        el.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0)
      }, () => undefined)
    }, 40)
    return () => clearTimeout(t)
  }, [imgs, an, pvP, client])

  const placedN = an ? an.cams.filter(Boolean).length : 0
  const lost = an ? an.cams.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0) : []
  const setOff = (i: number, o: Partial<{ yaw: number; pitch: number; roll: number }>) =>
    setP((q) => {
      const off = [...q.off]
      for (let k = off.length; k <= i; k++) off[k] = off[k] ?? { yaw: 0, pitch: 0, roll: 0 }
      off[i] = { ...off[i]!, ...o }
      return { ...q, off }
    })
  const offOf = (i: number) => p.off[i] ?? { yaw: 0, pitch: 0, roll: 0 }

  // omrisset av det valgte bildet i forhåndsvisningen
  const sel0 = sel !== null && imgs && an && pv ? sel : null
  const selPath = useMemo(() => {
    if (sel0 === null || !imgs || !an || !pv) return ''
    const cams = placeCams(an, pvP, imgs.pv.map((x) => ({ w: x.w, h: x.h })))
    const cam = cams[sel0]
    if (!cam) return ''
    const pts = outline(pvP.proj, cam, 30).map(([u, v]) => [(u - pv.u0) * pv.s, (v - pv.v0) * pv.s] as const)
    return pts.length ? 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z' : ''
  }, [sel0, imgs, an, pv, pvP])

  // dra: valgt bilde flyttes (gir/vipp), ellers hele panoramaet; i «Egen beskjæring» flyttes rammen eller hjørnene
  const drag = useRef<{ x: number; y: number; mode: string; start: PanoParams } | null>(null)
  const toPx = (e: RPE) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect()
    return pv ? [((e.clientX - r.left) / r.width) * pv.w, ((e.clientY - r.top) / r.height) * pv.h] as const : [0, 0] as const
  }
  const cropBox = p.crop !== 'auto' && p.crop !== 'none' ? p.crop : { x: 0, y: 0, w: 1, h: 1 }
  const onDown = (e: RPE, mode = 'pan') => {
    if (!pv) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    const [x, y] = toPx(e)
    drag.current = { x, y, mode: editCrop ? mode : sel !== null ? 'img' : 'pan', start: p }
  }
  const onMove = (e: RPE) => {
    const d = drag.current
    if (!d || !pv) return
    const [x, y] = toPx(e)
    const dx = x - d.x, dy = y - d.y
    const st = d.start
    if (d.mode === 'img' && sel !== null) {
      const o = st.off[sel] ?? { yaw: 0, pitch: 0, roll: 0 }
      setOff(sel, { yaw: o.yaw + (dx / pv.s) * R2D, pitch: o.pitch - (dy / pv.s) * R2D })
    } else if (d.mode === 'pan') {
      setP({ ...st, yaw: st.yaw + (dx / pv.s) * R2D, pitch: Math.max(-60, Math.min(60, st.pitch - (dy / pv.s) * R2D)) })
    } else {
      // beskjæring: andeler av hele avgrensningen
      const b = st.crop !== 'auto' && st.crop !== 'none' ? st.crop : { x: 0, y: 0, w: 1, h: 1 }
      const fx = dx / pv.w, fy = dy / pv.h
      let { x: bx, y: by, w: bw, h: bh } = b
      if (d.mode === 'move') { bx = Math.max(0, Math.min(1 - bw, bx + fx)); by = Math.max(0, Math.min(1 - bh, by + fy)) }
      if (d.mode.includes('l')) { const nx = Math.max(0, Math.min(bx + bw - 0.05, bx + fx)); bw += bx - nx; bx = nx }
      if (d.mode.includes('r')) bw = Math.max(0.05, Math.min(1 - bx, bw + fx))
      if (d.mode.includes('t')) { const ny = Math.max(0, Math.min(by + bh - 0.05, by + fy)); bh += by - ny; by = ny }
      if (d.mode.includes('b')) bh = Math.max(0.05, Math.min(1 - by, bh + fy))
      setP({ ...st, crop: { x: bx, y: by, w: bw, h: bh } })
    }
  }
  const onUp = () => { drag.current = null }

  const startCrop = () => {
    // egen beskjæring starter fra det som vises nå (automatisk eller hele)
    if (p.crop === 'auto' || p.crop === 'none') setP((q) => ({ ...q, crop: pv && !editCrop ? { ...pv.crop } : { x: 0, y: 0, w: 1, h: 1 } }))
    setEditCrop(true)
  }

  // full oppløsning (begrenset av hva nettleseren tåler): «Bruk» og «Last ned»
  const maxPx = isIOS() ? 16e6 : 64e6
  const fullOf = async (): Promise<{ blob: Blob; w: number; h: number } | null> => {
    if (!an || !imgs) return null
    setBusy({ stage: 'render', k: 0 })
    try {
      let lim = maxPx
      for (let tries = 0; tries < 4; tries++) {
        // kildene overføres til tråden (ikke kopiert), så de hentes på nytt ved hvert forsøk
        const srcs: Img[] = []
        for (const src of P.srcs) {
          const E = await c.panoMedia(src)
          if (!E) throw new Error('mangler')
          srcs.push(imgOf(baseOf(E, Math.max(E.w, E.h) * scale)))
        }
        const r = await client.render('full:' + Date.now(), srcs, an, p, { scale: 1, maxPx: lim }, (k) => setBusy({ stage: 'render', k }))
        if (!canvasFits(r.w, r.h)) { lim = r.w * r.h * 0.6; continue }
        setBusy({ stage: 'save', k: 1 })
        const out = mk(r.w, r.h)
        out.getContext('2d')!.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0)
        // tomme kanter (Hele) trenger gjennomsiktighet: PNG; ellers JPEG i høy kvalitet (filstørrelsen)
        const png = r.empty > 0.001
        let blob = await new Promise<Blob | null>((res) => out.toBlob(res, png ? 'image/png' : 'image/jpeg', 0.95))
        if (blob && blob.size > 58e6 && !png) blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/jpeg', 0.88))
        out.width = 0
        out.height = 0
        if (blob && blob.size <= 58e6) return { blob, w: r.w, h: r.h }
        lim = r.w * r.h * 0.6
      }
      return null
    } catch {
      setErr('Panoramaet kunne ikke settes sammen.')
      return null
    } finally {
      setBusy(null)
    }
  }
  const recipe = (): PanoRecipe | null => (an ? { v: 1, srcs: [...P.srcs], names: [...P.names], an, p, scale } : null)
  const apply = async () => {
    const r = await fullOf()
    const rc = recipe()
    if (r && rc) await c.applyPano(r.blob, rc, { w: r.w, h: r.h })
  }
  const download = async () => {
    const r = await fullOf()
    if (!r) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(r.blob)
    a.download = r.blob.type === 'image/png' ? 'Panorama.png' : 'Panorama.jpg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  // forventet størrelse i full oppløsning
  const fullDims = (() => {
    if (!pv || !an || !imgs) return null
    const fs = an.cams.map((cm, i) => (cm && p.use[i] !== false ? (imgs.full[i]!.w / 2 / Math.tan(cm.fov / 2)) * p.focal : 0)).filter((x) => x > 0).sort((a, b) => a - b)
    const sf = (fs[Math.floor(fs.length / 2)] ?? 0) * scale
    if (!sf) return null
    let w = Math.round((pv.w / pv.s) * sf), h = Math.round((pv.h / pv.s) * sf)
    if (w * h > maxPx) { const k = Math.sqrt(maxPx / (w * h)); w = Math.round(w * k); h = Math.round(h * k) }
    return { w, h }
  })()

  const pick = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/png,image/jpeg,image/webp'
    inp.multiple = true
    inp.onchange = () => {
      const fl = [...(inp.files ?? [])]
      if (fl.length) { setAn(null); void c.panoAdd(fl.map((f) => ({ blob: f, name: f.name }))) }
    }
    inp.click()
  }

  const seg = <T extends string | number>(val: T, opts: [T, Phrase][], on: (v: T) => void, data: string) => (
    <div className={s.row2} data-pano-seg={data}>
      {opts.map(([v, l]) => <button key={String(v)} type="button" className={val === v ? s.smallBtnOn : s.smallBtn} aria-pressed={val === v} data-v={v} onClick={() => on(v)}>{tx(l)}</button>)}
    </div>
  )
  const cropMode = p.crop === 'auto' ? 'auto' : p.crop === 'none' ? 'none' : 'own'

  return (
    <div className={`${s.maskBack} ${s.panoBack}`} role="dialog" aria-modal="true" aria-label={tx('Panorama')} data-pd-pano="">
      <div className={s.maskHead}>
        <strong>{tx('Panorama')}</strong>
        <span>{tx('Bilder tatt fra samme sted mens kameraet dreies settes sammen automatisk. Dra i forhåndsvisningen for å flytte panoramaet – eller et valgt bilde.')}</span>
      </div>
      <div className={s.panoBody}>
        <div className={s.panoView}>
          {P.srcs.length < 2 && <span className={s.note} data-pano-empty="">{tx('Legg til minst to bilder med overlapp (omtrent en tredjedel).')}</span>}
          <div className={s.panoStage} style={{ display: pv ? undefined : 'none' }}>
            <canvas ref={cv} data-pano-preview="" />
            {pv && (
              <svg viewBox={`0 0 ${pv.w} ${pv.h}`} preserveAspectRatio="none" onPointerDown={(e) => onDown(e)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} data-pano-drag="">
                {selPath && <path d={selPath} fill="rgba(245,184,44,.12)" stroke="#f5b82c" strokeWidth={Math.max(1.5, pv.w / 500)} data-pano-outline="" />}
                {editCrop && (
                  <g data-pano-crop="">
                    <path d={`M0,0H${pv.w}V${pv.h}H0Z M${cropBox.x * pv.w},${cropBox.y * pv.h}v${cropBox.h * pv.h}h${cropBox.w * pv.w}v${-cropBox.h * pv.h}Z`} fill="rgba(0,0,0,.55)" fillRule="evenodd" />
                    <rect x={cropBox.x * pv.w} y={cropBox.y * pv.h} width={cropBox.w * pv.w} height={cropBox.h * pv.h} fill="transparent" stroke="#fff" strokeWidth={Math.max(1.5, pv.w / 600)} onPointerDown={(e) => onDown(e, 'move')} style={{ cursor: 'move' }} data-pano-crop-box="" />
                    {(['tl', 'tr', 'bl', 'br'] as const).map((k) => {
                      const hx = (cropBox.x + (k.includes('r') ? cropBox.w : 0)) * pv.w, hy = (cropBox.y + (k.includes('b') ? cropBox.h : 0)) * pv.h, r = Math.max(8, pv.w / 70)
                      return <circle key={k} cx={hx} cy={hy} r={r} fill="#fff" stroke="#000" strokeWidth={r / 6} onPointerDown={(e) => onDown(e, k)} style={{ cursor: 'nwse-resize' }} data-pano-handle={k} />
                    })}
                  </g>
                )}
              </svg>
            )}
          </div>
          {busy && <span className={s.dimSm} role="status" data-pano-busy={busy.stage}>{tx(STAGE[busy.stage] ?? 'Leser bildene …')} {Math.round(busy.k * 100)} %</span>}
          {err && <span className={s.warnNote} role="alert" data-pano-err="">{tx(err)}</span>}
          {lost.length > 0 && placedN >= 2 && <span className={s.warnNote} data-pano-lost="">{tx('Disse bildene overlapper ikke med resten og er utelatt: {names}', { names: lost.map((i) => P.names[i] ?? '').join(', ') })}</span>}
          {pv && <span className={s.dimSm} data-pano-dims="">{fullDims ? tx('Full oppløsning: {w} × {h} px', { w: fullDims.w, h: fullDims.h }) : ''}</span>}
        </div>
        <div className={s.panoSide}>
          <span className={s.eyebrowSm}>{tx('Bilder')} ({P.srcs.length})</span>
          <div className={s.panoList} data-pano-list="">
            {P.names.map((n, i) => (
              <div key={P.srcs[i]! + i} className={sel === i ? s.panoItemOn : s.panoItem} data-pano-item={i}>
                <button type="button" className={s.panoName} aria-pressed={sel === i} onClick={() => setSel(sel === i ? null : i)} title={tx('Velg bildet for å justere det for seg')}>{n}{an && !an.cams[i] ? ' ⚠' : ''}</button>
                <label className={s.dimSm}><input type="checkbox" checked={p.use[i] !== false} disabled={!an?.cams[i]} onChange={(e) => setP((q) => { const use = [...q.use]; use[i] = e.target.checked; return { ...q, use } })} data-pano-use={i} /> {tx('Med')}</label>
                <button type="button" className={s.smallBtn} aria-label={tx('Fjern bildet')} onClick={() => { setAn(null); setSel(null); c.panoRemove(i) }} data-pano-remove={i}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className={s.smallBtn} onClick={pick} data-pano-add="">{tx('Legg til bilder …')}</button>
          {sel !== null && an?.cams[sel] && (
            <div data-pano-img-adj="">
              <span className={s.eyebrowSm}>{tx('Juster bildet')}: {P.names[sel]}</span>
              <Range label={tx('Sideveis')} min={-10} max={10} step={0.05} val={offOf(sel).yaw} show={`${offOf(sel).yaw.toFixed(2)}°`} on={(v) => setOff(sel, { yaw: v })} def={0} reset={() => setOff(sel, { yaw: 0 })} />
              <Range label={tx('Opp/ned')} min={-10} max={10} step={0.05} val={offOf(sel).pitch} show={`${offOf(sel).pitch.toFixed(2)}°`} on={(v) => setOff(sel, { pitch: v })} def={0} reset={() => setOff(sel, { pitch: 0 })} />
              <Range label={tx('Rotasjon')} min={-10} max={10} step={0.05} val={offOf(sel).roll} show={`${offOf(sel).roll.toFixed(2)}°`} on={(v) => setOff(sel, { roll: v })} def={0} reset={() => setOff(sel, { roll: 0 })} />
            </div>
          )}
          <span className={s.eyebrowSm}>{tx('Projeksjon')}</span>
          {seg(p.proj, [['cyl', 'Sylinder'], ['sph', 'Kule'], ['plane', 'Plan']], (v) => setP((q) => ({ ...q, proj: v })), 'proj')}
          <span className={s.dimSm}>{tx('Sylinder passer de fleste panoramaer. Plan holder rette linjer rette (smale panoramaer). Kule passer svært høye eller 360°-panoramaer.')}</span>
          <label className={s.dimSm}><input type="checkbox" checked={p.level} onChange={(e) => setP((q) => ({ ...q, level: e.target.checked }))} data-pano-level="" /> {tx('Rett opp horisonten automatisk')}</label>
          <Range label={tx('Rotasjon')} min={-15} max={15} step={0.1} val={p.roll} show={`${p.roll.toFixed(1)}°`} on={(v) => setP((q) => ({ ...q, roll: v }))} def={0} reset={() => setP((q) => ({ ...q, roll: 0 }))} />
          <Range label={tx('Vipp (perspektiv)')} min={-45} max={45} step={0.1} val={p.pitch} show={`${p.pitch.toFixed(1)}°`} on={(v) => setP((q) => ({ ...q, pitch: v }))} def={0} reset={() => setP((q) => ({ ...q, pitch: 0 }))} />
          <Range label={tx('Midtpunkt')} min={-180} max={180} step={0.5} val={p.yaw} show={`${p.yaw.toFixed(1)}°`} on={(v) => setP((q) => ({ ...q, yaw: v }))} def={0} reset={() => setP((q) => ({ ...q, yaw: 0 }))} />
          <Range label={tx('Brennvidde (synsvinkel)')} min={0.7} max={1.4} step={0.005} val={p.focal} show={`${Math.round(p.focal * 100)} %`} on={(v) => setP((q) => ({ ...q, focal: v }))} def={1} reset={() => setP((q) => ({ ...q, focal: 1 }))} />
          <span className={s.eyebrowSm}>{tx('Sømmer og lys')}</span>
          <Range label={tx('Søm: myk ↔ skarp')} min={0} max={1} step={0.01} val={p.seam} show={`${Math.round(p.seam * 100)}`} on={(v) => setP((q) => ({ ...q, seam: v }))} def={PANO_DEFAULT.seam} reset={() => setP((q) => ({ ...q, seam: PANO_DEFAULT.seam }))} />
          <span className={s.dimSm}>{tx('Myk blander bildene over et bredt felt. Skarp gir en smal søm – best når noe beveget seg mellom bildene.')}</span>
          <label className={s.dimSm}><input type="checkbox" checked={p.expo} onChange={(e) => setP((q) => ({ ...q, expo: e.target.checked }))} data-pano-expo="" /> {tx('Lik eksponering i alle bildene')}</label>
          <span className={s.eyebrowSm}>{tx('Beskjæring')}</span>
          {seg(cropMode, [['auto', 'Automatisk'], ['none', 'Hele'], ['own', 'Egen']], (v) => { if (v === 'own') startCrop(); else { setEditCrop(false); setP((q) => ({ ...q, crop: v })) } }, 'crop')}
          {editCrop && <button type="button" className={s.smallBtn} onClick={() => setEditCrop(false)} data-pano-crop-done="">{tx('Ferdig med beskjæringen')}</button>}
          <span className={s.dimSm}>{tx(cropMode === 'auto' ? 'Automatisk: største utsnitt uten tomme kanter.' : cropMode === 'none' ? 'Hele: alt som er tatt, tomme kanter blir gjennomsiktige.' : 'Egen: dra i rammen eller hjørnene.')}</span>
          <span className={s.eyebrowSm}>{tx('Oppløsning')}</span>
          {seg(scale, [[1, 'Full'], [0.5, 'Halv'], [0.25, 'Kvart']], setScale, 'scale')}
        </div>
      </div>
      <div className={s.row2}>
        <button type="button" className={s.smallBtn} disabled={!!busy && busy.stage === 'render'} onClick={() => c.closePano()} data-pano-cancel="">{tx('Avbryt')}</button>
        <button type="button" className={s.smallBtn} disabled={!an || placedN < 2 || !!busy} onClick={() => setAn(null)} data-pano-reanalyze="">{tx('Sett sammen på nytt')}</button>
        <button type="button" className={s.smallBtn} disabled={!an || placedN < 2 || !!busy} onClick={() => void download()} data-pano-download="">{tx('Last ned')}</button>
        <button type="button" className={s.primary} disabled={!an || placedN < 2 || !!busy} onClick={() => void apply()} data-pano-apply="">{tx('Bruk')}</button>
      </div>
    </div>
  )
}
