'use no memo'
// Komponentene leser fra kontrolleren (c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import { TRSTD, type ExpState, type MotionController, type MState } from './controller'
import { exportSize, fmtT, layout, totalDur, type Project } from './engine/model'
import { clipFields, collapse, musicFields, ovFields, projectFields, subFields, textFields, type Field } from './fields'
import { LeftPanel } from './Panels'
import { Fields } from './Props'
import type { Phrase, Tx } from './texts'
import { Timeline } from './Timeline'
import s from './MotionDesign.module.css'

interface Act { l: Phrase; click: () => void; danger?: boolean }

function propsOf(c: MotionController, S: MState, p: Project): { title: Phrase; tv?: Record<string, number>; note: Phrase; raw?: boolean; fields: Field[]; actions: Act[] } {
  const T = totalDur(p)
  const sel = c.selItem()
  const look: Act[] = [{ l: 'Kopier farge og lyd', click: () => c.copyLook() }]
  if (S.hasLook) look.push({ l: 'Lim inn farge', click: () => c.pasteLook('col') })
  if (S.hasLook?.aud) look.push({ l: 'Lim inn lyd', click: () => c.pasteLook('aud') })
  let r: { title: Phrase; tv?: Record<string, number>; note: Phrase; raw?: boolean; fields: Field[]; actions: Act[] }
  if (S.multi.length > 1) {
    const a: Act[] = [{ l: 'Kopier', click: () => c.copySel() }]
    if (S.hasLook) a.push({ l: 'Lim inn farge', click: () => c.pasteLook('col') })
    if (S.hasLook?.aud) a.push({ l: 'Lim inn lyd', click: () => c.pasteLook('aud') })
    a.push({ l: 'Slett alle', click: () => c.delSel(), danger: true }, { l: 'Fjern valg', click: () => c.set({ sel: null, multi: [] }) })
    r = { title: '{n} valgt', tv: { n: S.multi.length }, note: 'Shift-klikk for å legge til eller fjerne fra utvalget.', fields: [], actions: a }
  } else if (sel?.type === 'clip') {
    const it = sel.it as Project['clips'][number]
    const idx = p.clips.findIndex((x) => x.id === it.id)
    r = {
      title: it.kind === 'video' ? 'Videoklipp' : it.kind === 'image' ? 'Bilde' : 'Fargeflate', note: '', fields: clipFields(c, p, it, layout(p)[idx], idx),
      actions: [{ l: 'Del ved spillehodet', click: () => c.split() }, ...(it.kind === 'video' ? [{ l: 'Frys bilde', click: () => void c.freeze() }] : []), { l: 'Bytt media', click: () => c.set({ tab: 'media', replaceFor: it.id }) }, ...look, { l: 'Dupliser', click: () => c.dupSel() }, { l: '← Flytt', click: () => c.moveClip(-1) }, { l: 'Flytt →', click: () => c.moveClip(1) }, { l: 'Slett', click: () => c.delSel(), danger: true }],
    }
  } else if (sel?.type === 'text') {
    const it = sel.it as Project['texts'][number]
    r = {
      title: 'Tekst', note: '', fields: textFields(c, it),
      actions: [{ l: 'Flytt til spillehodet', click: () => c.patch('text', it.id, { start: c.t }) }, { l: 'Del ved spillehodet', click: () => c.split() }, { l: 'Dupliser', click: () => c.dupSel() }, { l: 'Legg øverst', click: () => c.setProj((q) => ({ ...q, texts: [...q.texts.filter((x) => x.id !== it.id), it] })) }, { l: 'Slett', click: () => c.delSel(), danger: true }],
    }
  } else if (sel?.type === 'ov') {
    const it = sel.it as Project['ov'][number]
    const PO = (o: Partial<Project['ov'][number]>) => c.patch('ov', it.id, o)
    r = {
      title: it.kind === 'video' ? 'Overlegg · video' : 'Overlegg · bilde', note: '', fields: ovFields(c, p, it),
      actions: [{ l: 'Midtstill', click: () => PO({ x: 0.5, y: 0.5 }) }, { l: 'Fyll bildet', click: () => PO({ x: 0.5, y: 0.5, scale: 1, radius: 0, shadow: false, rot: 0 }) }, { l: 'Flytt til spillehodet', click: () => PO({ start: c.t }) }, ...look, { l: 'Dupliser', click: () => c.dupSel() }, { l: 'Slett', click: () => c.delSel(), danger: true }],
    }
  } else if (sel?.type === 'music') {
    const it = sel.it as Project['music'][number]
    r = {
      title: 'Musikk', note: it.name, raw: true, fields: musicFields(c, it),
      actions: [{ l: 'Flytt til spillehodet', click: () => c.patch('music', it.id, { start: c.t }) }, { l: 'Del ved spillehodet', click: () => c.split() }, { l: 'Markører på takten', click: () => void c.beatMarkers(it) }, { l: 'Slett', click: () => c.delSel(), danger: true }],
    }
  } else if (sel?.type === 'sub') {
    r = { title: 'Undertekst', note: '', fields: subFields(c, sel.it as Project['subs'][number]), actions: [{ l: 'Dupliser', click: () => c.dupSel() }, { l: 'Slett', click: () => c.delSel(), danger: true }] }
  } else {
    r = { title: 'Prosjekt', note: 'Velg et klipp, en tekst eller et lydspor for å endre det. Dra filer rett inn i vinduet for å legge dem til.', fields: projectFields(c, p, T), actions: [{ l: 'Legg til markør', click: () => c.addMarker() }] }
  }
  const sl = c.selList()
  const linked = sl.some((x) => {
    const arr = p[({ clip: 'clips', text: 'texts', sub: 'subs', music: 'music', ov: 'ov' } as const)[x.type]] as { id: string; link?: string }[]
    return !!arr.find((y) => y.id === x.id)?.link
  })
  if (sl.length > 1) r.actions.splice(1, 0, { l: 'Koble sammen', click: () => c.linkSel() })
  if (linked) r.actions.splice(Math.max(0, r.actions.length - 1), 0, { l: 'Koble fra', click: () => c.unlinkSel() })
  return r
}

