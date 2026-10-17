'use no memo'
// Komponentene leser fra kontrolleren (c.selL(), c.s …); kompilatorens mellomlagring ville gitt utdaterte verdier.
import type { ThumbController, State } from './controller'
import { BASE_LABELS } from './engine/layouts'
import { MAX_TPL } from './engine/model'
import type { Phrase, Tx } from './texts'
import s from './ThumbnailStudio.module.css'

/** Startsiden: kategoriene, «Rediger kategorier» og sikkerhetskopi (TS-01, TS-02, TS-15). */
export function Home({ c, S, tx, onBackup, onRestore }: { c: ThumbController; S: State; tx: Tx; onBackup: () => void; onRestore: () => void }) {
  return (
    <div className={s.home}>
      <div className={s.topRight}>
        <button type="button" className={S.editCats ? s.pillOn : s.pill} aria-pressed={S.editCats} onClick={() => c.toggleEditCats()}>
          {tx(S.editCats ? 'Ferdig' : 'Rediger kategorier')}
        </button>
      </div>
      <h1 className={s.title} data-ml-title="">Thumbnail Studio</h1>
      <p className={s.lead}>{tx('Miniatyrbilder til YouTube og appen i 16:9. Velg en kategori, bytt person og navn, og last ned i 1080p eller 4K.')}</p>
      <div className={s.catGrid}>
        {S.cats.map((k) => S.editCats ? (
          <div key={k.id} className={s.catEdit}>
            <div className={s.catEditHead}>
              <input value={k.name} placeholder={tx('Navn på kategori')} aria-label={tx('Navn på kategori')} onChange={(e) => c.setCat(k.id, { name: e.target.value.slice(0, 40) })} />
              <button type="button" className={s.catDel} title={tx('Slett kategori')} aria-label={tx('Slett kategori')} onClick={() => c.delCat(k)}>×</button>
            </div>
            <textarea value={k.desc} rows={3} placeholder={tx('Beskrivelse')} aria-label={tx('Beskrivelse')} onChange={(e) => c.setCat(k.id, { desc: e.target.value.slice(0, 200) })} />
            <label className={s.catBase}>
              <span>{tx('Grunnoppsett')}</span>
              <select value={k.base} onChange={(e) => c.setCatBase(k, e.target.value as typeof k.base)}>
                {c.baseKeys().map((b) => <option key={b} value={b}>{tx(BASE_LABELS[b] as Phrase)}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <button key={k.id} type="button" className={s.catCard} onClick={() => c.openCat(k.id)}>
            <span className={s.eyebrow}>{tx('{n} av 5 maler', { n: c.tplsOf(k.id).length })}</span>
            <span className={s.catName} lang="no">{k.name}</span>
            <span className={s.catDesc}>{k.desc}</span>
            <span className={s.catOpen}><span>{tx('Åpne')}</span></span>
          </button>
        ))}
        {S.editCats && (
          <button type="button" className={s.catAdd} onClick={() => c.addCat()}>
            <span>+</span>
            <span>{tx('Ny kategori')}</span>
          </button>
        )}
      </div>
      <div className={s.backup}>
        <span>
          <b>{tx('Sikkerhetskopi')}</b>
          <span>{tx('Malene lagres bare i denne nettleseren. Last ned en fil for å ta vare på dem, eller for å flytte dem til en annen maskin.')}</span>
        </span>
        <div>
          <button type="button" className={s.pillSm} onClick={onBackup} disabled={S.backupBusy}>{tx(S.backupBusy ? 'Lager fil …' : 'Last ned sikkerhetskopi')}</button>
          <button type="button" className={s.pillSm} onClick={onRestore}>{tx('Gjenopprett fra fil')}</button>
        </div>
      </div>
    </div>
  )
}

/** En kategori: grunnoppsettene, fremgangsmåten og malene (maks 5). */
export function CategoryView({ c, tx }: { c: ThumbController; tx: Tx }) {
  const cat = c.cat()
  if (!cat) return null
  const list = c.tplsOf(cat.id)
  const full = list.length >= MAX_TPL
  const def = c.defaultLayoutId(cat)
  const lang = tx('nb-NO')
  return (
    <div className={s.category}>
      <div>
        <button type="button" className={s.pill} onClick={() => c.goHome()}><span aria-hidden="true">←</span> {tx('Kategorier')}</button>
      </div>
      <div className={s.catHead}>
        <span className={s.eyebrow}>{tx('{n} av 5 maler', { n: list.length })}</span>
        <h1 className={s.catTitle} data-ml-title="">{cat.name}</h1>
        <p className={s.catLead}>{cat.desc}</p>
        <div className={s.catActions}>
          <button type="button" className={s.pillSm} onClick={() => c.editBase('main')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
            <span>{tx('Rediger grunnoppsett')}</span>
          </button>
          {cat.baseDoc && <button type="button" className={s.linkBtn} onClick={() => c.resetBase()}>{tx('Tilbakestill til standard')}</button>}
          <span className={s.dim}>{tx('Grunnoppsettene er felles for menigheten. Malene dine er personlige.')}</span>
        </div>
        <div className={s.layouts} data-ch-layouts="1">
          <span className={s.eyebrowSm}>{tx('Grunnoppsett i kategorien · felles for menigheten')}</span>
          {c.layoutsOf(cat).map((l) => (
            <div key={l.id} className={s.layoutRow} data-ch-layout={l.name}>
              <b>{l.name}{l.id === def && <span className={s.defTag} data-ch-layout-default="1">{tx('Standard')}</span>}</b>
              <button type="button" className={s.btnSmall} onClick={() => c.editBase(l.id)}>{tx('Rediger')}</button>
              <button type="button" className={s.textBtn} onClick={() => c.renameLayout(cat, l)}>{tx('Gi nytt navn')}</button>
              {l.id !== def && <button type="button" className={s.textBtn} data-ch-layout-make-default="1" onClick={() => c.setDefaultLayout(cat, l.id)}>{tx('Gjør til standard')}</button>}
              {l.id !== 'main' && <button type="button" className={s.textBtnDanger} onClick={() => c.delLayout(cat, l)}>{tx('Slett')}</button>}
            </div>
          ))}
          <button type="button" className={s.addLayout} data-ch-layout-add="1" onClick={() => c.addLayout()}>+ {tx('Nytt grunnoppsett')}</button>
        </div>
      </div>
      <ol className={s.steps}>
        <li><span>1</span>{tx('Trykk «Ny mal» og velg et oppsett.')}</li>
        <li><span>2</span>{tx('Bytt person, navn og tema i panelet til høyre.')}</li>
        <li><span>3</span>{tx('Lagre malen, og last ned i 1080p eller 4K.')}</li>
      </ol>
      <div className={s.tplGrid}>
        <button type="button" className={s.newTpl} onClick={() => c.newFromBase()}>
          <span className={s.plus}>+</span>
          <span className={s.newTplLabel}>{tx('Ny mal')}</span>
          <span className={s.dimSm}>{tx(full ? 'Full (5 av 5). Slett en mal først.' : 'Velg grunnoppsett, standard eller blank')}</span>
        </button>
        {list.map((t) => (
          <div key={t.id} className={s.tplCard}>
            <button type="button" className={s.tplThumb} onClick={() => c.openTpl(t)} aria-label={t.name}>{t.thumb && <img src={t.thumb} alt="" />}</button>
            <div className={s.tplBody}>
              <span className={s.tplName}>{t.name}</span>
              <span className={s.dimSm}>{tx('Endret {date}', { date: new Date(t.updated).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
              <div className={s.tplActions}>
                <button type="button" className={s.btnOn} onClick={() => c.openTpl(t)}>{tx('Rediger')}</button>
                <button type="button" className={s.btnSmall} disabled={full} onClick={() => c.dupTpl(t)}>{tx('Dupliser')}</button>
                <button type="button" className={s.btnDangerPush} onClick={() => c.delTpl(t)}>{tx('Slett')}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {full && <span className={s.dimSm}>{tx('Kategorien har 5 maler, som er maks. Slett eller overskriv en for å lagre en ny.')}</span>}
    </div>
  )
}
