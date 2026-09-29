/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/photo-design.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

export default function template(v) {
  return (
    <>
    <div onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"13px"}}>
      {"\n  "}
      <input ref={v.fileRef} type="file" multiple={true} accept="image/png,image/jpeg,image/webp,image/gif" onChange={v.onFile} style={{"display":"none"}} />
      {"\n\n  "}
      {v.isHome ? <>
        {"\n    "}
        <div style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex"}}>
          {"\n      "}
          <a href={v.backHref} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span>
              SoMe
            </span>
          </a>
          {"\n    "}
        </div>
        {"\n    "}
        <main style={{"flex":"1","width":"100%","maxWidth":"1200px","margin":"0 auto","padding":"5vh 28px 72px","display":"flex","flexDirection":"column","gap":"36px"}}>
          {"\n      "}
          <div style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"16px","textAlign":"center"}}>
            {"\n        "}
            <h1 style={{"margin":"0","fontSize":"clamp(34px, 7vw, 88px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
              Photo design
            </h1>
            {"\n        "}
            <p style={{"margin":"0","maxWidth":"560px","fontSize":"15px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
              Lag bilder for sosiale medier og trykk. Velg format og mal, og juster farger, tekst og motiv.
            </p>
            {"\n      "}
          </div>
          {"\n      "}
          <section style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              1 · Format
            </span>
            {"\n        "}
            <div style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
              {"\n          "}
              {list(v.formats).map(($it1, $i1) => {
                const v1 = { ...v, "f": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.f?.click} style={css(`display:flex; align-items:center; gap:10px; height:48px; padding:0 16px 0 12px; border:1px solid ${v1.f?.border ?? ""}; border-radius:14px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "display:flex; align-items:center; gap:10px; height:48px; padding:0 16px 0 12px; border:1px solid {{ f.border }}; border-radius:14px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                    {"\n              "}
                    <span style={css(`width:${v1.f?.iw ?? ""}; height:${v1.f?.ih ?? ""}; border:1.5px solid currentColor; border-radius:3px; opacity:0.8;`, "width:{{ f.iw }}; height:{{ f.ih }}; border:1.5px solid currentColor; border-radius:3px; opacity:0.8;")} />
                    {"\n              "}
                    <span style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"1px"}}>
                      <span>
                        {I(v1.f?.l)}
                      </span>
                      <span data-no-i18n="1" style={{"fontSize":"11px","fontWeight":"500","opacity":"0.65"}}>
                        {I(v1.f?.dim)}
                      </span>
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            {v.isCustom ? <>
              {"\n          "}
              <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px"}}>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"8px","color":"#9d998f"}}>
                  <span>
                    Bredde
                  </span>
                  <input type="number" min="64" max="8000" value={val(v.cw)} onChange={v.onCw} style={{"width":"96px","height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}} />
                </label>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"8px","color":"#9d998f"}}>
                  <span>
                    Høyde
                  </span>
                  <input type="number" min="64" max="8000" value={val(v.ch)} onChange={v.onCh} style={{"width":"96px","height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}} />
                </label>
                {"\n            "}
                <span style={{"color":"#6f6b64"}}>
                  piksler
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </section>
          {"\n      "}
          <section style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              2 · Mal
            </span>
            {"\n        "}
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px","alignItems":"start"}}>
              {"\n          "}
              {list(v.tpls).map(($it1, $i1) => {
                const v1 = { ...v, "t": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.t?.click} style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
                    {"\n              "}
                    <div style={{"display":"flex","alignItems":"center","justifyContent":"center","height":"180px","borderRadius":"10px","background":"#141414","overflow":"hidden"}}>
                      <canvas ref={v1.t?.ref} width="10" height="10" style={{"maxWidth":"100%","maxHeight":"100%","boxShadow":"0 6px 20px rgba(0,0,0,0.5)"}} />
                    </div>
                    {"\n              "}
                    <span style={{"padding":"0 4px 2px","fontSize":"13.5px","fontWeight":"600"}}>
                      {I(v1.t?.l)}
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n      "}
          </section>
          {"\n      "}
          <section style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
              {"\n          "}
              <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Egne maler
              </span>
              {"\n          "}
              <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                {"\n            "}
                {list(v.tplCatChips).map(($it1, $i1) => {
                  const v1 = { ...v, "c": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button onClick={v1.c?.click} style={css(`height:30px; padding:0 12px; border:1px solid ${v1.c?.border ?? ""}; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:30px; padding:0 12px; border:1px solid {{ c.border }}; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                      <span data-no-i18n={v1.c?.noI}>
                        {I(v1.c?.l)}
                      </span>
                    </button>
                  </React.Fragment>;
                })}
                {"\n            "}
                <button onClick={v.newCat} style={{"height":"30px","padding":"0 12px","border":"1px dashed #3a3a3a","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                  + Ny kategori
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            {v.noMyTpls ? <>
              <span style={{"fontSize":"13px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                Ingen maler i denne kategorien ennå. Åpne et prosjekt og trykk «Lagre som mal» under Stil.
              </span>
            </> : null}
            {"\n        "}
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px"}}>
              {"\n            "}
              {list(v.myTpls).map(($it1, $i1) => {
                const v1 = { ...v, "p": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n              "}
                  <div style={{"position":"relative","display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)"}}>
                    {"\n                "}
                    <button onClick={v1.p?.open} style={css(`height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:${v1.p?.thumb ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:{{ p.thumb }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} aria-label={v1.p?.name} />
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 4px 2px"}}>
                      <span data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v1.p?.name)}
                      </span>
                      <span data-no-i18n="1" style={{"fontSize":"11px","color":"#8a867e"}}>
                        {I(v1.p?.meta)}
                      </span>
                    </div>
                    {"\n                "}
                    <button onClick={v1.p?.del} title="Slett mal" aria-label="Slett mal" style={{"position":"absolute","top":"16px","right":"16px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.72)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp3">
                      ×
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n      "}
          </section>
          {"\n      "}
          {v.hasProjects ? <>
            {"\n        "}
            <section style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
              {"\n          "}
              <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Mine prosjekter
              </span>
              {"\n          "}
              <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px"}}>
                {"\n            "}
                {list(v.projects).map(($it1, $i1) => {
                  const v1 = { ...v, "p": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={{"position":"relative","display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)"}}>
                      {"\n                "}
                      <button onClick={v1.p?.open} style={css(`height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:${v1.p?.thumb ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:{{ p.thumb }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} aria-label={v1.p?.name} />
                      {"\n                "}
                      <div style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 4px 2px"}}>
                        <span data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.p?.name)}
                        </span>
                        <span data-no-i18n="1" style={{"fontSize":"11px","color":"#8a867e"}}>
                          {I(v1.p?.meta)}
                        </span>
                      </div>
                      {"\n                "}
                      <button onClick={v1.p?.del} title="Slett prosjekt" aria-label="Slett prosjekt" style={{"position":"absolute","top":"16px","right":"16px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.72)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp3">
                        ×
                      </button>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </section>
            {"\n      "}
          </> : null}
          {"\n      "}
          <section style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","paddingTop":"18px","borderTop":"1px solid rgba(255,255,255,0.08)"}}>
            {"\n        "}
            <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              Sikkerhetskopi
            </span>
            {"\n        "}
            <button onClick={v.backupDl} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Last ned sikkerhetskopi
            </button>
            {"\n        "}
            <button onClick={v.backupPick} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Gjenopprett fra fil
            </button>
            {"\n        "}
            <input ref={v.bkFileRef} type="file" accept=".json,application/json" onChange={v.onBackupFile} style={{"display":"none"}} />
            {"\n      "}
          </section>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isEdit ? <>
        {"\n    "}
        <div data-ml-bg="static" style={{"flex":"1","height":"100dvh","display":"flex","flexDirection":"column","overflow":"hidden"}}>
          {"\n      "}
          <header style={{"position":"relative","display":"flex","alignItems":"center","gap":"8px","padding":"10px 14px","borderBottom":"1px solid #1c1c1c","background":"#0b0b0b","flexWrap":"wrap"}}>
            {"\n        "}
            <button onClick={v.leave} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"34px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              <span style={{"fontSize":"15px"}}>
                ←
              </span>
              <span>
                Prosjekter
              </span>
            </button>
            {"\n        "}
            <input value={val(v.docName)} onChange={v.onDocName} data-no-i18n="1" aria-label="Prosjektnavn" style={{"width":"180px","height":"34px","padding":"0 12px","border":"1px solid transparent","borderRadius":"10px","background":"transparent","color":"#f3f1ec","fontWeight":"600"}} className="scp5 scp6" />
            {"\n        "}
            <div style={{"display":"flex","gap":"4px"}}>
              {"\n          "}
              <button onClick={v.undo} disabled={v.noUndo} title="Angre (Ctrl+Z)" aria-label="Angre" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:${v.undoOp ?? ""};`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:{{ undoOp }};")}>
                ↶
              </button>
              {"\n          "}
              <button onClick={v.redo} disabled={v.noRedo} title="Gjør om (Ctrl+Shift+Z)" aria-label="Gjør om" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:${v.redoOp ?? ""};`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:{{ redoOp }};")}>
                ↷
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
              {"\n          "}
              <button onClick={v.zoomOut} aria-label="Zoom ut" style={{"width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                −
              </button>
              {"\n          "}
              <button onClick={v.zoomFit} title="Tilpass til vinduet" style={{"minWidth":"52px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                <span data-no-i18n="1">
                  {I(v.zoomLabel)}
                </span>
              </button>
              {"\n          "}
              <button onClick={v.zoomIn} aria-label="Zoom inn" style={{"width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                +
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            {v.hasBack ? <>
              {"\n          "}
              <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {list(v.sideOpts).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button onClick={v1.o?.click} style={css(`height:28px; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:28px; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                      {I(v1.o?.l)}
                    </button>
                  </React.Fragment>;
                })}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            <span style={{"flex":"1"}} />
            {"\n        "}
            <span style={css(`font-size:12px; color:${v.savedCol ?? ""}; white-space:nowrap;`, "font-size:12px; color:{{ savedCol }}; white-space:nowrap;")}>
              {I(v.saved)}
            </span>
            {"\n        "}
            {v.showSaveBtn ? <>
              <button onClick={v.saveNow} title="Lagre i nettleseren (Ctrl+S)" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp8">
                Lagre
              </button>
            </> : null}
            {"\n        "}
            <button onClick={v.toggleAutosave} role="switch" aria-checked={v.autosave} title="Lagre endringer automatisk i nettleseren" style={{"display":"flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 12px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}}>
              <span style={css(`position:relative; width:26px; height:15px; border-radius:999px; background:${v.asTrack ?? ""};`, "position:relative; width:26px; height:15px; border-radius:999px; background:{{ asTrack }};")}>
                <span style={css(`position:absolute; top:2px; left:${v.asKnob ?? ""}; width:11px; height:11px; border-radius:50%; background:${v.asKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ asKnob }}; width:11px; height:11px; border-radius:50%; background:{{ asKnobBg }}; transition:left .16s ease;")} />
              </span>
              <span>
                Autolagring
              </span>
            </button>
            {"\n        "}
            <button onClick={v.toggleExp} style={{"height":"34px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scp9">
              Eksporter
            </button>
            {"\n        "}
            {v.expOpen ? <>
              {"\n          "}
              <div style={{"position":"absolute","top":"calc(100% + 8px)","right":"14px","zIndex":"40","width":"300px","display":"flex","flexDirection":"column","gap":"12px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0e0e0e","boxShadow":"0 20px 60px rgba(0,0,0,0.6)"}}>
                {"\n            "}
                <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {list(v.expFmts).map(($it1, $i1) => {
                    const v1 = { ...v, "f": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.f?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.isPdf ? <>
                  <span style={{"fontSize":"12px","lineHeight":"1.5","color":"#c9c5bc"}}>
                    {I(v.pdfNote)}
                  </span>
                  <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                    Fil klar for trykkeriet. Utfallende slås av og på under Dokument.
                  </span>
                </> : null}
                {"\n            "}
                {v.notPdf ? <>
                  <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                    {list(v.expScales).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          <span data-no-i18n="1">
                            {I(v1.f?.l)}
                          </span>
                        </button>
                      </React.Fragment>;
                    })}
                  </div>
                </> : null}
                {"\n            "}
                {v.canTransp ? <>
                  {"\n              "}
                  <button onClick={v.toggleTransp} role="switch" aria-checked={v.expT} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                    <span>
                      Gjennomsiktig bakgrunn
                    </span>
                    <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.tTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ tTrack }};")}>
                      <span style={css(`position:absolute; top:2px; left:${v.tKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.tKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ tKnob }}; width:13px; height:13px; border-radius:50%; background:{{ tKnobBg }};")} />
                    </span>
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button onClick={v.doDownload} style={{"height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp9">
                  {I(v.dlLabel)}
                </button>
                {"\n            "}
                <div style={{"display":"flex","gap":"6px"}}>
                  {"\n              "}
                  <button onClick={v.doCopy} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                    Kopier bilde
                  </button>
                  {"\n              "}
                  <button onClick={v.doSend} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                    Send til …
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </header>
          {"\n\n      "}
          <div style={css(`flex:1; min-height:0; display:grid; grid-template-columns:${v.cols ?? ""}; grid-template-rows:${v.rows ?? ""};`, "flex:1; min-height:0; display:grid; grid-template-columns:{{ cols }}; grid-template-rows:{{ rows }};")}>
            {"\n        "}
            <aside style={css(`min-width:0; min-height:0; border-right:1px solid #1c1c1c; background:#0b0b0b; display:flex; flex-direction:column; overflow:hidden; order:${v.leftOrder ?? ""};`, "min-width:0; min-height:0; border-right:1px solid #1c1c1c; background:#0b0b0b; display:flex; flex-direction:column; overflow:hidden; order:{{ leftOrder }};")}>
              {"\n          "}
              <div style={{"flex":"1 1 auto","minHeight":"0","overflowY":"auto","display":"flex","flexDirection":"column","gap":"12px","padding":"14px"}}>
                {"\n            "}
                <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {list(v.lTabs).map(($it1, $i1) => {
                    const v1 = { ...v, "t": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button onClick={v1.t?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.t?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.ltLag ? <>
                  {"\n            "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Legg til
                  </span>
                  {"\n            "}
                  <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                    {"\n              "}
                    {list(v.addBtns).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                "}
                        <button onClick={v1.b?.click} style={css(`height:36px; padding:0 10px; border:1px solid ${v1.b?.border ?? ""}; border-radius:10px; background:${v1.b?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;`, "height:36px; padding:0 10px; border:1px solid {{ b.border }}; border-radius:10px; background:{{ b.bg }}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;")} className="scp4">
                          {I(v1.b?.l)}
                        </button>
                        {"\n              "}
                      </React.Fragment>;
                    })}
                    {"\n            "}
                  </div>
                  {"\n            "}
                  {v.libOpen ? <>
                    {"\n              "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #1c1c1c","borderRadius":"12px","background":"#0e0e0e"}}>
                      {"\n                "}
                      {v.libEmpty ? <>
                        <span style={{"fontSize":"12px","color":"#8a867e"}}>
                          Ingen bilder i biblioteket.
                        </span>
                      </> : null}
                      {"\n                "}
                      <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px"}}>
                        {"\n                  "}
                        {list(v.libItems).map(($it1, $i1) => {
                          const v1 = { ...v, "it": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                    "}
                            <button onClick={v1.it?.click} title={v1.it?.name} style={css(`aspect-ratio:1; padding:0; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:${v1.it?.css ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "aspect-ratio:1; padding:0; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:{{ it.css }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} className="scp8" />
                            {"\n                  "}
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </> : null}
                  {"\n            "}
                  {v.logoOpen ? <>
                    {"\n              "}
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px","padding":"10px","border":"1px solid #1c1c1c","borderRadius":"12px","background":"#0e0e0e"}}>
                      {"\n                "}
                      {list(v.logoItems).map(($it1, $i1) => {
                        const v1 = { ...v, "it": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.it?.click} title={v1.it?.name} aria-label={v1.it?.name} style={css(`aspect-ratio:1; padding:6px; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:${v1.it?.css ?? ""}; background-size:contain; background-origin:content-box; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "aspect-ratio:1; padding:6px; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:{{ it.css }}; background-size:contain; background-origin:content-box; background-repeat:no-repeat; background-position:center; cursor:pointer;")} className="scp8" />
                        </React.Fragment>;
                      })}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.ltStil ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Farge på nye elementer
                    </span>
                    {"\n                "}
                    <div style={{"display":"flex","flexWrap":"wrap","gap":"5px","alignItems":"center"}}>
                      {"\n                  "}
                      <button onClick={v.newColAuto} style={css(`height:24px; padding:0 9px; border:1px solid ${v.ncAutoB ?? ""}; border-radius:999px; background:transparent; color:#c9c5bc; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; padding:0 9px; border:1px solid {{ ncAutoB }}; border-radius:999px; background:transparent; color:#c9c5bc; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                        Auto
                      </button>
                      {"\n                  "}
                      {list(v.newColSw).map(($it1, $i1) => {
                        const v1 = { ...v, "c": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {list(v.linkTog).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                          <span>
                            {I(v1.t?.l)}
                          </span>
                          <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                            <span style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                          </span>
                        </button>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      Når koblede farger er på, endres alle lag med samme farge samtidig.
                    </span>
                    {"\n                "}
                    <div style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Bakgrunn og vignett
                    </span>
                    {"\n            "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                      {"\n              "}
                      <button onClick={v.fillToggleBox} aria-expanded={v.fillOpenBox} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","textAlign":"left"}}>
                        {"\n                "}
                        <span style={{"display":"flex","alignItems":"center","gap":"10px","minWidth":"0"}}>
                          {"\n                  "}
                          <span data-keep-color="1" style={css(`flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                          {"\n                  "}
                          <span style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                            Bakgrunnsfarge
                          </span>
                          {"\n                  "}
                          <span style={{"fontSize":"11.5px","color":"#9d998f","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v.fillSummary)}
                          </span>
                          {"\n                "}
                        </span>
                        {"\n                "}
                        <span style={{"flex":"0 0 auto","fontSize":"13px","color":"#9d998f"}}>
                          {I(v.fillArrow)}
                        </span>
                        {"\n              "}
                      </button>
                      {"\n              "}
                      {v.fillOpenBox ? <>
                        {"\n              "}
                        <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f","paddingTop":"4px"}}>
                          Type
                        </span>
                        {"\n              "}
                        <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(92px, 1fr))","gap":"5px"}}>
                          {"\n                "}
                          {list(v.fillModes).map(($it1, $i1) => {
                            const v1 = { ...v, "m": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              {"\n                  "}
                              <button onClick={v1.m?.onClick} style={css(`height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.m?.bg ?? ""}; color:${v1.m?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:{{ m.bg }}; color:{{ m.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                                {I(v1.m?.label)}
                              </button>
                              {"\n                "}
                            </React.Fragment>;
                          })}
                          {"\n              "}
                        </div>
                        {"\n              "}
                        {v.fillOn ? <>
                          {"\n                "}
                          <div data-keep-color="1" style={css(`height:44px; border-radius:8px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "height:44px; border-radius:8px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                          {"\n                "}
                          {v.fillSolidOnly ? <>
                            {"\n                  "}
                            <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                              <label data-keep-color="1" title="Farge" style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v.fillSolidC ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ fillSolidC }}; overflow:hidden; cursor:pointer;")}>
                                <input type="color" value={val(v.fillSolidC)} onChange={v.onFillSolid} aria-label="Farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                              </label>
                              <span style={{"fontSize":"12px","color":"#9d998f"}}>
                                Trykk på fargen for å endre den
                              </span>
                              <button onClick={v.fillHarmonyOne} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"marginLeft":"auto","flex":"0 0 auto","width":"28px","height":"28px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpa">
                                <span aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                  <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                  <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                  <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                  <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                                </span>
                              </button>
                            </div>
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          {v.fillMulti ? <>
                            {"\n                  "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"6px","paddingTop":"10px","borderTop":"1px solid #262626"}}>
                              {"\n                    "}
                              <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                                Gradientfarger
                              </span>
                              {"\n                    "}
                              {list(v.fillStopsList).map(($it1, $i1) => {
                                const v1 = { ...v, "q": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  {"\n                      "}
                                  <div style={{"display":"grid","gridTemplateColumns":"22px 30px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px"}}>
                                    {"\n                        "}
                                    <div style={{"display":"flex","flexDirection":"column","gap":"1px"}}>
                                      {"\n                          "}
                                      <button onClick={v1.q?.up} title="Flytt opp i rekkefølgen" aria-label="Flytt fargen opp" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.upOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.upOp }};")}>
                                        ▲
                                      </button>
                                      {"\n                          "}
                                      <button onClick={v1.q?.down} title="Flytt ned i rekkefølgen" aria-label="Flytt fargen ned" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.downOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.downOp }};")}>
                                        ▼
                                      </button>
                                      {"\n                        "}
                                    </div>
                                    {"\n                        "}
                                    <label data-keep-color="1" title={`Farge ${v1.q?.num ?? ""}`} style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v1.q?.c ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ q.c }}; overflow:hidden; cursor:pointer;")}>
                                      <input type="color" value={val(v1.q?.c)} onChange={v1.q?.onColor} aria-label={`Farge ${v1.q?.num ?? ""}`} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                                    </label>
                                    {"\n                        "}
                                    {v1.fillPosOn ? <>
                                      <input type="range" min="0" max="100" step="1" value={val(v1.q?.pct)} onChange={v1.q?.onPos} aria-label={`Posisjon for farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                    </> : null}
                                    {"\n                        "}
                                    <span style={{"fontSize":"11.5px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                      {I(v1.q?.pct)}%
                                    </span>
                                    {"\n                        "}
                                    {v1.q?.canDel ? <>
                                      <button onClick={v1.q?.del} title="Fjern farge" aria-label="Fjern farge" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scpb">
                                        ×
                                      </button>
                                    </> : null}
                                    {"\n                      "}
                                  </div>
                                  {"\n                      "}
                                  <div style={{"display":"grid","gridTemplateColumns":"60px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px","margin":"-2px 0 6px 30px"}}>
                                    {"\n                        "}
                                    <span style={{"fontSize":"11px","color":"#6f6b64"}}>
                                      Mengde
                                    </span>
                                    {"\n                        "}
                                    <input type="range" min="0" max="100" step="1" value={val(v1.q?.wPct)} onChange={v1.q?.onW} aria-label={`Mengde av farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                    {"\n                        "}
                                    <span style={{"fontSize":"11px","color":"#6f6b64","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                      {I(v1.q?.wPct)}%
                                    </span>
                                    {"\n                        "}
                                    <span />
                                    {"\n                      "}
                                  </div>
                                  {"\n                      "}
                                  {v1.q?.notLast ? <>
                                    {"\n                        "}
                                    <div style={{"display":"flex","alignItems":"center","gap":"8px","margin":"-4px 0 8px 30px"}}>
                                      {"\n                          "}
                                      <button onClick={v1.q?.toggleHard} title="Skarp eller myk overgang til neste farge" style={css(`height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.q?.hardBg ?? ""}; color:${v1.q?.hardFg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:{{ q.hardBg }}; color:{{ q.hardFg }}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                                        Skarp kant til neste
                                      </button>
                                      {"\n                        "}
                                    </div>
                                    {"\n                      "}
                                  </> : null}
                                  {"\n                    "}
                                </React.Fragment>;
                              })}
                              {"\n                    "}
                              <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                                {"\n                      "}
                                {v.fillCanAdd ? <>
                                  <button onClick={v.fillAdd} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                    + Legg til farge
                                  </button>
                                </> : null}
                                {"\n                      "}
                                <button onClick={v.fillHarmony} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"width":"30px","height":"30px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpa">
                                  <span aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                                  </span>
                                </button>
                                {"\n                      "}
                                <button onClick={v.fillReverse} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                  ⇄ Snu
                                </button>
                                {"\n                      "}
                                <button onClick={v.fillEven} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                  Fordel jevnt
                                </button>
                                {"\n                    "}
                              </div>
                              {"\n                  "}
                            </div>
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          {v.fillAngled ? <>
                            {"\n                  "}
                            <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                <span style={{"fontWeight":"600"}}>
                                  Retning
                                </span>
                                <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                  {I(v.fillAngle)}°
                                </span>
                              </span>
                              {"\n                    "}
                              <input type="range" min="0" max="360" step="1" value={val(v.fillAngle)} onChange={v.onFillAngle} aria-label="Retning" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                  "}
                            </label>
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          {v.fillMulti ? <>
                            {"\n                  "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                                <span style={{"fontWeight":"600"}}>
                                  Overgang
                                </span>
                                <span style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                                  <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillSoft)}{" %"}
                                  </span>
                                  <button onClick={v.fillSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                    Standard
                                  </button>
                                </span>
                              </span>
                              {"\n                    "}
                              <input type="range" min="0" max="100" step="1" value={val(v.fillSoft)} onChange={v.onFillSoft} aria-label="Overgang" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                    "}
                              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                                <span>
                                  Skarp kant
                                </span>
                                <span>
                                  Myk, diffus
                                </span>
                              </span>
                              {"\n                  "}
                            </div>
                            {"\n                  "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                                <span style={{"fontWeight":"600"}}>
                                  Skarphet
                                </span>
                                <span style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                                  <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillSharp)}{" %"}
                                  </span>
                                  <button onClick={v.fillSharp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                    0 %
                                  </button>
                                </span>
                              </span>
                              {"\n                    "}
                              <input type="range" min="0" max="100" step="1" value={val(v.fillSharp)} onChange={v.onFillSharp} aria-label="Skarphet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                    "}
                              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                                <span>
                                  Myke overganger
                                </span>
                                <span>
                                  Skarpe kanter
                                </span>
                              </span>
                              {"\n                  "}
                            </div>
                            {"\n                  "}
                            {v.fillRepOn ? <>
                              {"\n                    "}
                              <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                                {"\n                      "}
                                <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                  <span style={{"fontWeight":"600"}}>
                                    Antall gjentakelser
                                  </span>
                                  <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillRep)}
                                  </span>
                                </span>
                                {"\n                      "}
                                <input type="range" min="1" max="20" step="1" value={val(v.fillRep)} onChange={v.onFillRep} aria-label="Antall gjentakelser" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                {"\n                    "}
                              </label>
                              {"\n                  "}
                            </> : null}
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                            <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                              {I(v.fillNote)}
                            </span>
                            {v.fillMoved ? <>
                              <button onClick={v.fillCenter} style={{"flex":"0 0 auto","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scpc">
                                Midtstill
                              </button>
                            </> : null}
                          </div>
                          {"\n              "}
                        </> : null}
                        {"\n              "}
                      </> : null}
                      {"\n            "}
                    </div>
                    {"\n                "}
                    {list(v.vigTogs).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                          <span>
                            {I(v1.t?.l)}
                          </span>
                          <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                            <span style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                          </span>
                        </button>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    {v.vigOn ? <>
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span>
                          Vignettfarge
                        </span>
                        <input type="color" value={val(v.vigHex)} onChange={v.onVigC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                    </> : null}
                    {"\n                "}
                    {list(v.vigRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <div style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Maler
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) auto","gap":"6px"}}>
                      {"\n                  "}
                      <select value={val(v.tplCatV)} onChange={v.onTplCat} aria-label="Kategori" style={{"height":"32px","minWidth":"0","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                        {list(v.tplCatOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <option value={val(v1.o?.v)}>
                              {I(v1.o?.l)}
                            </option>
                          </React.Fragment>;
                        })}
                      </select>
                      {"\n                  "}
                      <button onClick={v.newCat} title="Ny kategori" aria-label="Ny kategori" style={{"width":"32px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp4">
                        +
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button onClick={v.saveTpl} style={{"height":"34px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp9">
                      Lagre som mal
                    </button>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      Maks 5 maler per kategori. Malene finner du på startsiden.
                    </span>
                    {"\n                "}
                    <div style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Sikkerhetskopi
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      <button onClick={v.backupDl} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Last ned
                      </button>
                      <button onClick={v.backupPick} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Gjenopprett
                      </button>
                    </div>
                    {"\n                "}
                    <input ref={v.bkFileRef} type="file" accept=".json,application/json" onChange={v.onBackupFile} style={{"display":"none"}} />
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.ltFx ? <>
                  {"\n            "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n              "}
                    <button onClick={v.toggleAdv} role="switch" aria-checked={v.advOn} title="Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon." style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","cursor":"pointer"}}>
                      <span>
                        Avansert modus
                      </span>
                      <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.advTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ advTrack }};")}>
                        <span style={css(`position:absolute; top:2px; left:${v.advKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.advKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ advKnob }}; width:13px; height:13px; border-radius:50%; background:{{ advKnobBg }}; transition:left .16s ease;")} />
                      </span>
                    </button>
                    {"\n              "}
                    {v.advOff ? <>
                      <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                        Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon.
                      </span>
                    </> : null}
                    {"\n              "}
                    {v.advOn ? <>
                      {"\n                "}
                      <input value={val(v.fxQ)} onChange={v.onFxQ} placeholder="Søk i effekter …" aria-label="Søk i effekter" style={{"height":"32px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"12px"}} className="scpd" />
                      {"\n                "}
                      <div style={{"display":"flex","flexWrap":"wrap","gap":"4px"}}>
                        {"\n                  "}
                        {list(v.fxCats).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.c?.click} style={css(`height:24px; padding:0 9px; border:1px solid ${v1.c?.border ?? ""}; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; padding:0 9px; border:1px solid {{ c.border }}; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                              {I(v1.c?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {v.fxVar ? <>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <div style={{"display":"flex","flexWrap":"wrap","gap":"5px"}}>
                            {"\n                      "}
                            {list(v.fxPals).map(($it1, $i1) => {
                              const v1 = { ...v, "c": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button onClick={v1.c?.click} title={v1.c?.l} aria-label={v1.c?.l} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:2px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.bg ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:2px solid {{ c.border }}; border-radius:50%; background:{{ c.bg }}; cursor:pointer;")} />
                              </React.Fragment>;
                            })}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          <div style={{"display":"flex","gap":"4px"}}>
                            {"\n                      "}
                            {list(v.fxStrs).map(($it1, $i1) => {
                              const v1 = { ...v, "c": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button onClick={v1.c?.click} style={css(`height:24px; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:600 11px/1 inherit; cursor:pointer;`, "height:24px; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:600 11px/1 inherit; cursor:pointer;")}>
                                  <span data-no-i18n="1">
                                    {I(v1.c?.l)}
                                  </span>
                                </button>
                              </React.Fragment>;
                            })}
                            {"\n                    "}
                          </div>
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      <span data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
                        {I(v.fxCount)}
                      </span>
                      {"\n                "}
                      {v.fxEmpty ? <>
                        <span style={{"fontSize":"12px","color":"#8a867e"}}>
                          Ingen effekter her ennå.
                        </span>
                      </> : null}
                      {"\n                "}
                      <div style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"8px"}}>
                        {"\n                  "}
                        {list(v.fxItems).map(($it1, $i1) => {
                          const v1 = { ...v, "it": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                    "}
                            <div style={{"position":"relative","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                              {"\n                      "}
                              <button onClick={v1.it?.click} onContextMenu={v1.it?.ctx} onDoubleClick={v1.it?.dbl} title={v1.it?.name} style={{"aspectRatio":"3 / 2","padding":"0","border":"1px solid #232323","borderRadius":"8px","backgroundColor":"#10141b","overflow":"hidden","cursor":"pointer"}} className="scp8">
                                {v1.it?.src ? <>
                                  <img src={v1.it?.src} alt="" style={{"display":"block","width":"100%","height":"100%","objectFit":"cover","pointerEvents":"none"}} />
                                </> : null}
                              </button>
                              {"\n                      "}
                              <button onClick={v1.it?.fav} aria-label="Favoritt" title="Favoritt" style={css(`position:absolute; top:4px; right:4px; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,0.6); color:${v1.it?.favC ?? ""}; font-size:11px; line-height:20px; cursor:pointer;`, "position:absolute; top:4px; right:4px; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,0.6); color:{{ it.favC }}; font-size:11px; line-height:20px; cursor:pointer;")}>
                                ★
                              </button>
                              {"\n                      "}
                              <span data-no-i18n="1" style={{"fontSize":"10.5px","lineHeight":"1.3","color":"#9d998f","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
                                {I(v1.it?.name)}
                              </span>
                              {"\n                    "}
                            </div>
                            {"\n                  "}
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {v.fxMore ? <>
                        <button onClick={v.fxShowMore} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Vis flere
                        </button>
                      </> : null}
                      {"\n                "}
                      <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                        {"\n                  "}
                        <button onClick={v.fxImport} title="Importer egne forhåndsvalg (JSON)" style={{"height":"30px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Importer
                        </button>
                        {"\n                  "}
                        <button onClick={v.fxExport} title="Eksporter egne forhåndsvalg (JSON)" style={{"height":"30px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Eksporter egne
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <input ref={v.fxFileRef} type="file" accept=".json,application/json" onChange={v.onFxFile} style={{"display":"none"}} />
                      {"\n                "}
                      <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                        Hver effekt blir et eget lag som kan flyttes, skaleres og endres senere. Høyreklikk på egne forhåndsvalg for å slette, dobbeltklikk for å gi nytt navn. Bakgrunn, retusj og fargegradering finner du under Motiv og Farge på et bildelag.
                      </span>
                      {"\n              "}
                    </> : null}
                    {"\n            "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"flex":"0 0 auto","maxHeight":"46%","minHeight":"0","display":"flex","flexDirection":"column","borderTop":"1px solid #1c1c1c","background":"#0d0d0d"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","padding":"10px 14px 6px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Lag
                  </span>
                  {"\n              "}
                  <span data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
                    {I(v.layerCount)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"minHeight":"0","overflowY":"auto","display":"flex","flexDirection":"column","gap":"2px","padding":"0 8px 10px"}}>
                  {"\n              "}
                  {v.noLayers ? <>
                    <span style={{"padding":"0 6px","fontSize":"12px","lineHeight":"1.5","color":"#8a867e"}}>
                      Ingen lag ennå. Legg til et bilde, en tekst eller en form.
                    </span>
                  </> : null}
                  {"\n              "}
                  {list(v.layers).map(($it1, $i1) => {
                    const v1 = { ...v, "l": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div onClick={v1.l?.click} draggable="true" onDragStart={v1.l?.dragStart} onDragOver={v1.l?.dragOver} onDrop={v1.l?.drop} title="Dra for å endre rekkefølge" style={css(`display:flex; align-items:center; gap:4px; height:30px; flex:0 0 auto; padding:0 2px 0 6px; border:1px solid ${v1.l?.border ?? ""}; border-radius:8px; background:${v1.l?.bg ?? ""}; cursor:pointer; opacity:${v1.l?.op ?? ""};`, "display:flex; align-items:center; gap:4px; height:30px; flex:0 0 auto; padding:0 2px 0 6px; border:1px solid {{ l.border }}; border-radius:8px; background:{{ l.bg }}; cursor:pointer; opacity:{{ l.op }};")} className="scpe">
                        {"\n                  "}
                        <span style={{"flex":"0 0 auto","width":"18px","height":"18px","display":"flex","alignItems":"center","justifyContent":"center","borderRadius":"5px","background":"#1c1c1c","color":"#9d998f","fontSize":"10px","fontWeight":"700"}}>
                          {I(v1.l?.icon)}
                        </span>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.l?.name)}
                        </span>
                        {"\n                  "}
                        <button onClick={v1.l?.eye} title={v1.l?.eyeT} aria-label={v1.l?.eyeT} style={css(`width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.l?.eyeC ?? ""}; font:inherit; font-size:12px; cursor:pointer;`, "width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ l.eyeC }}; font:inherit; font-size:12px; cursor:pointer;")} className="scp7">
                          ◉
                        </button>
                        {"\n                  "}
                        <button onClick={v1.l?.lock} title={v1.l?.lockT} aria-label={v1.l?.lockT} style={css(`width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.l?.lockC ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ l.lockC }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scp7">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        </button>
                        {"\n                  "}
                        <button onClick={v1.l?.del} title="Slett lag" aria-label="Slett lag" style={{"width":"22px","height":"22px","padding":"0","border":"0","borderRadius":"6px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"15px","lineHeight":"1","cursor":"pointer"}} className="scpf">
                          ×
                        </button>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </aside>
            {"\n\n        "}
            <section ref={v.stageRef} onPointerDown={v.stageDown} style={css(`position:relative; min-width:0; min-height:0; overflow:auto; display:grid; place-items:center; padding:30px; background:#060606; order:${v.stageOrder ?? ""};`, "position:relative; min-width:0; min-height:0; overflow:auto; display:grid; place-items:center; padding:30px; background:#060606; order:{{ stageOrder }};")}>
              {"\n          "}
              <div ref={v.wrapRef} onPointerDown={v.wrapDown} onPointerMove={v.wrapMove} onPointerLeave={v.wrapLeave} onDoubleClick={v.wrapDbl} style={css(`position:relative; width:${v.cssW ?? ""}; height:${v.cssH ?? ""}; flex:0 0 auto; touch-action:none; cursor:${v.cursor ?? ""}; background-color:#ffffff; background-image:linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%), linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%); background-size:20px 20px; background-position:0 0, 10px 10px; box-shadow:0 20px 70px rgba(0,0,0,0.6);`, "position:relative; width:{{ cssW }}; height:{{ cssH }}; flex:0 0 auto; touch-action:none; cursor:{{ cursor }}; background-color:#ffffff; background-image:linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%), linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%); background-size:20px 20px; background-position:0 0, 10px 10px; box-shadow:0 20px 70px rgba(0,0,0,0.6);")}>
                {"\n            "}
                <canvas ref={v.canvasRef} width="10" height="10" style={{"position":"absolute","inset":"0","width":"100%","height":"100%"}} />
                {"\n            "}
                {v.showSafe ? <>
                  <div style={css(`position:absolute; left:${v.safeI ?? ""}; top:${v.safeI ?? ""}; right:${v.safeI ?? ""}; bottom:${v.safeI ?? ""}; border:1px dashed rgba(255,63,164,0.85); pointer-events:none; z-index:3;`, "position:absolute; left:{{ safeI }}; top:{{ safeI }}; right:{{ safeI }}; bottom:{{ safeI }}; border:1px dashed rgba(255,63,164,0.85); pointer-events:none; z-index:3;")} />
                </> : null}
                {"\n            "}
                {v.guideX ? <>
                  <div style={{"position":"absolute","left":"50%","top":"0","bottom":"0","width":"1px","background":"#ff3fa4","pointerEvents":"none"}} />
                </> : null}
                {"\n            "}
                {v.guideY ? <>
                  <div style={{"position":"absolute","top":"50%","left":"0","right":"0","height":"1px","background":"#ff3fa4","pointerEvents":"none"}} />
                </> : null}
                {"\n            "}
                {v.hasBox ? <>
                  {"\n              "}
                  <div style={css(`position:absolute; left:${v.box?.left ?? ""}; top:${v.box?.top ?? ""}; width:${v.box?.w ?? ""}; height:${v.box?.h ?? ""}; transform:rotate(${v.box?.rot ?? ""}); outline:1.5px ${v.box?.line ?? ""} ${v.box?.col ?? ""}; pointer-events:none;`, "position:absolute; left:{{ box.left }}; top:{{ box.top }}; width:{{ box.w }}; height:{{ box.h }}; transform:rotate({{ box.rot }}); outline:1.5px {{ box.line }} {{ box.col }}; pointer-events:none;")}>
                    {"\n                "}
                    {list(v.handles).map(($it1, $i1) => {
                      const v1 = { ...v, "h": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onPointerDown={v1.h?.down} aria-label={v1.h?.label} style={css(`position:absolute; left:${v1.h?.left ?? ""}; top:${v1.h?.top ?? ""}; width:${v1.h?.size ?? ""}; height:${v1.h?.size ?? ""}; margin:${v1.h?.margin ?? ""}; padding:0; border:1.5px solid ${v1.box?.col ?? ""}; border-radius:${v1.h?.radius ?? ""}; background:#ffffff; cursor:${v1.h?.cursor ?? ""}; pointer-events:auto; touch-action:none;`, "position:absolute; left:{{ h.left }}; top:{{ h.top }}; width:{{ h.size }}; height:{{ h.size }}; margin:{{ h.margin }}; padding:0; border:1.5px solid {{ box.col }}; border-radius:{{ h.radius }}; background:#ffffff; cursor:{{ h.cursor }}; pointer-events:auto; touch-action:none;")} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.fxPins).map(($it1, $i1) => {
                  const v1 = { ...v, "f": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={css(`position:absolute; left:${v1.f?.left ?? ""}; top:${v1.f?.top ?? ""}; width:0; height:0; z-index:4;`, "position:absolute; left:{{ f.left }}; top:{{ f.top }}; width:0; height:0; z-index:4;")}>
                      {"\n                "}
                      <button onPointerDown={v1.f?.down} title="Dra for å flytte effekten" aria-label="Flytt effekt" style={css(`position:absolute; left:-14px; top:-14px; width:28px; height:28px; padding:0; border:2px solid #ffffff; border-radius:50%; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font-size:13px; line-height:24px; box-shadow:0 1px 6px rgba(0,0,0,0.55); cursor:move; touch-action:none;`, "position:absolute; left:-14px; top:-14px; width:28px; height:28px; padding:0; border:2px solid #ffffff; border-radius:50%; background:{{ f.bg }}; color:{{ f.fg }}; font-size:13px; line-height:24px; box-shadow:0 1px 6px rgba(0,0,0,0.55); cursor:move; touch-action:none;")}>
                        ✦
                      </button>
                      {"\n                "}
                      {v1.f?.on ? <>
                        <button onPointerDown={v1.f?.del} title="Fjern effekt" aria-label="Fjern effekt" style={{"position":"absolute","left":"10px","top":"-24px","width":"20px","height":"20px","padding":"0","border":"0","borderRadius":"50%","background":"#e4411f","color":"#ffffff","fontSize":"13px","lineHeight":"20px","boxShadow":"0 1px 4px rgba(0,0,0,0.5)","cursor":"pointer"}}>
                          ×
                        </button>
                      </> : null}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                {v.showBrush ? <>
                  <div style={css(`position:absolute; left:${v.brushX ?? ""}; top:${v.brushY ?? ""}; width:${v.brushD ?? ""}; height:${v.brushD ?? ""}; transform:translate(-50%, -50%); border:1.5px solid #ffffff; outline:1px solid rgba(0,0,0,0.6); border-radius:50%; pointer-events:none;`, "position:absolute; left:{{ brushX }}; top:{{ brushY }}; width:{{ brushD }}; height:{{ brushD }}; transform:translate(-50%, -50%); border:1.5px solid #ffffff; outline:1px solid rgba(0,0,0,0.6); border-radius:50%; pointer-events:none;")} />
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              {v.dragOver ? <>
                <div style={{"position":"absolute","inset":"12px","border":"2px dashed #e9e7e2","borderRadius":"14px","background":"rgba(0,0,0,0.6)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600","pointerEvents":"none"}}>
                  Slipp bildet her
                </div>
              </> : null}
              {"\n          "}
              {v.hasBusy ? <>
                <div style={{"position":"absolute","left":"50%","bottom":"20px","transform":"translateX(-50%)","display":"flex","alignItems":"center","gap":"10px","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","fontSize":"12.5px","fontWeight":"600"}}>
                  <span>
                    {I(v.busyLabel)}
                  </span>
                  <span data-no-i18n="1" style={{"color":"#9d998f"}}>
                    {I(v.pctLabel)}
                  </span>
                </div>
              </> : null}
              {"\n        "}
            </section>
            {"\n\n        "}
            <aside style={css(`min-width:0; min-height:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; order:${v.rightOrder ?? ""};`, "min-width:0; min-height:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; order:{{ rightOrder }};")}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"14px"}}>
                {"\n            "}
                {v.noSel ? <>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Dokument
                  </span>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Format
                    </span>
                    {"\n                "}
                    <select value={val(v.docFmt)} onChange={v.onDocFmt} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                      {list(v.fmtOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                    </select>
                  </label>
                  {"\n              "}
                  <span data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                    {I(v.docDim)}
                  </span>
                  {"\n              "}
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Bakgrunn
                  </span>
                  {"\n              "}
                  <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                    {"\n                "}
                    <input type="color" value={val(v.bgHex)} onChange={v.onBg} aria-label="Bakgrunnsfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                    {"\n                "}
                    {list(v.bgSw).map(($it1, $i1) => {
                      const v1 = { ...v, "c": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                    <span style={{"letterSpacing":"0.08em"}}>
                      CMYK
                    </span>
                    {list(v.bgCmyk).map(($it1, $i1) => {
                      const v1 = { ...v, "k": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <label style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                          <span>
                            {I(v1.k?.l)}
                          </span>
                          <input type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                        </label>
                      </React.Fragment>;
                    })}
                  </div>
                  {"\n              "}
                  <button onClick={v.toggleBgNone} role="switch" aria-checked={v.bgNone} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                    <span>
                      Gjennomsiktig bakgrunn
                    </span>
                    <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.bnTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ bnTrack }};")}>
                      <span style={css(`position:absolute; top:2px; left:${v.bnKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.bnKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ bnKnob }}; width:13px; height:13px; border-radius:50%; background:{{ bnKnobBg }};")} />
                    </span>
                  </button>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px","marginTop":"6px","paddingTop":"12px","borderTop":"1px solid #1c1c1c"}}>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Trykk
                    </span>
                    {"\n                "}
                    <span data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                      {I(v.printMm)}{" · 300 dpi"}
                    </span>
                    {"\n                "}
                    <button onClick={v.toggleBleed} role="switch" aria-checked={v.bleedOn} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                      <span>
                        Utfallende 3 mm (bleed)
                      </span>
                      <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.blTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ blTrack }};")}>
                        <span style={css(`position:absolute; top:2px; left:${v.blKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.blKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ blKnob }}; width:13px; height:13px; border-radius:50%; background:{{ blKnobBg }};")} />
                      </span>
                    </button>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      {I(v.bleedNote)}
                    </span>
                    {"\n                "}
                    {v.hasBack ? <>
                      {"\n                  "}
                      <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                        {list(v.sideOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.o?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v1.o?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <button onClick={v.toggleBack} style={{"height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      {I(v.backLabel)}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <p style={{"margin":"8px 0 0","fontSize":"12px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                    Klikk på et lag i bildet for å redigere det. Dra bilder inn i vinduet, eller lim inn med Ctrl/Cmd + V. Dra et bilde oppå en bildeplass for å bytte det.
                  </p>
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.hasSel ? <>
                  {"\n              "}
                  <input value={val(v.selName)} onChange={v.onSelName} data-no-i18n="1" aria-label="Lagnavn" style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","fontWeight":"600"}} className="scpd" />
                  {"\n              "}
                  {v.isImg ? <>
                    {"\n                "}
                    <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                      {list(v.imgTabs).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.t?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                            {I(v1.t?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n\n              "}
                  {v.secLayer ? <>
                    {"\n                "}
                    {v.isImg ? <>
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                        {"\n                    "}
                        {list(v.imgActs).map(($it1, $i1) => {
                          const v1 = { ...v, "b": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.b?.click} style={css(`height:34px; border:1px solid ${v1.b?.border ?? ""}; border-radius:10px; background:${v1.b?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:34px; border:1px solid {{ b.border }}; border-radius:10px; background:{{ b.bg }}; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")} className="scp4">
                              {I(v1.b?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      {v.cropOn ? <>
                        <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#f5b82c","textWrap":"pretty"}}>
                          Dra i bildet for å flytte utsnittet. Dra i kantene for å beskjære rammen.
                        </span>
                      </> : null}
                      {"\n                  "}
                      {list(v.tintTog).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span>
                              {I(v1.t?.l)}
                            </span>
                            <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.hasTint ? <>
                        <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                          <input type="color" value={val(v.tintC)} onChange={v.onTint} aria-label="Fargetone" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                          {list(v.tintSw).map(($it1, $i1) => {
                            const v1 = { ...v, "c": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                            </React.Fragment>;
                          })}
                        </div>
                      </> : null}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isText ? <>
                      {"\n                  "}
                      <textarea ref={v.textRef} value={val(v.tText)} onChange={v.onTText} rows="3" data-no-i18n="1" style={{"padding":"10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","resize":"vertical","lineHeight":"1.4"}} className="scpd" />
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"1fr 92px","gap":"6px"}}>
                        {"\n                    "}
                        <select value={val(v.tFont)} onChange={v.onTFont} aria-label="Skrift" style={{"height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                          {list(v.fontOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <option value={val(v1.o?.v)}>
                                {I(v1.o?.v)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                    "}
                        <select value={val(v.tWeight)} onChange={v.onTWeight} aria-label="Tykkelse" style={{"height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                          {list(v.weightOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <option value={val(v1.o?.v)}>
                                {I(v1.o?.l)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                        {list(v.alignOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "t": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.t?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v1.t?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input type="color" value={val(v.tColor)} onChange={v.onTColor} aria-label="Tekstfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.tSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                        <span style={{"letterSpacing":"0.08em"}}>
                          CMYK
                        </span>
                        {list(v.tCmyk).map(($it1, $i1) => {
                          const v1 = { ...v, "k": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <label style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                              <span>
                                {I(v1.k?.l)}
                              </span>
                              <input type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                            </label>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <button onClick={v.toggleUpper} role="switch" aria-checked={v.tUpper} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        <span>
                          Store bokstaver
                        </span>
                        <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.upTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ upTrack }};")}>
                          <span style={css(`position:absolute; top:2px; left:${v.upKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.upKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ upKnob }}; width:13px; height:13px; border-radius:50%; background:{{ upKnobBg }};")} />
                        </span>
                      </button>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span>
                          Konturfarge
                        </span>
                        <input type="color" value={val(v.tStrokeC)} onChange={v.onTStrokeC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                      {"\n                  "}
                      {list(v.barTog).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span>
                              {I(v1.t?.l)}
                            </span>
                            <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.tBar ? <>
                        <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          <span>
                            Understrekfarge
                          </span>
                          <input type="color" value={val(v.tBarC)} onChange={v.onTBarC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        </label>
                      </> : null}
                      {"\n                  "}
                      {list(v.barRanges).map(($it1, $i1) => {
                        const v1 = { ...v, "f": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {I(v1.f?.label)}
                              </span>
                              <span data-no-i18n="1">
                                {I(v1.f?.show)}
                              </span>
                            </span>
                            <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isShape ? <>
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"4px"}}>
                        {list(v.kindOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "t": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.t?.click} style={css(`height:28px; padding:0 4px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:28px; padding:0 4px; border:1px solid #2b2b2b; border-radius:8px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                              {I(v1.t?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input type="color" value={val(v.sFill)} onChange={v.onSFill} aria-label="Fyllfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.sSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                        <span style={{"letterSpacing":"0.08em"}}>
                          CMYK
                        </span>
                        {list(v.sCmyk).map(($it1, $i1) => {
                          const v1 = { ...v, "k": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <label style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                              <span>
                                {I(v1.k?.l)}
                              </span>
                              <input type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                            </label>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      {list(v.shapeToggles).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <button onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span>
                              {I(v1.t?.l)}
                            </span>
                            <span style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.sGrad ? <>
                        <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          <span>
                            Toning til
                          </span>
                          <input type="color" value={val(v.sFill2)} onChange={v.onSFill2} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        </label>
                      </> : null}
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span>
                          Konturfarge
                        </span>
                        <input type="color" value={val(v.sStrokeC)} onChange={v.onSStrokeC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isGlow ? <>
                      {"\n                  "}
                      <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input type="color" value={val(v.gColor)} onChange={v.onGColor} aria-label="Lysfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.gSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isFx ? <>
                      {"\n                  "}
                      {v.fxLocked ? <>
                        <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#f5b82c","textWrap":"pretty"}}>
                          Slå på Avansert modus for å redigere effekten. Den vises og eksporteres som før.
                        </span>
                      </> : null}
                      {"\n                  "}
                      {v.fxEdit ? <>
                        {"\n                    "}
                        <span data-no-i18n="1" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                          {I(v.fxKindName)}
                        </span>
                        {"\n                    "}
                        {v.fxHasColor ? <>
                          {"\n                      "}
                          <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            {"\n                        "}
                            <div style={{"display":"flex","flexWrap":"wrap","gap":"4px"}}>
                              {"\n                          "}
                              {list(v.fxColorTabs).map(($it1, $i1) => {
                                const v1 = { ...v, "t": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  <button onClick={v1.t?.click} style={css(`display:flex; align-items:center; gap:6px; padding:5px 10px 5px 6px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:600 12px/1 inherit; cursor:pointer;`, "display:flex; align-items:center; gap:6px; padding:5px 10px 5px 6px; border:1px solid #2b2b2b; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:600 12px/1 inherit; cursor:pointer;")}>
                                    <span data-keep-color="1" style={css(`width:14px; height:14px; border-radius:50%; background:${v1.t?.c ?? ""}; border:1px solid #444;`, "width:14px; height:14px; border-radius:50%; background:{{ t.c }}; border:1px solid #444;")} />
                                    <span data-no-i18n="1">
                                      {I(v1.t?.l)}
                                    </span>
                                  </button>
                                </React.Fragment>;
                              })}
                              {"\n                        "}
                            </div>
                            {"\n                        "}
                            <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                              {"\n                          "}
                              <input type="color" value={val(v.fxColorVal)} onChange={v.fxColorOn} aria-label="Velg farge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                              {"\n                          "}
                              {list(v.fxColorSw).map(($it1, $i1) => {
                                const v1 = { ...v, "c": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  <button onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                                </React.Fragment>;
                              })}
                              {"\n                        "}
                            </div>
                            {"\n                      "}
                          </div>
                          {"\n                    "}
                        </> : null}
                        {"\n                    "}
                        {list(v.fxSelects).map(($it1, $i1) => {
                          const v1 = { ...v, "f": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                              <span data-no-i18n="1">
                                {I(v1.f?.label)}
                              </span>
                              <select value={val(v1.f?.val)} onChange={v1.f?.on} style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                                {list(v1.f?.opts).map(($it2, $i2) => {
                                  const v2 = { ...v1, "o": $it2, $index: $i2 };
                                  return <React.Fragment key={$i2}>
                                    <option value={val(v2.o?.v)}>
                                      {I(v2.o?.l)}
                                    </option>
                                  </React.Fragment>;
                                })}
                              </select>
                            </label>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n\n                    "}
                        {list(v.fxRanges).map(($it1, $i1) => {
                          const v1 = { ...v, "f": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                <span data-no-i18n="1" style={{"fontWeight":"600"}}>
                                  {I(v1.f?.label)}
                                </span>
                                <span data-no-i18n="1">
                                  {I(v1.f?.show)}
                                </span>
                              </span>
                              <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#f5b82c"}} />
                            </label>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                    "}
                        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                          {"\n                      "}
                          {list(v.fxActs).map(($it1, $i1) => {
                            const v1 = { ...v, "b": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button onClick={v1.b?.click} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                                {I(v1.b?.l)}
                              </button>
                            </React.Fragment>;
                          })}
                          {"\n                    "}
                        </div>
                        {"\n                    "}
                        <div style={{"height":"1px","background":"#1c1c1c"}} />
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {list(v.layerRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      <span>
                        Blandingsmodus
                      </span>
                      <select value={val(v.selBlend)} onChange={v.onBlend} style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                        {list(v.blendOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <option value={val(v1.o?.v)}>
                              {I(v1.o?.l)}
                            </option>
                          </React.Fragment>;
                        })}
                      </select>
                    </label>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"6px","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      {"\n                  "}
                      {list(v.selActs).map(($it1, $i1) => {
                        const v1 = { ...v, "b": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.b?.click} style={css(`height:32px; border:1px solid #2b2b2b; border-radius:10px; background:#121212; color:${v1.b?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:32px; border:1px solid #2b2b2b; border-radius:10px; background:#121212; color:{{ b.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")} className="scp4">
                            {I(v1.b?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n\n              "}
                  {v.secColor ? <>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Looks
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px"}}>
                      {"\n                  "}
                      {list(v.looks).map(($it1, $i1) => {
                        const v1 = { ...v, "k": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.k?.click} style={css(`height:32px; padding:0 4px; border:1px solid ${v1.k?.border ?? ""}; border-radius:10px; background:${v1.k?.bg ?? ""}; color:${v1.k?.fg ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:32px; padding:0 4px; border:1px solid {{ k.border }}; border-radius:10px; background:{{ k.bg }}; color:{{ k.fg }}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                            {I(v1.k?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Justering
                      </span>
                      <button onClick={v.resetAdj} style={{"height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Nullstill
                      </button>
                    </div>
                    {"\n                "}
                    {list(v.adjRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input type="range" min={v1.f?.min} max={v1.f?.max} step="1" value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Kurve
                      </span>
                      <button onClick={v.resetCurve} style={{"height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Nullstill
                      </button>
                    </div>
                    {"\n                "}
                    <svg ref={v.curveRef} viewBox="0 0 100 100" onPointerDown={v.curveDown} style={{"width":"100%","aspectRatio":"1","border":"1px solid #232323","borderRadius":"10px","background":"#0e0e0e","touchAction":"none","cursor":"crosshair"}}>
                      {"\n                  "}
                      <path d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" stroke="#1f1f1f" stroke-width="0.5" />
                      {"\n                  "}
                      <path d="M0 100L100 0" stroke="#2b2b2b" stroke-width="0.5" stroke-dasharray="2 2" />
                      {"\n                  "}
                      <path d={v.curvePath} fill="none" stroke="#e9e7e2" stroke-width="1.2" />
                      {"\n                  "}
                      {list(v.curvePts).map(($it1, $i1) => {
                        const v1 = { ...v, "p": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <circle cx={v1.p?.x} cy={v1.p?.y} r="2.6" fill="#0e0e0e" stroke="#e9e7e2" stroke-width="1.2" />
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </svg>
                    {"\n                "}
                    <span style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64"}}>
                      Klikk for å legge til punkt. Dra for å flytte. Dobbeltklikk på et punkt fjerner det.
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n\n              "}
                  {v.secCut ? <>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Klipp ut motiv med AI
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      {"\n                  "}
                      <button onClick={v.cutPerson} disabled={v.busyAny} style={css(`height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp9">
                        Person
                      </button>
                      {"\n                  "}
                      <button onClick={v.cutObject} disabled={v.busyAny} style={css(`height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp9">
                        Objekt
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <span style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                      Kjører i nettleseren. Første gang lastes modellen ned (MODNet for personer, BiRefNet for objekter).
                    </span>
                    {"\n                "}
                    <span style={{"paddingTop":"6px","borderTop":"1px solid #1c1c1c","fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Pensel på masken
                    </span>
                    {"\n                "}
                    <button onClick={v.toggleBrush} style={css(`height:36px; border:1px solid ${v.brushBorder ?? ""}; border-radius:10px; background:${v.brushBg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:36px; border:1px solid {{ brushBorder }}; border-radius:10px; background:{{ brushBg }}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v.brushLabel)}
                    </button>
                    {"\n                "}
                    <div style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                      {list(v.brushModes).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.t?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                            {I(v1.t?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                    </div>
                    {"\n                "}
                    {list(v.brushRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <span style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64"}}>
                      Hold Alt for å bytte mellom fjern og gjenopprett.
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      {"\n                  "}
                      <button onClick={v.invertMask} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Inverter
                      </button>
                      {"\n                  "}
                      <button onClick={v.clearMask} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpg">
                        Fjern maske
                      </button>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </aside>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.hasToast ? <>
        {"\n    "}
        <div role="status" style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)"}}>
          {I(v.toast)}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