const EXP: [ExpState['q'], Phrase, '1080' | '4k'][] = [['1080-30', '1080p · 30 fps', '1080'], ['1080-60', '1080p · 60 fps', '1080'], ['4k-30', '4K · 30 fps', '4k']]

export function Editor({ c, S, p, tx, onShared, onLogoCloud, folders }: { c: MotionController; S: MState; p: Project; tx: Tx; onShared: () => void; onLogoCloud: () => void; folders: boolean }) {
  const T = totalDur(p)
  const narrow = S.narrow
  const wide = !narrow && S.vw >= 1280
  const port = p.h > p.w * 1.05
  const pr = propsOf(c, S, p)
  const fields = collapse(pr.fields, S.secOpen)
  const E = S.exp
  const F = S.folder
  const ghost = S.trDrag ?? S.medDrag
  const ghostSub: Record<string, Phrase> = { clip: 'Sett inn i videosporet', ov: 'Overlegg', stage: 'Overlegg ved spillehodet', music: 'Lydspor' }
  return (
    <div ref={c.bind('root')} className={`${s.editor} ${narrow ? s.editorNarrow : ''}`} data-md-editor="1"
      onDragOver={(e) => {
        if (![...(e.dataTransfer.types || [])].includes('Files')) return
        e.preventDefault()
        if (!S.dragOver) c.set({ dragOver: true })
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        c.set({ dragOver: false })
      }}
      onDrop={(e) => {
        e.preventDefault()
        c.set({ dragOver: false })
        const fs = [...(e.dataTransfer.files || [])]
        if (fs.length) void c.addFiles(fs, 'drop')
      }}>
      <header className={s.bar}>
        <button type="button" className={`${s.barBtn} ${s.back}`} onClick={() => void c.leave()}><span>←</span><span>{tx('Prosjekter')}</span></button>
        <input className={s.name} value={p.name} aria-label={tx('Prosjektnavn')} onChange={(e) => {
          const v = e.target.value.slice(0, 120)
          c.setProj((q) => ({ ...q, name: v }), true, 'name')
        }} />
        <span className={s.dim}>{p.w} × {p.h}</span>
        <span className={s.flex} />
        <span className={`${s.saved} ${S.saved === 'Ikke lagret' ? s.savedWarn : ''}`} role="status">{S.saved ? tx(S.saved) : ''}</span>
        {!S.autosave && <button type="button" className={s.barBtn} title={tx('Lagre i nettleseren (Ctrl+S)')} onClick={() => void c.saveBrowser()}>{tx('Lagre')}</button>}
        <button type="button" className={s.auto} role="switch" aria-checked={S.autosave} title={tx('Lagre endringer automatisk i nettleseren')} onClick={() => c.toggleAutosave()}>
          <span className={s.autoTrack}><span className={s.autoKnob} /></span><span>{tx('Autolagring')}</span>
        </button>
        <span style={{ display: 'flex', gap: 4 }}>
          <button type="button" className={s.barRound} title={tx('Angre (Ctrl+Z)')} aria-label={tx('Angre')} disabled={!c.canUndo} onClick={() => c.undo()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
          </button>
          <button type="button" className={s.barRound} title={tx('Gjør om (Ctrl+Shift+Z)')} aria-label={tx('Gjør om')} disabled={!c.canRedo} onClick={() => c.redo()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
          </button>
        </span>
        <button type="button" className={`${s.barBtn} ${s.folderBtn}`} title={tx('Prosjektmappe på PC-en: videoer og filer lagres der, ikke i nettleseren')} onClick={() => c.openFolderDlg()}>{F?.folder ? `📁 ${F.folder}` : tx('Prosjektmappe')}</button>
        <button type="button" className={s.barBtn} title={tx('Last ned hele prosjektet med filer (Ctrl+Shift+S)')} disabled={S.packing} onClick={() => void c.saveFile()}>{tx(S.packing ? 'Lager fil …' : 'Lagre prosjektfil')}</button>
        <button type="button" className={s.exportBtn} onClick={() => c.openExport()}>{tx('Eksporter')}</button>
      </header>

      <div className={s.grid} style={{ gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'clamp(190px, 21vw, 290px) minmax(0, 1fr) clamp(210px, 23vw, 310px)', gridTemplateRows: narrow ? 'minmax(260px, 46dvh) minmax(0, 40dvh)' : 'minmax(0, 1fr)' }}>
        <aside className={`${s.aside} ${s.asideL}`} style={{ order: narrow ? 2 : 1, display: !narrow || S.drawer !== 'r' ? 'flex' : 'none' }}>
          <LeftPanel c={c} S={S} p={p} tx={tx} onShared={onShared} onLogoCloud={onLogoCloud} />
        </aside>
        <section className={s.center} style={{ order: narrow ? 1 : 2 }}>
          <div ref={c.bind('stage')} className={s.stage} style={{ padding: port ? 8 : 16 }}>
            <canvas ref={c.bind('canvas')} className={s.canvas} data-md-canvas="1" width={S.pv.cw} height={S.pv.ch} style={{ width: S.pv.w, height: S.pv.h }}
              onPointerDown={(e) => c.canvasDown(e)} onContextMenu={(e) => c.canvasCtx(e)} onDoubleClick={(e) => c.canvasDbl(e)} onPointerMove={(e) => c.canvasMove(e)} />
            {S.dragOver && <div className={s.drop}>{tx('Slipp filene for å legge dem til')}</div>}
          </div>
          <div className={s.transport}>
            <button type="button" className={s.barRound} title={tx('Til start (Home)')} aria-label={tx('Til start')} onClick={() => c.seek(0)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="3" height="16" /><path d="M20 4v16L8 12z" /></svg>
            </button>
            <button type="button" className={s.play} title={tx('Spill av / pause (mellomrom)')} aria-label={tx(S.playing ? 'Pause' : 'Spill av')} onClick={() => c.togglePlay()}>
              {S.playing
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>}
            </button>
            <span ref={c.bind('time')} className={s.time} data-md-time="1">{fmtT(S.t)} / {fmtT(T)}</span>
            {narrow && (
              <>
                <button type="button" className={`${s.barBtn} ${s.tBtn} ${s.drawer}`} aria-pressed={S.drawer !== 'r'} onClick={() => c.set({ drawer: 'l' })}>{tx('Legg til')}</button>
                <button type="button" className={`${s.barBtn} ${s.tBtn} ${s.drawer}`} aria-pressed={S.drawer === 'r'} onClick={() => c.set({ drawer: 'r' })}>{tx('Egenskaper')}</button>
              </>
            )}
            <button type="button" className={`${s.barBtn} ${s.tBtn}`} title={tx('Del ved spillehodet (S)')} aria-label={tx('Del ved spillehodet')} onClick={() => c.split()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></svg>
              {wide && <span>{tx('Del')}</span>}
            </button>
            <button type="button" className={`${s.barBtn} ${s.tBtn}`} title={tx('Markør ved spillehodet (M). Dobbeltklikk på en markør for å fjerne den.')} aria-label={tx(c.markerAt(S.t) ? 'Fjern markør' : 'Markør')} onClick={() => c.toggleMarker()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5a36"><path d="M12 2l10 10-10 10L2 12z" /></svg>
              {wide && <span>{tx(c.markerAt(S.t) ? 'Fjern markør' : 'Markør')}</span>}
            </button>
            <span className={s.flex} />
            {wide && <span className={s.keys}>{tx('Mellomrom: spill av · S: del · M: markør · Ctrl+C/V: kopier/lim inn · Delete: slett')}</span>}
          </div>
        </section>
        <aside className={`${s.aside} ${s.asideR}`} data-md-props="1" style={{ order: 3, display: !narrow || S.drawer === 'r' ? 'flex' : 'none' }}>
          <div className={s.propHead}>
            <span className={s.propTitle}>{tx(pr.title, pr.tv)}</span>
            {S.sel && <button type="button" className={s.linkBtn} onClick={() => c.set({ sel: null, replaceFor: null })}>{tx('Fjern valg')}</button>}
          </div>
          {pr.actions.length > 0 && (
            <div className={s.acts}>
              {pr.actions.map((a) => <button key={a.l} type="button" className={`${s.act} ${a.danger ? s.danger : ''}`} onClick={a.click}>{tx(a.l)}</button>)}
            </div>
          )}
          {pr.note && <span className={s.note} style={{ fontSize: 12, lineHeight: 1.55 }}>{pr.raw ? pr.note : tx(pr.note)}</span>}
          <Fields fields={fields} c={c} tx={tx} />
        </aside>
      </div>

      <Timeline c={c} S={S} p={p} tx={tx} maxH={narrow ? '28dvh' : 'min(34dvh, 280px)'} />

      {S.menu && (
        <>
          <div className={s.menuBack} onPointerDown={(e) => {
            e.preventDefault()
            c.set({ menu: null })
          }} onContextMenu={(e) => {
            e.preventDefault()
            c.set({ menu: null })
          }} />
          <div role="menu" className={s.ctxMenu} style={{ left: S.menu.x, top: S.menu.y }}>
            {S.menu.items.map((it, i) => (it === 'sep'
              ? <div key={i} className={s.menuSep} />
              : <button key={i} type="button" role="menuitem" className={s.menuItem} style={{ color: it.danger ? '#ff8f7d' : undefined }} onClick={it.click}><span>{tx(it.l)}</span><span className={s.menuKey}>{it.k}</span></button>))}
          </div>
        </>
      )}
      {ghost && (
        <div className={s.ghost} style={{ left: ghost.x, top: ghost.y }}>
          <span>{S.trDrag ? tx(TRSTD.find((x) => x[0] === S.trDrag?.type)?.[1] ?? '') : S.medDrag?.name}</span>
          {S.medDrag?.hit && <span className={s.ghostSub}>{tx(ghostSub[S.medDrag.hit.kind] ?? '')}</span>}
        </div>
      )}
      {E && (
        <div className={s.modalBack}>
          <div role="dialog" aria-modal="true" aria-label={tx('Eksporter video')} className={s.modal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h2 className={s.modalTitle}>{tx('Eksporter video')}</h2>
              <p className={s.modalLead}>{tx('MP4 med H.264 og lyd. Hold fanen åpen mens videoen lages. Lange videoer og 4K tar lengre tid.')}</p>
            </div>
            <div className={s.opts}>
              {EXP.map(([k, l, q]) => {
                const z = exportSize(p, q)
                return (
                  <button key={k} type="button" className={s.opt} aria-pressed={E.q === k} onClick={() => c.pickQuality(k)}>
                    <span className={s.radio} />
                    <span className={s.optL}>{tx(l)}</span>
                    <span className={s.dim}>{z.w} × {z.h}</span>
                  </button>
                )
              })}
            </div>
            <span className={s.dim}>{tx('Lengde {len}', { len: fmtT(T) })}</span>
            {E.busy && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={s.bar6}><div style={{ width: `${E.pct}%` }} /></div>
                <span className={s.dim} style={{ color: '#c9c5bc' }} role="status">{E.phase ? tx(E.phase.p, E.phase.v) : ''}</span>
              </div>
            )}
            <div className={s.row}>
              <button type="button" className={`${s.barBtn} ${s.small}`} onClick={() => void c.sendFrame()}>{tx('Stillbilde til Dine medier')}</button>
              {S.lastExp && <button type="button" className={`${s.barBtn} ${s.small}`} onClick={() => void c.sendVideo()}>{tx('Videoen til Dine medier')}</button>}
            </div>
            {E.msg && <span className={E.err ? s.err : s.ok} role="status">{tx(E.msg.p, E.msg.v)}</span>}
            <div className={s.modalBtns}>
              {!E.busy && (
                <>
                  <button type="button" className={s.mBtn} onClick={() => c.closeExport()}>{tx('Lukk')}</button>
                  <button type="button" className={s.mBtnLight} onClick={() => void c.doExport()}>{tx('Eksporter MP4')}</button>
                </>
              )}
              {E.busy && <button type="button" className={`${s.mBtn} ${s.mBtnAbort}`} onClick={() => c.abortExport()}>{tx('Avbryt eksport')}</button>}
            </div>
          </div>
        </div>
      )}
      {S.folderDlg && (
        <div className={s.modalBack} style={{ zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && c.set({ folderDlg: false })}>
          <div role="dialog" aria-modal="true" aria-label={tx('Prosjektmappe')} className={`${s.modal} ${s.modalWide}`}>
            <strong style={{ fontSize: 16 }}>{tx('Prosjektmappe')}</strong>
            <p className={s.lead3}>{tx('Med en prosjektmappe ligger videoer, bilder og lyd i en vanlig mappe på PC-en din, ikke i nettleseren. Filene sendes aldri over nett. Mappen kan tas med til en annen PC og åpnes med «Åpne prosjektmappe».')}</p>
            {!folders && <p className={s.warn}>{tx('Denne nettleseren støtter ikke prosjektmapper. Bruk Chrome eller Edge på PC. Prosjektet lagres i nettleseren som før.')}</p>}
            {F?.folder && (
              <p className={s.p13}>
                {tx('Mappe')}: <b>{F.folder}</b> · {tx(F.access ? 'tilgang gitt' : 'trenger tilgang')}
                {F.inBrowser ? ` · ${tx('{n} filer har også en kopi i nettleseren', { n: F.inBrowser })}` : ''}
              </p>
            )}
            {S.folderBusy && <p className={s.busy} role="status">{tx(S.folderBusy.p, S.folderBusy.v)}</p>}
            <div className={s.row} style={{ gap: 8 }}>
              {folders && !F?.folder && <button type="button" className={`${s.fBtn} ${s.fBtnLight}`} disabled={!!S.folderBusy} onClick={() => void c.pickFolder()}>{tx('Kopier til prosjektmappe …')}</button>}
              {folders && F?.folder && !F.access && <button type="button" className={`${s.fBtn} ${s.fBtnLight}`} onClick={() => void c.grantFolder()}>{tx('Gi tilgang til mappen')}</button>}
              {folders && F?.folder && F.access && F.inBrowser > 0 && <button type="button" className={`${s.fBtn} ${s.fBtnRed}`} onClick={() => void c.freeBrowser()}>{tx('Frigjør plass i nettleseren')}</button>}
              {folders && F?.folder && <button type="button" className={s.fBtn} disabled={!!S.folderBusy} onClick={() => void c.pickFolder()}>{tx('Bytt mappe …')}</button>}
              <button type="button" className={s.fBtn} onClick={() => c.set({ folderDlg: false })}>{tx('Lukk')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
