/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/motion-design.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

export default function template(v) {
  return (
    <>
    <div style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <input type="file" ref={v.fileProj} onChange={v.onProjFile} accept=".motion" style={{"display":"none"}} />
      {"\n\n  "}
      {v.isMenu ? <>
        {"\n    "}
        <div style={{"position":"sticky","top":"0","zIndex":"50","padding":"22px 28px 10px","display":"flex","alignItems":"center","gap":"12px"}}>
          {"\n      "}
          {v.showBackLink ? <>
            {"\n        "}
            <a href="media-lab.dc.html#some" style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
              <span style={{"fontSize":"16px","letterSpacing":"0"}}>
                ←
              </span>
              <span style={{"textTransform":"none"}}>
                SoMe
              </span>
            </a>
            {"\n      "}
          </> : null}
          {"\n      "}
          {v.showBackBtn ? <>
            {"\n        "}
            <button onClick={v.goBack} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
              <span style={{"fontSize":"16px","letterSpacing":"0"}}>
                ←
              </span>
              <span>
                {I(v.backLabel)}
              </span>
            </button>
            {"\n      "}
          </> : null}
          {"\n    "}
        </div>
        {"\n\n    "}
        <main style={{"flex":"1","width":"100%","maxWidth":"1120px","margin":"0 auto","padding":"6vh 28px 64px","display":"flex","flexDirection":"column","gap":"36px"}}>
          {"\n      "}
          {v.isHome ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"18px","textAlign":"center"}}>
              {"\n          "}
              <h1 style={{"margin":"0","fontSize":"clamp(36px, 6.5vw, 84px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
                Motion design
              </h1>
              {"\n          "}
              <p style={{"margin":"0","maxWidth":"560px","fontSize":"15px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
                Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger.
              </p>
              {"\n          "}
              <div style={{"display":"flex","gap":"10px","flexWrap":"wrap","justifyContent":"center","paddingTop":"6px"}}>
                {"\n            "}
                <button onClick={v.newProject} style={{"height":"44px","padding":"0 26px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                  Nytt prosjekt
                </button>
                {"\n            "}
                <button onClick={v.openFile} style={{"height":"44px","padding":"0 24px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
                  Åpne prosjektfil
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              {v.hasHomeMsg ? <>
                <span style={{"fontSize":"13px","color":"#ff8f7d"}}>
                  {I(v.homeMsg)}
                </span>
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            {v.hasProjects ? <>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
                {"\n            "}
                <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                  Dine prosjekter
                </span>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(220px, 1fr))","gap":"14px"}}>
                  {"\n              "}
                  {list(v.projects).map(($it1, $i1) => {
                    const v1 = { ...v, "p": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div style={{"display":"flex","flexDirection":"column","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","overflow":"hidden"}}>
                        {"\n                  "}
                        <button onClick={v1.p?.open} style={css(`display:block; width:100%; aspect-ratio:16 / 10; padding:0; border:0; background-color:#000; background-image:${v1.p?.thumbCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "display:block; width:100%; aspect-ratio:16 / 10; padding:0; border:0; background-color:#000; background-image:{{ p.thumbCss }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} aria-label="Åpne prosjekt" />
                        {"\n                  "}
                        <div style={{"display":"flex","alignItems":"center","gap":"8px","padding":"12px 12px 12px 14px"}}>
                          {"\n                    "}
                          <div style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                            {"\n                      "}
                            <span data-no-i18n="1" style={{"fontSize":"14px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                              {I(v1.p?.name)}
                            </span>
                            {"\n                      "}
                            <span style={{"fontSize":"12px","color":"#8a867e"}}>
                              {I(v1.p?.meta)}
                            </span>
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          <button onClick={v1.p?.open} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                            Åpne
                          </button>
                          {"\n                    "}
                          <button onClick={v1.p?.del} title="Slett prosjekt" aria-label="Slett prosjekt" style={{"width":"32px","height":"32px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"17px","cursor":"pointer"}} className="scp4">
                            ×
                          </button>
                          {"\n                  "}
                        </div>
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
            </> : null}
            {"\n        "}
            {v.noProjects ? <>
              {"\n          "}
              <p style={{"margin":"0","textAlign":"center","fontSize":"13px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                Prosjektene lagres i denne nettleseren. Lagre en prosjektfil for å ta vare på dem et annet sted.
              </p>
              {"\n        "}
            </> : null}
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isFormat ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Steg 1 av 2
              </span>
              {"\n          "}
              <h2 style={{"margin":"0","fontSize":"clamp(26px, 3.6vw, 40px)","fontWeight":"600","letterSpacing":"0.06em","textTransform":"uppercase","fontStretch":"118%"}}>
                Velg format
              </h2>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(190px, 1fr))","gap":"14px"}}>
              {"\n          "}
              {list(v.formats).map(($it1, $i1) => {
                const v1 = { ...v, "f": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.f?.pick} style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"14px","padding":"22px 16px 18px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","color":"#f3f1ec","font":"inherit","cursor":"pointer"}} className="scp5">
                    {"\n              "}
                    <div style={{"width":"100px","height":"100px","display":"flex","alignItems":"center","justifyContent":"center"}}>
                      <div style={css(`width:${v1.f?.bw ?? ""}; height:${v1.f?.bh ?? ""}; border:1.5px solid #e9e7e2; border-radius:6px;`, "width:{{ f.bw }}; height:{{ f.bh }}; border:1.5px solid #e9e7e2; border-radius:6px;")} />
                    </div>
                    {"\n              "}
                    <span style={{"fontSize":"14px","fontWeight":"600"}}>
                      {I(v1.f?.name)}
                    </span>
                    {"\n              "}
                    <span style={{"fontSize":"12px","color":"#8a867e"}}>
                      {I(v1.f?.ratio)}{" · "}{I(v1.f?.size)}
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"12px","padding":"22px 16px 18px","border":"1px dashed rgba(255,255,255,0.22)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)"}}>
                {"\n            "}
                <span style={{"fontSize":"14px","fontWeight":"600"}}>
                  Egendefinert størrelse
                </span>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"6px"}}>
                  {"\n              "}
                  <input value={val(v.cw)} onChange={v.onCw} inputmode="numeric" aria-label="Bredde" style={{"width":"70px","height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","textAlign":"center","outline":"none"}} className="scp6" />
                  {"\n              "}
                  <span style={{"color":"#8a867e"}}>
                    ×
                  </span>
                  {"\n              "}
                  <input value={val(v.ch)} onChange={v.onCh} inputmode="numeric" aria-label="Høyde" style={{"width":"70px","height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","textAlign":"center","outline":"none"}} className="scp6" />
                  {"\n            "}
                </div>
                {"\n            "}
                <span style={{"fontSize":"11.5px","color":"#8a867e"}}>
                  240–4096 piksler
                </span>
                {"\n            "}
                <button onClick={v.useCustom} style={{"height":"34px","padding":"0 16px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                  Bruk størrelsen
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isTpl ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                {"Steg 2 av 2 · "}{I(v.fmtTitle)}
              </span>
              {"\n          "}
              <h2 style={{"margin":"0","fontSize":"clamp(26px, 3.6vw, 40px)","fontWeight":"600","letterSpacing":"0.06em","textTransform":"uppercase","fontStretch":"118%"}}>
                Velg mal
              </h2>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={css(`display:grid; grid-template-columns:repeat(auto-fill, minmax(${v.tplMin ?? ""}, 1fr)); gap:14px; align-items:start;`, "display:grid; grid-template-columns:repeat(auto-fill, minmax({{ tplMin }}, 1fr)); gap:14px; align-items:start;")}>
              {"\n          "}
              {list(v.tpls).map(($it1, $i1) => {
                const v1 = { ...v, "t": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.t?.pick} style={{"display":"flex","flexDirection":"column","gap":"0","padding":"0","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","overflow":"hidden"}} className="scp1">
                    {"\n              "}
                    <div style={css(`width:100%; aspect-ratio:${v1.tplAspect ?? ""}; background-color:#000; background-image:${v1.t?.imgCss ?? ""}; background-size:cover; background-position:center;`, "width:100%; aspect-ratio:{{ tplAspect }}; background-color:#000; background-image:{{ t.imgCss }}; background-size:cover; background-position:center;")} />
                    {"\n              "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"12px 14px 14px"}}>
                      {"\n                "}
                      <span style={{"fontSize":"14px","fontWeight":"600"}}>
                        {I(v1.t?.name)}
                      </span>
                      {"\n                "}
                      <span style={{"fontSize":"12px","lineHeight":"1.45","color":"#8a867e"}}>
                        {I(v1.t?.desc)}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n    "}
        </main>
        {"\n    "}
        <footer style={{"flexShrink":"0","height":"56px","display":"flex","alignItems":"center","justifyContent":"center"}}>
          <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"#b3afa6"}}>
            Design by Kristen Utvikling
          </span>
        </footer>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isEdit ? <>
        {"\n    "}
        <div data-ml-bg="static" onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={css(`position:relative; height:${v.edH ?? ""}; min-height:100dvh; display:flex; flex-direction:column; overflow:${v.edOv ?? ""}; background:#070707;`, "position:relative; height:{{ edH }}; min-height:100dvh; display:flex; flex-direction:column; overflow:{{ edOv }}; background:#070707;")}>
          {"\n      "}
          <input type="file" ref={v.fileMedia} onChange={v.onMediaFile} accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mov,.m4v,image/png,image/jpeg,image/webp,image/gif,audio/*" multiple="" style={{"display":"none"}} />
          {"\n      "}
          <input type="file" ref={v.fileSrt} onChange={v.onSrtFile} accept=".srt,text/plain" style={{"display":"none"}} />
          {"\n\n      "}
          <header style={{"flex":"0 0 auto","minHeight":"56px","display":"flex","alignItems":"center","gap":"10px","padding":"10px 14px","borderBottom":"1px solid #262626","background":"#0b0b0b","flexWrap":"wrap"}}>
            {"\n        "}
            <button onClick={v.leave} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"34px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
              <span style={{"fontSize":"15px"}}>
                ←
              </span>
              <span>
                Prosjekter
              </span>
            </button>
            {"\n        "}
            <input value={val(v.projName)} onChange={v.onName} data-no-i18n="1" aria-label="Prosjektnavn" style={{"height":"34px","flex":"0 1 240px","minWidth":"120px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","fontWeight":"600","outline":"none"}} className="scp6" />
            {"\n        "}
            <span style={{"fontSize":"12px","color":"#8a867e","whiteSpace":"nowrap"}}>
              {I(v.fmtLabel)}
            </span>
            {"\n        "}
            <span style={{"flex":"1"}} />
            {"\n        "}
            <span style={css(`font-size:12px; color:${v.savedCol ?? ""}; white-space:nowrap;`, "font-size:12px; color:{{ savedCol }}; white-space:nowrap;")}>
              {I(v.saved)}
            </span>
            {"\n        "}
            {v.showSaveBtn ? <>
              <button onClick={v.saveBrowser} title="Lagre i nettleseren (Ctrl+S)" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}} className="scp3">
                Lagre
              </button>
            </> : null}
            {"\n        "}
            <button onClick={v.toggleAutosave} role="switch" aria-checked={v.autosave} title="Lagre endringer automatisk i nettleseren" style={{"display":"flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 12px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}} className="scp7">
              <span style={css(`position:relative; flex:0 0 auto; width:26px; height:15px; border-radius:999px; background:${v.asTrack ?? ""};`, "position:relative; flex:0 0 auto; width:26px; height:15px; border-radius:999px; background:{{ asTrack }};")}>
                <span style={css(`position:absolute; top:2px; left:${v.asKnob ?? ""}; width:11px; height:11px; border-radius:50%; background:${v.asKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ asKnob }}; width:11px; height:11px; border-radius:50%; background:{{ asKnobBg }}; transition:left .16s ease;")} />
              </span>
              <span>
                Autolagring
              </span>
            </button>
            {"\n        "}
            <div style={{"display":"flex","gap":"4px"}}>
              {"\n          "}
              <button onClick={v.undo} title="Angre (Ctrl+Z)" aria-label="Angre" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; cursor:pointer; opacity:${v.undoOp ?? ""}; display:flex; align-items:center; justify-content:center;`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; cursor:pointer; opacity:{{ undoOp }}; display:flex; align-items:center; justify-content:center;")} className="scp7">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 14L4 9l5-5" />
                  <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                </svg>
              </button>
              {"\n          "}
              <button onClick={v.redo} title="Gjør om (Ctrl+Shift+Z)" aria-label="Gjør om" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; cursor:pointer; opacity:${v.redoOp ?? ""}; display:flex; align-items:center; justify-content:center;`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; cursor:pointer; opacity:{{ redoOp }}; display:flex; align-items:center; justify-content:center;")} className="scp7">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 14l5-5-5-5" />
                  <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
                </svg>
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <button onClick={v.saveFile} title="Last ned hele prosjektet med filer (Ctrl+S)" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
              {I(v.saveFileLabel)}
            </button>
            {"\n        "}
            <button onClick={v.openExport} style={{"height":"34px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
              Eksporter
            </button>
            {"\n      "}
          </header>
          {"\n\n      "}
          <div style={css(`position:relative; flex:1; min-height:0; display:grid; grid-template-columns:${v.gridCols ?? ""}; grid-template-rows:${v.gridRows ?? ""};`, "position:relative; flex:1; min-height:0; display:grid; grid-template-columns:{{ gridCols }}; grid-template-rows:{{ gridRows }};")}>
            {"\n        "}
            <aside style={css(`order:${v.ordL ?? ""}; position:${v.asPos ?? ""}; left:0; top:0; bottom:0; width:${v.asW ?? ""}; z-index:20; box-shadow:${v.asSh ?? ""}; min-height:0; overflow-y:auto; border-right:1px solid #1c1c1c; background:#0b0b0b; display:${v.lDisp ?? ""}; flex-direction:column;`, "order:{{ ordL }}; position:{{ asPos }}; left:0; top:0; bottom:0; width:{{ asW }}; z-index:20; box-shadow:{{ asSh }}; min-height:0; overflow-y:auto; border-right:1px solid #1c1c1c; background:#0b0b0b; display:{{ lDisp }}; flex-direction:column;")}>
              {"\n          "}
              <div style={{"position":"sticky","top":"0","zIndex":"2","display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"4px","padding":"6px","borderBottom":"1px solid #1c1c1c","background":"#0b0b0b"}}>
                {"\n            "}
                <button onClick={v.tab_media?.click} aria-pressed={v.tab_media?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_media?.bg ?? ""}; color:${v.tab_media?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_media.bg }}; color:{{ tab_media.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M10 9.5v5l4-2.5z" fill="currentColor" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_media?.l)}
                  </span>
                </button>
                {"\n            "}
                <button onClick={v.tab_text?.click} aria-pressed={v.tab_text?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_text?.bg ?? ""}; color:${v.tab_text?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_text.bg }}; color:{{ tab_text.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 6V4h14v2M12 4v16M9 20h6" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_text?.l)}
                  </span>
                </button>
                {"\n            "}
                <button onClick={v.tab_subs?.click} aria-pressed={v.tab_subs?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_subs?.bg ?? ""}; color:${v.tab_subs?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_subs.bg }}; color:{{ tab_subs.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M7 14h4M13 14h4M7 10.5h10" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_subs?.l)}
                  </span>
                </button>
                {"\n            "}
                <button onClick={v.tab_audio?.click} aria-pressed={v.tab_audio?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_audio?.bg ?? ""}; color:${v.tab_audio?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_audio.bg }}; color:{{ tab_audio.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_audio?.l)}
                  </span>
                </button>
                {"\n            "}
                <button onClick={v.tab_logo?.click} aria-pressed={v.tab_logo?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_logo?.bg ?? ""}; color:${v.tab_logo?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_logo.bg }}; color:{{ tab_logo.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_logo?.l)}
                  </span>
                </button>
                {"\n            "}
                <button onClick={v.tab_trans?.click} aria-pressed={v.tab_trans?.on} style={css(`min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:${v.tab_trans?.bg ?? ""}; color:${v.tab_trans?.fg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;`, "min-width:0; height:44px; padding:4px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:0; border-radius:8px; background:{{ tab_trans.bg }}; color:{{ tab_trans.fg }}; font:inherit; font-size:10.5px; font-weight:600; cursor:pointer; overflow:hidden;")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2.5" y="6" width="11" height="12" rx="1.5" />
                    <rect x="10.5" y="6" width="11" height="12" rx="1.5" fill="currentColor" fill-opacity="0.35" />
                  </svg>
                  <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.tab_trans?.l)}
                  </span>
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"14px"}}>
                {"\n            "}
                {v.tabMedia ? <>
                  {"\n              "}
                  {v.replaceMode ? <>
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","padding":"10px 12px","border":"1px solid #e9e7e2","borderRadius":"10px","background":"#141414"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","lineHeight":"1.45","color":"#f3f1ec","textWrap":"pretty"}}>
                        Velg filen som skal erstatte det valgte klippet.
                      </span>
                      {"\n                  "}
                      <button onClick={v.cancelReplace} style={{"flex":"0 0 auto","border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp8">
                        Avbryt
                      </button>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <button onClick={v.pickMedia} style={{"height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                    + Last opp video, bilder eller lyd
                  </button>
                  {"\n              "}
                  <button onClick={v.pickShared} style={{"height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Fra delt mappe
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                    Du kan også dra filer rett inn i vinduet. Filene blir i nettleseren og lastes aldri opp.
                  </span>
                  {"\n              "}
                  <button onClick={v.addColor} style={{"height":"34px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                    + Fargeflate
                  </button>
                  {"\n              "}
                  {v.hasMedia ? <>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"8px"}}>
                      {"\n                  "}
                      {list(v.mediaItems).map(($it1, $i1) => {
                        const v1 = { ...v, "m": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div onPointerDown={v1.m?.drag} style={css(`display:flex; flex-direction:column; border:1px solid ${v1.m?.border ?? ""}; border-radius:10px; background:#121212; overflow:hidden; cursor:grab; user-select:none;`, "display:flex; flex-direction:column; border:1px solid {{ m.border }}; border-radius:10px; background:#121212; overflow:hidden; cursor:grab; user-select:none;")}>
                            {"\n                      "}
                            <div onPointerEnter={v1.m?.enter} onPointerLeave={v1.m?.leave} style={css(`position:relative; aspect-ratio:16 / 10; background-color:#2a2a2a; background-image:${v1.m?.thumbCss ?? ""}; background-size:${v1.m?.fit ?? ""}; background-repeat:no-repeat; background-position:center; display:flex; align-items:center; justify-content:center; overflow:hidden;`, "position:relative; aspect-ratio:16 / 10; background-color:#2a2a2a; background-image:{{ m.thumbCss }}; background-size:{{ m.fit }}; background-repeat:no-repeat; background-position:center; display:flex; align-items:center; justify-content:center; overflow:hidden;")}>
                              {"\n                        "}
                              {v1.m?.isImg ? <>
                                <img src={v1.m?.url} alt="" draggable="false" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"contain","pointerEvents":"none"}} />
                              </> : null}
                              {"\n                        "}
                              {v1.m?.isVid ? <>
                                <video ref={v1.m?.vref} src={v1.m?.vurl} preload="metadata" playsInline={true} loop={true} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"cover","background":"#000","pointerEvents":"none"}} />
                              </> : null}
                              {"\n                        "}
                              {v1.m?.isAudio ? <>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9d998f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                  <path d="M9 18V5l12-2v13" />
                                  <circle cx="6" cy="18" r="3" />
                                  <circle cx="18" cy="16" r="3" />
                                </svg>
                              </> : null}
                              {"\n                        "}
                              <span style={{"position":"absolute","right":"5px","bottom":"5px","padding":"1px 6px","borderRadius":"4px","background":"rgba(0,0,0,0.7)","fontSize":"10.5px","color":"#f3f1ec"}}>
                                {I(v1.m?.meta)}
                              </span>
                              {"\n                        "}
                              <button onClick={v1.m?.del} title="Fjern fra biblioteket" aria-label="Fjern fra biblioteket" style={{"position":"absolute","right":"4px","top":"4px","width":"22px","height":"22px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.7)","color":"#f3f1ec","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp9">
                                ×
                              </button>
                              {"\n                      "}
                            </div>
                            {"\n                      "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"7px 8px 8px"}}>
                              {"\n                        "}
                              <span data-no-i18n="1" style={{"fontSize":"11.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                                {I(v1.m?.name)}
                              </span>
                              {"\n                        "}
                              <div style={{"display":"flex","gap":"4px"}}>
                                <button onClick={v1.m?.add} style={{"flex":"1","minWidth":"0","height":"26px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                                  {I(v1.m?.addLabel)}
                                </button>
                                {v1.m?.canOv ? <>
                                  <button onClick={v1.m?.addOv} title="Legg over hovedvideoen (bilde-i-bilde)" style={{"flex":"1","minWidth":"0","height":"26px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                                    Overlegg
                                  </button>
                                </> : null}
                              </div>
                              {"\n                      "}
                            </div>
                            {"\n                    "}
                          </div>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.tabText ? <>
                  {"\n              "}
                  <span style={{"fontSize":"12px","lineHeight":"1.5","color":"#9d998f","textWrap":"pretty"}}>
                    Legges til ved spillehodet. Dra teksten i forhåndsvisningen for å flytte den.
                  </span>
                  {"\n              "}
                  {list(v.presets).map(($it1, $i1) => {
                    const v1 = { ...v, "pr": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.pr?.click} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp3">
                        {"\n                  "}
                        <span style={{"fontSize":"13px","fontWeight":"700"}}>
                          {I(v1.pr?.l)}
                        </span>
                        {"\n                  "}
                        <span style={{"fontSize":"11.5px","color":"#8a867e"}}>
                          {I(v1.pr?.d)}
                        </span>
                        {"\n                "}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.tabSubs ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      Lag med AI
                    </span>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      Talen i videoklippene gjøres om til tekst i nettleseren. Første gang lastes talemodellen ned.
                    </span>
                    {"\n                "}
                    <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b"}}>
                      {"\n                  "}
                      {list(v.aiLangs).map(($it1, $i1) => {
                        const v1 = { ...v, "g": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.g?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.g?.bg ?? ""}; color:${v1.g?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ g.bg }}; color:{{ g.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                            {I(v1.g?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b"}}>
                      {"\n                  "}
                      {list(v.aiModels).map(($it1, $i1) => {
                        const v1 = { ...v, "g": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.g?.click} title={v1.g?.t} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.g?.bg ?? ""}; color:${v1.g?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ g.bg }}; color:{{ g.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                            {I(v1.g?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button onClick={v.runAI} style={css(`height:36px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.aiOp ?? ""};`, "height:36px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ aiOp }};")} className="scp2">
                      {I(v.aiLabel)}
                    </button>
                    {"\n                "}
                    {v.hasAiMsg ? <>
                      <span style={css(`font-size:12px; line-height:1.5; color:${v.aiMsgColor ?? ""}; text-wrap:pretty;`, "font-size:12px; line-height:1.5; color:{{ aiMsgColor }}; text-wrap:pretty;")}>
                        {I(v.aiMsg)}
                      </span>
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                    {"\n                "}
                    <button onClick={v.addSub} style={{"height":"32px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                      + Ved spillehodet
                    </button>
                    {"\n                "}
                    <button onClick={v.pickSrt} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                      Importer .srt
                    </button>
                    {"\n                "}
                    {v.hasSubs ? <>
                      <button onClick={v.downloadSrt} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                        Last ned .srt
                      </button>
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.hasSubs ? <>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      {list(v.subsList).map(($it1, $i1) => {
                        const v1 = { ...v, "s": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div style={css(`display:flex; align-items:flex-start; gap:6px; padding:6px; border:1px solid ${v1.s?.border ?? ""}; border-radius:8px; background:#121212;`, "display:flex; align-items:flex-start; gap:6px; padding:6px; border:1px solid {{ s.border }}; border-radius:8px; background:#121212;")}>
                            {"\n                      "}
                            <button onClick={v1.s?.seek} title="Gå til" style={{"flex":"0 0 auto","width":"50px","height":"26px","padding":"0","border":"0","borderRadius":"6px","background":"#0b0b0b","color":"#9d998f","font":"inherit","fontSize":"11px","fontVariantNumeric":"tabular-nums","cursor":"pointer"}} className="scp8">
                              {I(v1.s?.time)}
                            </button>
                            {"\n                      "}
                            <textarea value={val(v1.s?.text)} onChange={v1.s?.onText} onFocus={v1.s?.focus} rows="2" style={{"flex":"1","minWidth":"0","padding":"4px 6px","border":"1px solid transparent","borderRadius":"6px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","lineHeight":"1.4","resize":"vertical","outline":"none"}} className="scpa" />
                            {"\n                      "}
                            <button onClick={v1.s?.del} title="Slett" aria-label="Slett" style={{"flex":"0 0 auto","width":"24px","height":"24px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp9">
                              ×
                            </button>
                            {"\n                    "}
                          </div>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"12px","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"8px"}}>
                      Utseende
                    </span>
                    {"\n                "}
                    {list(v.subFields).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          {v1.f?.isRange ? <>
                            {"\n                      "}
                            <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                <span style={{"fontWeight":"600"}}>
                                  {I(v1.f?.label)}
                                </span>
                                <span>
                                  {I(v1.f?.show)}
                                </span>
                              </span>
                              <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                            </label>
                            {"\n                    "}
                          </> : null}
                          {"\n                    "}
                          {v1.f?.isColor ? <>
                            {"\n                      "}
                            <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {I(v1.f?.label)}
                              </span>
                              <span data-keep-color="1" style={{"display":"flex"}}>
                                <input type="color" value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"width":"40px","height":"28px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"6px","background":"transparent","cursor":"pointer"}} />
                              </span>
                            </label>
                            {"\n                    "}
                          </> : null}
                          {"\n                    "}
                          {v1.f?.isSelect ? <>
                            {"\n                      "}
                            <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {I(v1.f?.label)}
                              </span>
                              <select value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"height":"32px","maxWidth":"60%","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","outline":"none"}}>
                                {list(v1.f?.options).map(($it2, $i2) => {
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
                          </> : null}
                          {"\n                    "}
                          {v1.f?.isToggle ? <>
                            {"\n                      "}
                            <button onClick={v1.f?.toggle} role="switch" aria-checked={v1.f?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textAlign":"left"}}>
                              <span>
                                {I(v1.f?.label)}
                              </span>
                              <span data-keep-color="1" style={css(`position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:${v1.f?.trackBg ?? ""}; transition:background .2s;`, "position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:{{ f.trackBg }}; transition:background .2s;")}>
                                <span style={css(`position:absolute; top:2px; left:${v1.f?.knobL ?? ""}; width:16px; height:16px; border-radius:50%; background:${v1.f?.knobBg ?? ""}; transition:left .2s;`, "position:absolute; top:2px; left:{{ f.knobL }}; width:16px; height:16px; border-radius:50%; background:{{ f.knobBg }}; transition:left .2s;")} />
                              </span>
                            </button>
                            {"\n                    "}
                          </> : null}
                          {"\n                    "}
                          {v1.f?.isSeg ? <>
                            {"\n                      "}
                            <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                              {I(v1.f?.label)}
                            </span>
                            {"\n                      "}
                            <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b"}}>
                              {list(v1.f?.segs).map(($it2, $i2) => {
                                const v2 = { ...v1, "g": $it2, $index: $i2 };
                                return <React.Fragment key={$i2}>
                                  <button onClick={v2.g?.click} style={css(`flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:${v2.g?.bg ?? ""}; color:${v2.g?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:{{ g.bg }}; color:{{ g.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                                    {I(v2.g?.l)}
                                  </button>
                                </React.Fragment>;
                              })}
                            </div>
                            {"\n                    "}
                          </> : null}
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.tabAudio ? <>
                  {"\n              "}
                  <button onClick={v.pickMusic} style={{"height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                    + Last opp musikk
                  </button>
                  {"\n              "}
                  <button onClick={v.toggleVo} style={css(`height:40px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid ${v.voBorder ?? ""}; border-radius:999px; background:${v.voBg ?? ""}; color:#f3f1ec; font:inherit; font-size:13px; font-weight:700; cursor:pointer;`, "height:40px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid {{ voBorder }}; border-radius:999px; background:{{ voBg }}; color:#f3f1ec; font:inherit; font-size:13px; font-weight:700; cursor:pointer;")}>
                    <span style={{"width":"9px","height":"9px","borderRadius":"50%","background":"#ff5a36"}} />
                    <span>
                      {I(v.voLabel)}
                    </span>
                    <span data-no-i18n="1" style={{"fontVariantNumeric":"tabular-nums","color":"#c9c5bc"}}>
                      {I(v.voTime)}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                    Bruk hodetelefoner mens du tar opp. Opptaket starter ved spillehodet og legges på lydsporet.
                  </span>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                    Bruk bare musikk du har rett til å bruke. Lyden i videoklippene justerer du på hvert klipp.
                  </span>
                  {"\n              "}
                  {v.hasMusic ? <>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"6px"}}>
                      På tidslinjen
                    </span>
                    {"\n                "}
                    {list(v.musicList).map(($it1, $i1) => {
                      const v1 = { ...v, "a": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.a?.click} style={css(`display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid ${v1.a?.border ?? ""}; border-radius:10px; background:#121212; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid {{ a.border }}; border-radius:10px; background:#121212; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;")} className="scp3">
                          {"\n                    "}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9d998f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style={{"flex":"0 0 auto"}}>
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v1.a?.name)}
                          </span>
                          {"\n                    "}
                          <span style={{"fontSize":"11px","color":"#8a867e"}}>
                            {I(v1.a?.meta)}
                          </span>
                          {"\n                  "}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.hasAudioLib ? <>
                    {"\n                "}
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"6px"}}>
                      I biblioteket
                    </span>
                    {"\n                "}
                    {list(v.audioLib).map(($it1, $i1) => {
                      const v1 = { ...v, "a": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.a?.drag} style={{"display":"flex","alignItems":"center","gap":"8px","padding":"8px 8px 8px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","cursor":"grab","userSelect":"none"}}>
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12.5px","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v1.a?.name)}
                          </span>
                          {"\n                    "}
                          <span style={{"fontSize":"11px","color":"#8a867e"}}>
                            {I(v1.a?.meta)}
                          </span>
                          {"\n                    "}
                          <button onClick={v1.a?.add} style={{"height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                            Legg til
                          </button>
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.tabTrans ? <>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                    Dra en overgang ned på videosporet. Den fester seg mellom to klipp, i starten eller på slutten. Du kan også velge et klipp og trykke på en overgang.
                  </span>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"8px"}}>
                    {"\n                "}
                    {list(v.transTiles).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onPointerDown={v1.t?.down} style={css(`display:flex; flex-direction:column; gap:6px; padding:6px 6px 8px; border:1px solid ${v1.t?.border ?? ""}; border-radius:10px; background:#121212; color:#f3f1ec; font:inherit; font-size:11.5px; font-weight:600; text-align:left; cursor:grab; touch-action:none; user-select:none;`, "display:flex; flex-direction:column; gap:6px; padding:6px 6px 8px; border:1px solid {{ t.border }}; border-radius:10px; background:#121212; color:#f3f1ec; font:inherit; font-size:11.5px; font-weight:600; text-align:left; cursor:grab; touch-action:none; user-select:none;")} className="scp3">
                          {"\n                    "}
                          <div style={css(`width:100%; aspect-ratio:16 / 10; border-radius:6px; background:${v1.t?.bg ?? ""}; pointer-events:none;`, "width:100%; aspect-ratio:16 / 10; border-radius:6px; background:{{ t.bg }}; pointer-events:none;")} />
                          {"\n                    "}
                          <span style={{"padding":"0 2px","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.t?.l)}
                          </span>
                          {"\n                  "}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.tabLogo ? <>
                  {"\n              "}
                  {list(v.logoFields).map(($it1, $i1) => {
                    const v1 = { ...v, "f": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                        {"\n                  "}
                        {v1.f?.isRange ? <>
                          {"\n                    "}
                          <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {I(v1.f?.label)}
                              </span>
                              <span>
                                {I(v1.f?.show)}
                              </span>
                            </span>
                            <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                          {"\n                  "}
                        </> : null}
                        {"\n                  "}
                        {v1.f?.isToggle ? <>
                          {"\n                    "}
                          <button onClick={v1.f?.toggle} role="switch" aria-checked={v1.f?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textAlign":"left"}}>
                            <span>
                              {I(v1.f?.label)}
                            </span>
                            <span data-keep-color="1" style={css(`position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:${v1.f?.trackBg ?? ""}; transition:background .2s;`, "position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:{{ f.trackBg }}; transition:background .2s;")}>
                              <span style={css(`position:absolute; top:2px; left:${v1.f?.knobL ?? ""}; width:16px; height:16px; border-radius:50%; background:${v1.f?.knobBg ?? ""}; transition:left .2s;`, "position:absolute; top:2px; left:{{ f.knobL }}; width:16px; height:16px; border-radius:50%; background:{{ f.knobBg }}; transition:left .2s;")} />
                            </span>
                          </button>
                          {"\n                  "}
                        </> : null}
                        {"\n                  "}
                        {v1.f?.isSeg ? <>
                          {"\n                    "}
                          <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                            {I(v1.f?.label)}
                          </span>
                          {"\n                    "}
                          <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b"}}>
                            {list(v1.f?.segs).map(($it2, $i2) => {
                              const v2 = { ...v1, "g": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <button onClick={v2.g?.click} style={css(`flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:${v2.g?.bg ?? ""}; color:${v2.g?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:{{ g.bg }}; color:{{ g.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                                  {I(v2.g?.l)}
                                </button>
                              </React.Fragment>;
                            })}
                          </div>
                          {"\n                  "}
                        </> : null}
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"6px"}}>
                    Velg logo
                  </span>
                  {"\n              "}
                  <div data-keep-color="1" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"8px"}}>
                    {"\n                "}
                    <button onClick={v.noLogo} title="Ingen logo" aria-label="Ingen logo" style={css(`aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; padding:6px; border:2px solid ${v.noLogoBorder ?? ""}; border-radius:10px; background:#2a2a2a; color:#c9c5bc; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer;`, "aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; padding:6px; border:2px solid {{ noLogoBorder }}; border-radius:10px; background:#2a2a2a; color:#c9c5bc; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer;")} className="scpb">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M6 18L18 6" />
                      </svg>
                      <span>
                        Ingen
                      </span>
                    </button>
                    {"\n                "}
                    {list(v.logoOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "o": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.o?.pick} title={v1.o?.name} style={css(`aspect-ratio:1; padding:8px; border:2px solid ${v1.o?.border ?? ""}; border-radius:10px; background-color:#2a2a2a; background-image:${v1.o?.css ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; background-origin:content-box; cursor:pointer;`, "aspect-ratio:1; padding:8px; border:2px solid {{ o.border }}; border-radius:10px; background-color:#2a2a2a; background-image:{{ o.css }}; background-size:contain; background-repeat:no-repeat; background-position:center; background-origin:content-box; cursor:pointer;")} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <button onClick={v.pickLogo} style={{"aspectRatio":"1","border":"1px dashed #555","borderRadius":"10px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                      + Last opp
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </aside>
            {"\n\n        "}
            <section style={css(`order:${v.ordC ?? ""}; grid-column:${v.cSpan ?? ""}; min-width:0; min-height:0; display:flex; flex-direction:column;`, "order:{{ ordC }}; grid-column:{{ cSpan }}; min-width:0; min-height:0; display:flex; flex-direction:column;")}>
              {"\n          "}
              <div ref={v.stageRef} style={css(`flex:1; height:${v.stageH ?? ""}; min-height:0; position:relative; display:flex; align-items:center; justify-content:center; padding:${v.stagePad ?? ""}; overflow:hidden; background:#050505;`, "flex:1; height:{{ stageH }}; min-height:0; position:relative; display:flex; align-items:center; justify-content:center; padding:{{ stagePad }}; overflow:hidden; background:#050505;")}>
                {"\n            "}
                <canvas ref={v.canvasRef} width={v.cvW} height={v.cvH} onPointerDown={v.canvasDown} onContextMenu={v.canvasCtx} onDoubleClick={v.canvasDbl} onPointerMove={v.canvasMove} style={css(`width:${v.cvCssW ?? ""}; height:${v.cvCssH ?? ""}; background:#000; box-shadow:0 10px 40px rgba(0,0,0,0.6); touch-action:none; display:block;`, "width:{{ cvCssW }}; height:{{ cvCssH }}; background:#000; box-shadow:0 10px 40px rgba(0,0,0,0.6); touch-action:none; display:block;")} />
                {"\n            "}
                {v.dragOver ? <>
                  {"\n              "}
                  <div style={{"position":"absolute","inset":"10px","border":"2px dashed #e9e7e2","borderRadius":"14px","background":"rgba(0,0,0,0.6)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600","pointerEvents":"none"}}>
                    Slipp filene for å legge dem til
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"flex":"0 0 auto","display":"flex","alignItems":"center","gap":"8px","padding":"8px 12px","borderTop":"1px solid #1c1c1c","background":"#0b0b0b","flexWrap":"nowrap","overflow":"hidden"}}>
                {"\n            "}
                <button onClick={v.toStart} title="Til start (Home)" aria-label="Til start" style={{"flex":"0 0 auto","width":"34px","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scp7">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="3" height="16" />
                    <path d="M20 4v16L8 12z" />
                  </svg>
                </button>
                {"\n            "}
                <button onClick={v.togglePlay} title="Spill av / pause (mellomrom)" aria-label={v.playLabel} style={{"flex":"0 0 auto","width":"40px","height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scp2">
                  {"\n              "}
                  {v.isPaused ? <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4v16l13-8z" />
                    </svg>
                  </> : null}
                  {"\n              "}
                  {v.isPlaying ? <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  </> : null}
                  {"\n            "}
                </button>
                {"\n            "}
                <span ref={v.timeRef} data-no-i18n="1" style={{"flex":"0 1 auto","minWidth":"0","whiteSpace":"nowrap","overflow":"hidden","fontSize":"13px","fontVariantNumeric":"tabular-nums","color":"#c9c5bc"}}>
                  {I(v.timeLabel)}
                </span>
                {"\n            "}
                {v.narrow ? <>
                  {"\n              "}
                  <button onClick={v.drL} style={css(`flex:0 0 auto; height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:${v.drLBg ?? ""}; color:${v.drLFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:0 0 auto; height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:{{ drLBg }}; color:{{ drLFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                    Legg til
                  </button>
                  {"\n              "}
                  <button onClick={v.drR} style={css(`flex:0 0 auto; height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:${v.drRBg ?? ""}; color:${v.drRFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:0 0 auto; height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:{{ drRBg }}; color:{{ drRFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                    Egenskaper
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button onClick={v.split} title="Del ved spillehodet (S)" aria-label="Del ved spillehodet" style={{"flex":"0 0 auto","height":"32px","padding":"0 12px","display":"flex","alignItems":"center","gap":"6px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}} className="scp7">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
                  </svg>
                  {v.wide ? <>
                    <span>
                      Del
                    </span>
                  </> : null}
                </button>
                {"\n            "}
                <button onClick={v.toggleMarker} title="Markør ved spillehodet (M). Dobbeltklikk på en markør for å fjerne den." aria-label={v.mkLabel} style={{"flex":"0 0 auto","height":"32px","padding":"0 12px","display":"flex","alignItems":"center","gap":"6px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}} className="scp7">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5a36">
                    <path d="M12 2l10 10-10 10L2 12z" />
                  </svg>
                  {v.wide ? <>
                    <span>
                      {I(v.mkLabel)}
                    </span>
                  </> : null}
                </button>
                {"\n            "}
                <span style={{"flex":"1 1 0","minWidth":"0"}} />
                {"\n            "}
                {v.wide ? <>
                  <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                    Mellomrom: spill av · S: del · M: markør · Ctrl+C/V: kopier/lim inn · Delete: slett
                  </span>
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </section>
            {"\n\n        "}
            <aside style={css(`order:${v.ordR ?? ""}; position:${v.asPos ?? ""}; right:0; top:0; bottom:0; width:${v.asW ?? ""}; z-index:20; box-shadow:${v.asSh ?? ""}; min-height:0; overflow-y:auto; border-left:1px solid #1c1c1c; background:#0b0b0b; display:${v.rDisp ?? ""}; flex-direction:column; gap:14px; padding:14px;`, "order:{{ ordR }}; position:{{ asPos }}; right:0; top:0; bottom:0; width:{{ asW }}; z-index:20; box-shadow:{{ asSh }}; min-height:0; overflow-y:auto; border-left:1px solid #1c1c1c; background:#0b0b0b; display:{{ rDisp }}; flex-direction:column; gap:14px; padding:14px;")}>
              {"\n          "}
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"11.5px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase","color":"#9d998f"}}>
                  {I(v.propTitle)}
                </span>
                {"\n            "}
                {v.hasSel ? <>
                  <button onClick={v.deselect} style={{"border":"0","padding":"0","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"12px","cursor":"pointer"}} className="scp8">
                    Fjern valg
                  </button>
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              {v.hasActions ? <>
                {"\n            "}
                <div style={{"display":"flex","gap":"6px","flexWrap":"wrap","paddingBottom":"12px","borderBottom":"1px solid #1c1c1c"}}>
                  {"\n              "}
                  {list(v.actions).map(($it1, $i1) => {
                    const v1 = { ...v, "a": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.a?.click} style={css(`height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:${v1.a?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:32px; padding:0 12px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:{{ a.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")} className="scp7">
                        {I(v1.a?.l)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.hasPropNote ? <>
                <span style={{"fontSize":"12px","lineHeight":"1.55","color":"#8a867e","textWrap":"pretty"}}>
                  {I(v.propNote)}
                </span>
              </> : null}
              {"\n          "}
              {list(v.fields).map(($it1, $i1) => {
                const v1 = { ...v, "f": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    {"\n              "}
                    {v1.f?.isHead ? <>
                      <button onClick={v1.f?.click} aria-expanded={v1.f?.open} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","width":"100%","marginTop":"2px","padding":"10px 0 2px","border":"0","borderTop":"1px solid #1c1c1c","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","textAlign":"left","cursor":"pointer"}} className="scp8">
                        <span>
                          {I(v1.f?.label)}
                        </span>
                        <span style={{"fontSize":"12px","letterSpacing":"0"}}>
                          {I(v1.f?.arrow)}
                        </span>
                      </button>
                    </> : null}
                    {"\n              "}
                    {v1.f?.isNote ? <>
                      <span style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                        {I(v1.f?.label)}
                      </span>
                    </> : null}
                    {"\n              "}
                    {v1.f?.isArea ? <>
                      {"\n                "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {I(v1.f?.label)}
                      </span>
                      {"\n                "}
                      <textarea value={val(v1.f?.val)} onChange={v1.f?.onInput} rows="3" style={{"width":"100%","padding":"8px 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","lineHeight":"1.45","resize":"vertical","outline":"none"}} className="scp6" />
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isCurve ? <>
                      {"\n                "}
                      <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                        {"\n                  "}
                        <div style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"10px"}}>
                          {"\n                    "}
                          {list(v1.f?.chans).map(($it2, $i2) => {
                            const v2 = { ...v1, "c": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              <button onClick={v2.c?.click} title={v2.c?.title} aria-label={v2.c?.title} style={css(`width:22px; height:22px; padding:0; border:2px solid ${v2.c?.ring ?? ""}; border-radius:50%; background:${v2.c?.col ?? ""}; box-shadow:inset 0 0 0 2px #0b0b0b; transform:${v2.c?.sc ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:2px solid {{ c.ring }}; border-radius:50%; background:{{ c.col }}; box-shadow:inset 0 0 0 2px #0b0b0b; transform:{{ c.sc }}; cursor:pointer;")} />
                            </React.Fragment>;
                          })}
                          {"\n                  "}
                        </div>
                        {"\n                  "}
                        <canvas ref={v1.f?.cvRef} onPointerDown={v1.f?.cvDown} onDoubleClick={v1.f?.cvDbl} onContextMenu={v1.f?.cvCtx} style={{"width":"100%","aspectRatio":"1","display":"block","borderRadius":"8px","touchAction":"none","cursor":"crosshair"}} />
                        {"\n                  "}
                        <span style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                          Klikk på linjen for å legge til et punkt. Dobbeltklikk, høyreklikk eller dra punktet ut av feltet for å fjerne det.
                        </span>
                        {"\n                  "}
                        <div style={{"display":"flex","gap":"6px"}}>
                          <button onClick={v1.f?.resetCh} style={{"flex":"1","height":"28px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                            Nullstill kanal
                          </button>
                          <button onClick={v1.f?.resetAll} style={{"flex":"1","height":"28px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                            Nullstill alle
                          </button>
                        </div>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isRange ? <>
                      {"\n                "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                        <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                          <span style={{"fontWeight":"600"}}>
                            {I(v1.f?.label)}
                          </span>
                          <span>
                            {I(v1.f?.show)}
                          </span>
                        </span>
                        <input type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      </label>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isNum ? <>
                      {"\n                "}
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {I(v1.f?.label)}
                        </span>
                        <input type="number" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.onInput} onBlur={v1.f?.onBlur} style={{"width":"96px","height":"30px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontVariantNumeric":"tabular-nums","outline":"none"}} className="scp6" />
                      </label>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isColor ? <>
                      {"\n                "}
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {I(v1.f?.label)}
                        </span>
                        <span data-keep-color="1" style={{"display":"flex"}}>
                          <input type="color" value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"width":"40px","height":"28px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"6px","background":"transparent","cursor":"pointer"}} />
                        </span>
                      </label>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isSelect ? <>
                      {"\n                "}
                      <label style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {I(v1.f?.label)}
                        </span>
                        <select value={val(v1.f?.val)} onChange={v1.f?.onInput} style={{"height":"32px","maxWidth":"62%","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","outline":"none"}}>
                          {list(v1.f?.options).map(($it2, $i2) => {
                            const v2 = { ...v1, "o": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              <option value={val(v2.o?.v)}>
                                {I(v2.o?.l)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                      </label>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isToggle ? <>
                      {"\n                "}
                      <button onClick={v1.f?.toggle} role="switch" aria-checked={v1.f?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textAlign":"left"}}>
                        <span>
                          {I(v1.f?.label)}
                        </span>
                        <span data-keep-color="1" style={css(`position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:${v1.f?.trackBg ?? ""}; transition:background .2s;`, "position:relative; flex:0 0 auto; width:36px; height:20px; border-radius:999px; background:{{ f.trackBg }}; transition:background .2s;")}>
                          <span style={css(`position:absolute; top:2px; left:${v1.f?.knobL ?? ""}; width:16px; height:16px; border-radius:50%; background:${v1.f?.knobBg ?? ""}; transition:left .2s;`, "position:absolute; top:2px; left:{{ f.knobL }}; width:16px; height:16px; border-radius:50%; background:{{ f.knobBg }}; transition:left .2s;")} />
                        </span>
                      </button>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                    {v1.f?.isSeg ? <>
                      {"\n                "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {I(v1.f?.label)}
                      </span>
                      {"\n                "}
                      <div style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0b0b0b"}}>
                        {list(v1.f?.segs).map(($it2, $i2) => {
                          const v2 = { ...v1, "g": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            <button onClick={v2.g?.click} style={css(`flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:${v2.g?.bg ?? ""}; color:${v2.g?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "flex:1; min-width:0; height:28px; padding:0 6px; border:0; border-radius:999px; background:{{ g.bg }}; color:{{ g.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                              {I(v2.g?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n              "}
                    </> : null}
                    {"\n            "}
                  </div>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </aside>
            {"\n      "}
          </div>
          {"\n\n      "}
          <section style={css(`flex:0 0 auto; display:flex; flex-direction:column; max-height:${v.tlMaxH ?? ""}; border-top:1px solid #262626; background:#0b0b0b;`, "flex:0 0 auto; display:flex; flex-direction:column; max-height:{{ tlMaxH }}; border-top:1px solid #262626; background:#0b0b0b;")}>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"6px","padding":"8px 12px","flexWrap":"wrap"}}>
              {"\n          "}
              <button onClick={v.zoomOut} title="Zoom ut" aria-label="Zoom ut" style={{"width":"30px","height":"30px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                −
              </button>
              {"\n          "}
              <button onClick={v.zoomIn} title="Zoom inn" aria-label="Zoom inn" style={{"width":"30px","height":"30px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                +
              </button>
              {"\n          "}
              <button onClick={v.fitZoom} style={{"height":"30px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                Vis alt
              </button>
              {"\n          "}
              <span style={{"flex":"1"}} />
              {"\n          "}
              <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                Dra i kantene for å klippe. Shift-klikk for å velge flere. M: markør.
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"flex":"1 1 auto","minHeight":"0","overflowY":"auto","display":"grid","gridTemplateColumns":"128px minmax(0, 1fr)","borderTop":"1px solid #1c1c1c"}}>
              {"\n          "}
              <div style={{"borderRight":"1px solid #1c1c1c","fontSize":"11px","fontWeight":"600","color":"#8a867e"}}>
                {"\n            "}
                <div style={{"height":"24px","borderBottom":"1px solid #262626"}} />
                {"\n            "}
                {list(v.trackRows).map(($it1, $i1) => {
                  const v1 = { ...v, "r": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={css(`height:${v1.r?.h ?? ""}; display:flex; flex-direction:column; padding-top:${v1.r?.pt ?? ""}; border-bottom:1px solid #1c1c1c; opacity:${v1.r?.op ?? ""};`, "height:{{ r.h }}; display:flex; flex-direction:column; padding-top:{{ r.pt }}; border-bottom:1px solid #1c1c1c; opacity:{{ r.op }};")}>
                      {"\n                "}
                      <div style={css(`height:${v1.r?.lh ?? ""}; flex:0 0 auto; padding:0 4px 0 10px; display:flex; align-items:center; gap:2px;`, "height:{{ r.lh }}; flex:0 0 auto; padding:0 4px 0 10px; display:flex; align-items:center; gap:2px;")}>
                        {"\n                "}
                        <span style={{"flex":"1","minWidth":"0","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.r?.name)}
                        </span>
                        {"\n                "}
                        {v1.r?.canAdd ? <>
                          <button onClick={v1.r?.addLane} title="Legg til lag" aria-label="Legg til lag" style={{"flex":"0 0 auto","width":"20px","height":"20px","padding":"0","border":"0","borderRadius":"6px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"15px","lineHeight":"1","cursor":"pointer"}} className="scpc">
                            +
                          </button>
                        </> : null}
                        {"\n                "}
                        <button onClick={v1.r?.toggleHide} title={v1.r?.hideTitle} aria-label={v1.r?.hideTitle} style={css(`flex:0 0 auto; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.r?.hideFg ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex:0 0 auto; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ r.hideFg }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scpd">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        {"\n                "}
                        <button onClick={v1.r?.toggleLock} title={v1.r?.lockTitle} aria-label={v1.r?.lockTitle} style={css(`flex:0 0 auto; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.r?.lockFg ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex:0 0 auto; width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ r.lockFg }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scpd">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        </button>
                        {"\n                "}
                        <button onClick={v1.r?.clear} title={v1.r?.clearTitle} aria-label={v1.r?.clearTitle} style={{"flex":"0 0 auto","width":"20px","height":"20px","padding":"0","border":"0","borderRadius":"6px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"14px","lineHeight":"1","cursor":"pointer"}} className="scpe">
                          ×
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {list(v1.r?.extra).map(($it2, $i2) => {
                        const v2 = { ...v1, "x": $it2, $index: $i2 };
                        return <React.Fragment key={$i2}>
                          <div style={css(`height:${v2.x?.h ?? ""}; flex:0 0 auto; display:flex; align-items:center; gap:4px; padding:0 4px 0 18px; color:#6f6b64; font-weight:500;`, "height:{{ x.h }}; flex:0 0 auto; display:flex; align-items:center; gap:4px; padding:0 4px 0 18px; color:#6f6b64; font-weight:500;")}>
                            <span style={{"flex":"1","minWidth":"0","display":"flex","gap":"4px"}}>
                              <span>
                                Lag
                              </span>
                              <span data-no-i18n="1">
                                {I(v2.x?.num)}
                              </span>
                            </span>
                            <button onClick={v2.x?.del} title="Fjern lag" aria-label="Fjern lag" style={{"flex":"0 0 auto","width":"20px","height":"20px","padding":"0","border":"0","borderRadius":"6px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"14px","lineHeight":"1","cursor":"pointer"}} className="scpe">
                              ×
                            </button>
                          </div>
                        </React.Fragment>;
                      })}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n          "}
              <div ref={v.tlRef} style={{"overflowX":"auto","overflowY":"hidden","minWidth":"0"}}>
                {"\n            "}
                <div ref={v.tlInner} style={css(`position:relative; width:${v.tlW ?? ""}; min-width:100%;`, "position:relative; width:{{ tlW }}; min-width:100%;")}>
                  {"\n              "}
                  <div onPointerDown={v.rulerDown} style={{"position":"relative","height":"24px","borderBottom":"1px solid #262626","cursor":"pointer","overflow":"hidden"}}>
                    {"\n                "}
                    {list(v.ticks).map(($it1, $i1) => {
                      const v1 = { ...v, "k": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div data-no-i18n="1" style={css(`position:absolute; left:${v1.k?.left ?? ""}; top:0; bottom:0; padding:5px 0 0 4px; border-left:1px solid #333333; font-size:10.5px; color:#6f6b64; font-variant-numeric:tabular-nums; pointer-events:none;`, "position:absolute; left:{{ k.left }}; top:0; bottom:0; padding:5px 0 0 4px; border-left:1px solid #333333; font-size:10.5px; color:#6f6b64; font-variant-numeric:tabular-nums; pointer-events:none;")}>
                          {I(v1.k?.label)}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    {list(v.markers).map(($it1, $i1) => {
                      const v1 = { ...v, "k": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onPointerDown={v1.k?.down} onContextMenu={v1.k?.del} onDoubleClick={v1.k?.del} title={v1.k?.title} aria-label={v1.k?.title} style={css(`position:absolute; left:${v1.k?.left ?? ""}; top:3px; width:11px; height:11px; margin-left:-5px; padding:0; border:0; border-radius:2px; transform:rotate(45deg); background:${v1.k?.color ?? ""}; cursor:pointer; z-index:3;`, "position:absolute; left:{{ k.left }}; top:3px; width:11px; height:11px; margin-left:-5px; padding:0; border:0; border-radius:2px; transform:rotate(45deg); background:{{ k.color }}; cursor:pointer; z-index:3;")} />
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div onPointerDown={v.rowDown} onContextMenu={v.rowCtx} style={css(`position:relative; height:${v.rowTextH ?? ""}; border-bottom:1px solid #1c1c1c;`, "position:relative; height:{{ rowTextH }}; border-bottom:1px solid #1c1c1c;")}>
                    {"\n                "}
                    {list(v.textBlocks).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.b?.down} onContextMenu={v1.b?.ctx} style={css(`position:absolute; left:${v1.b?.left ?? ""}; top:${v1.b?.top ?? ""}; width:${v1.b?.width ?? ""}; height:22px; border:1.5px solid ${v1.b?.border ?? ""}; border-radius:5px; background:#3b3368; overflow:hidden; cursor:grab; touch-action:none;`, "position:absolute; left:{{ b.left }}; top:{{ b.top }}; width:{{ b.width }}; height:22px; border:1.5px solid {{ b.border }}; border-radius:5px; background:#3b3368; overflow:hidden; cursor:grab; touch-action:none;")}>
                          {v1.b?.linked ? <>
                            <div style={css(`position:absolute; left:0; right:0; bottom:0; height:3px; background:${v1.b?.linkCol ?? ""}; z-index:2; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:3px; background:{{ b.linkCol }}; z-index:2; pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"8px","right":"8px","top":"3px","fontSize":"11px","fontWeight":"600","color":"#ffffff","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.b?.label)}
                          </span>
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downL} style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downR} style={{"position":"absolute","right":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div ref={v.ovRowRef} onPointerDown={v.rowDown} onContextMenu={v.rowCtx} style={css(`position:relative; height:${v.rowOvH ?? ""}; border-bottom:1px solid #1c1c1c;`, "position:relative; height:{{ rowOvH }}; border-bottom:1px solid #1c1c1c;")}>
                    {"\n                "}
                    {v.mhOv ? <>
                      <div style={css(`position:absolute; left:${v.mhOvL ?? ""}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;`, "position:absolute; left:{{ mhOvL }}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;")} />
                    </> : null}
                    {"\n                "}
                    {list(v.ovBlocks).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.b?.down} onContextMenu={v1.b?.ctx} style={css(`position:absolute; left:${v1.b?.left ?? ""}; top:${v1.b?.top ?? ""}; width:${v1.b?.width ?? ""}; height:34px; border:1.5px solid ${v1.b?.border ?? ""}; border-radius:5px; background-color:#3a2440; background-image:${v1.b?.bg ?? ""}; background-size:auto 100%; background-repeat:repeat-x; overflow:hidden; cursor:grab; touch-action:none;`, "position:absolute; left:{{ b.left }}; top:{{ b.top }}; width:{{ b.width }}; height:34px; border:1.5px solid {{ b.border }}; border-radius:5px; background-color:#3a2440; background-image:{{ b.bg }}; background-size:auto 100%; background-repeat:repeat-x; overflow:hidden; cursor:grab; touch-action:none;")}>
                          {v1.b?.linked ? <>
                            <div style={css(`position:absolute; left:0; right:0; bottom:0; height:3px; background:${v1.b?.linkCol ?? ""}; z-index:2; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:3px; background:{{ b.linkCol }}; z-index:2; pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"8px","right":"8px","top":"4px","fontSize":"11px","fontWeight":"600","color":"#ffffff","textShadow":"0 1px 3px #000","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.b?.label)}
                          </span>
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downL} style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downR} style={{"position":"absolute","right":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div ref={v.clipRowRef} onPointerDown={v.rowDown} onContextMenu={v.rowCtx} style={{"position":"relative","height":"60px","borderBottom":"1px solid #1c1c1c"}}>
                    {"\n                "}
                    {v.mhClip ? <>
                      <div style={css(`position:absolute; left:${v.mhClipL ?? ""}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;`, "position:absolute; left:{{ mhClipL }}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;")} />
                    </> : null}
                    {"\n                "}
                    {v.trHit ? <>
                      <div style={css(`position:absolute; left:${v.trHitL ?? ""}; top:-4px; bottom:-4px; width:6px; margin-left:-3px; border-radius:3px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;`, "position:absolute; left:{{ trHitL }}; top:-4px; bottom:-4px; width:6px; margin-left:-3px; border-radius:3px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;")} />
                    </> : null}
                    {"\n                "}
                    {list(v.clipBlocks).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.b?.down} onContextMenu={v1.b?.ctx} style={css(`position:absolute; top:5px; height:50px; left:${v1.b?.left ?? ""}; width:${v1.b?.width ?? ""}; border:2px solid ${v1.b?.border ?? ""}; border-radius:6px; background-color:#1b2433; background-image:${v1.b?.bg ?? ""}; background-size:${v1.b?.bgSize ?? ""}; background-repeat:repeat-x; background-position:left center; overflow:hidden; cursor:grab; touch-action:none; transform:translateX(${v1.b?.dx ?? ""}); z-index:${v1.b?.z ?? ""}; opacity:${v1.b?.op ?? ""};`, "position:absolute; top:5px; height:50px; left:{{ b.left }}; width:{{ b.width }}; border:2px solid {{ b.border }}; border-radius:6px; background-color:#1b2433; background-image:{{ b.bg }}; background-size:{{ b.bgSize }}; background-repeat:repeat-x; background-position:left center; overflow:hidden; cursor:grab; touch-action:none; transform:translateX({{ b.dx }}); z-index:{{ b.z }}; opacity:{{ b.op }};")}>
                          {v1.b?.linked ? <>
                            <div style={css(`position:absolute; left:0; right:0; bottom:0; height:3px; background:${v1.b?.linkCol ?? ""}; z-index:2; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:3px; background:{{ b.linkCol }}; z-index:2; pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          {v1.b?.hasTr ? <>
                            <div style={css(`position:absolute; left:0; top:0; bottom:0; width:${v1.b?.trW ?? ""}; background:linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); pointer-events:none;`, "position:absolute; left:0; top:0; bottom:0; width:{{ b.trW }}; background:linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          {v1.b?.hasTo ? <>
                            <div style={css(`position:absolute; right:0; top:0; bottom:0; width:${v1.b?.toW ?? ""}; background:linear-gradient(270deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); pointer-events:none;`, "position:absolute; right:0; top:0; bottom:0; width:{{ b.toW }}; background:linear-gradient(270deg, rgba(255,255,255,0.45), rgba(255,255,255,0)); pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          <div style={css(`position:absolute; left:0; right:0; bottom:0; height:18px; background-image:${v1.b?.wave ?? ""}; background-size:${v1.b?.waveSize ?? ""}; background-position:${v1.b?.wavePos ?? ""}; background-repeat:no-repeat; transform:${v1.b?.waveFlip ?? ""}; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:18px; background-image:{{ b.wave }}; background-size:{{ b.waveSize }}; background-position:{{ b.wavePos }}; background-repeat:no-repeat; transform:{{ b.waveFlip }}; pointer-events:none;")} />
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"9px","right":"9px","top":"4px","fontSize":"11px","fontWeight":"600","color":"#ffffff","textShadow":"0 1px 3px #000","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.b?.label)}
                          </span>
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"9px","bottom":"4px","fontSize":"10.5px","color":"#e9e7e2","textShadow":"0 1px 3px #000","pointerEvents":"none"}}>
                            {I(v1.b?.durLabel)}
                          </span>
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downL} style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"9px","cursor":"ew-resize"}} className="scpg" />
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downR} style={{"position":"absolute","right":"0","top":"0","bottom":"0","width":"9px","cursor":"ew-resize"}} className="scpg" />
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div onPointerDown={v.rowDown} onContextMenu={v.rowCtx} style={{"position":"relative","height":"34px","borderBottom":"1px solid #1c1c1c"}}>
                    {"\n                "}
                    {list(v.subBlocks).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.b?.down} onContextMenu={v1.b?.ctx} style={css(`position:absolute; left:${v1.b?.left ?? ""}; top:5px; width:${v1.b?.width ?? ""}; height:24px; border:1.5px solid ${v1.b?.border ?? ""}; border-radius:5px; background:#23463a; overflow:hidden; cursor:grab; touch-action:none;`, "position:absolute; left:{{ b.left }}; top:5px; width:{{ b.width }}; height:24px; border:1.5px solid {{ b.border }}; border-radius:5px; background:#23463a; overflow:hidden; cursor:grab; touch-action:none;")}>
                          {v1.b?.linked ? <>
                            <div style={css(`position:absolute; left:0; right:0; bottom:0; height:3px; background:${v1.b?.linkCol ?? ""}; z-index:2; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:3px; background:{{ b.linkCol }}; z-index:2; pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"7px","right":"7px","top":"4px","fontSize":"11px","color":"#ffffff","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.b?.label)}
                          </span>
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downL} style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"6px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downR} style={{"position":"absolute","right":"0","top":"0","bottom":"0","width":"6px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div ref={v.musicRowRef} onPointerDown={v.rowDown} onContextMenu={v.rowCtx} style={css(`position:relative; height:${v.rowMusicH ?? ""};`, "position:relative; height:{{ rowMusicH }};")}>
                    {"\n                "}
                    {v.mhMusic ? <>
                      <div style={css(`position:absolute; left:${v.mhMusicL ?? ""}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;`, "position:absolute; left:{{ mhMusicL }}; top:2px; bottom:2px; width:4px; margin-left:-2px; border-radius:2px; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.3); z-index:8; pointer-events:none;")} />
                    </> : null}
                    {"\n                "}
                    {list(v.musicBlocks).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div onPointerDown={v1.b?.down} onContextMenu={v1.b?.ctx} style={css(`position:absolute; left:${v1.b?.left ?? ""}; top:${v1.b?.top ?? ""}; width:${v1.b?.width ?? ""}; height:26px; border:1.5px solid ${v1.b?.border ?? ""}; border-radius:5px; background:#4a3a1f; overflow:hidden; cursor:grab; touch-action:none;`, "position:absolute; left:{{ b.left }}; top:{{ b.top }}; width:{{ b.width }}; height:26px; border:1.5px solid {{ b.border }}; border-radius:5px; background:#4a3a1f; overflow:hidden; cursor:grab; touch-action:none;")}>
                          {v1.b?.linked ? <>
                            <div style={css(`position:absolute; left:0; right:0; bottom:0; height:3px; background:${v1.b?.linkCol ?? ""}; z-index:2; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:3px; background:{{ b.linkCol }}; z-index:2; pointer-events:none;")} />
                          </> : null}
                          {"\n                    "}
                          <div style={css(`position:absolute; left:0; right:0; bottom:0; height:18px; background-image:${v1.b?.wave ?? ""}; background-size:${v1.b?.waveSize ?? ""}; background-position:${v1.b?.wavePos ?? ""}; background-repeat:no-repeat; transform:${v1.b?.waveFlip ?? ""}; pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:18px; background-image:{{ b.wave }}; background-size:{{ b.waveSize }}; background-position:{{ b.wavePos }}; background-repeat:no-repeat; transform:{{ b.waveFlip }}; pointer-events:none;")} />
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"position":"absolute","left":"8px","right":"8px","top":"5px","fontSize":"11px","fontWeight":"600","color":"#ffffff","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis","pointerEvents":"none"}}>
                            {I(v1.b?.label)}
                          </span>
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downL} style={{"position":"absolute","left":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                    "}
                          <div onPointerDown={v1.b?.downR} style={{"position":"absolute","right":"0","top":"0","bottom":"0","width":"7px","cursor":"ew-resize"}} className="scpf" />
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {list(v.markers).map(($it1, $i1) => {
                    const v1 = { ...v, "k": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <div style={css(`position:absolute; left:${v1.k?.left ?? ""}; top:24px; bottom:0; width:1px; background:${v1.k?.line ?? ""}; pointer-events:none; z-index:4;`, "position:absolute; left:{{ k.left }}; top:24px; bottom:0; width:1px; background:{{ k.line }}; pointer-events:none; z-index:4;")} />
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <div ref={v.phRef} style={css(`position:absolute; left:${v.phLeft ?? ""}; top:0; bottom:0; width:2px; margin-left:-1px; background:#ff5a36; pointer-events:none; z-index:6;`, "position:absolute; left:{{ phLeft }}; top:0; bottom:0; width:2px; margin-left:-1px; background:#ff5a36; pointer-events:none; z-index:6;")}>
                    <div style={{"position":"absolute","left":"-5px","top":"0","width":"12px","height":"10px","borderRadius":"0 0 6px 6px","background":"#ff5a36"}} />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </section>
          {"\n\n      "}
          {v.hasMenu ? <>
            {"\n        "}
            <div onPointerDown={v.closeMenu} onContextMenu={v.closeMenu} style={{"position":"fixed","inset":"0","zIndex":"96"}} />
            {"\n        "}
            <div role="menu" style={css(`position:fixed; left:${v.menuX ?? ""}; top:${v.menuY ?? ""}; z-index:97; min-width:230px; padding:5px; border:1px solid #2b2b2b; border-radius:12px; background:rgba(18,18,18,0.97); box-shadow:0 18px 50px rgba(0,0,0,0.6); animation:mdPop 0.12s ease-out; transform-origin:top left;`, "position:fixed; left:{{ menuX }}; top:{{ menuY }}; z-index:97; min-width:230px; padding:5px; border:1px solid #2b2b2b; border-radius:12px; background:rgba(18,18,18,0.97); box-shadow:0 18px 50px rgba(0,0,0,0.6); animation:mdPop 0.12s ease-out; transform-origin:top left;")}>
              {"\n          "}
              {list(v.menuItems).map(($it1, $i1) => {
                const v1 = { ...v, "it": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  {v1.it?.sep ? <>
                    <div style={{"height":"1px","margin":"4px 6px","background":"#262626"}} />
                  </> : null}
                  {"\n            "}
                  {v1.it?.btn ? <>
                    <button onClick={v1.it?.click} role="menuitem" style={css(`display:flex; width:100%; align-items:center; justify-content:space-between; gap:18px; height:32px; padding:0 10px; border:0; border-radius:7px; background:transparent; color:${v1.it?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;`, "display:flex; width:100%; align-items:center; justify-content:space-between; gap:18px; height:32px; padding:0 10px; border:0; border-radius:7px; background:transparent; color:{{ it.fg }}; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;")} className="scph">
                      <span>
                        {I(v1.it?.l)}
                      </span>
                      <span data-no-i18n="1" style={{"fontSize":"11px","fontWeight":"500","color":"#6f6b64"}}>
                        {I(v1.it?.k)}
                      </span>
                    </button>
                  </> : null}
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n      "}
          {v.trGhost ? <>
            {"\n        "}
            <div style={css(`position:fixed; left:${v.trGx ?? ""}; top:${v.trGy ?? ""}; z-index:95; transform:translate(-50%, -50%); padding:8px 12px; border:1px solid #f5b82c; border-radius:999px; background:#0b0b0b; color:#f3f1ec; font-size:12px; font-weight:700; white-space:nowrap; pointer-events:none; box-shadow:0 8px 24px rgba(0,0,0,0.5); display:flex; gap:8px; align-items:center;`, "position:fixed; left:{{ trGx }}; top:{{ trGy }}; z-index:95; transform:translate(-50%, -50%); padding:8px 12px; border:1px solid #f5b82c; border-radius:999px; background:#0b0b0b; color:#f3f1ec; font-size:12px; font-weight:700; white-space:nowrap; pointer-events:none; box-shadow:0 8px 24px rgba(0,0,0,0.5); display:flex; gap:8px; align-items:center;")}>
              <span data-no-i18n="1">
                {I(v.trGhostL)}
              </span>
              {v.hasGhostSub ? <>
                <span style={{"color":"#f5b82c"}}>
                  {I(v.trGhostSub)}
                </span>
              </> : null}
            </div>
            {"\n      "}
          </> : null}
          {"\n      "}
          {v.hasToast ? <>
            {"\n        "}
            <div style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#141414","boxShadow":"0 12px 30px rgba(0,0,0,0.5)","fontSize":"13px","lineHeight":"1.45","color":"#f3f1ec"}}>
              {I(v.toast)}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.expOpen ? <>
            {"\n        "}
            <div style={{"position":"fixed","inset":"0","zIndex":"80","background":"rgba(0,0,0,0.65)","display":"flex","alignItems":"center","justifyContent":"center","padding":"20px"}}>
              {"\n          "}
              <div role="dialog" aria-modal="true" aria-label="Eksporter video" style={{"width":"min(460px, 100%)","display":"flex","flexDirection":"column","gap":"16px","padding":"24px","border":"1px solid #2b2b2b","borderRadius":"18px","background":"#111111","boxShadow":"0 24px 60px rgba(0,0,0,0.6)"}}>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"18px","fontWeight":"700"}}>
                    Eksporter video
                  </span>
                  {"\n              "}
                  <span style={{"fontSize":"12.5px","lineHeight":"1.55","color":"#9d998f","textWrap":"pretty"}}>
                    MP4 med H.264 og lyd. Hold fanen åpen mens videoen lages. Lange videoer og 4K tar lengre tid.
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  {list(v.expOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.o?.pick} style={css(`display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid ${v1.o?.border ?? ""}; border-radius:12px; background:#0b0b0b; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid {{ o.border }}; border-radius:12px; background:#0b0b0b; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;")} className="scpi">
                        {"\n                  "}
                        <span style={css(`flex:0 0 auto; width:16px; height:16px; border-radius:50%; border:2px solid ${v1.o?.border ?? ""}; display:flex; align-items:center; justify-content:center;`, "flex:0 0 auto; width:16px; height:16px; border-radius:50%; border:2px solid {{ o.border }}; display:flex; align-items:center; justify-content:center;")}>
                          <span style={css(`width:6px; height:6px; border-radius:50%; background:#e9e7e2; opacity:${v1.o?.dot ?? ""};`, "width:6px; height:6px; border-radius:50%; background:#e9e7e2; opacity:{{ o.dot }};")} />
                        </span>
                        {"\n                  "}
                        <span style={{"flex":"1","fontSize":"13.5px","fontWeight":"600"}}>
                          {I(v1.o?.l)}
                        </span>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                          {I(v1.o?.size)}
                        </span>
                        {"\n                "}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#8a867e"}}>
                  {"Lengde "}{I(v.expDur)}
                </span>
                {"\n            "}
                {v.expBusy ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <div style={{"height":"6px","borderRadius":"999px","background":"#262626","overflow":"hidden"}}>
                      <div style={css(`height:100%; width:${v.expPct ?? ""}; background:#e9e7e2; transition:width .2s;`, "height:100%; width:{{ expPct }}; background:#e9e7e2; transition:width .2s;")} />
                    </div>
                    {"\n                "}
                    <span style={{"fontSize":"12px","color":"#c9c5bc"}}>
                      {I(v.expPhase)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  <button onClick={v.sendFrame} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Send stillbilde
                  </button>
                  {v.hasLastExp ? <>
                    <button onClick={v.sendVideo} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                      Send videoen
                    </button>
                  </> : null}
                </div>
                {"\n            "}
                {v.expHasMsg ? <>
                  <span style={css(`font-size:12.5px; line-height:1.5; color:${v.expMsgColor ?? ""}; text-wrap:pretty;`, "font-size:12.5px; line-height:1.5; color:{{ expMsgColor }}; text-wrap:pretty;")}>
                    {I(v.expMsg)}
                  </span>
                </> : null}
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","justifyContent":"flex-end","flexWrap":"wrap"}}>
                  {"\n              "}
                  {v.expIdle ? <>
                    {"\n                "}
                    <button onClick={v.closeExport} style={{"height":"38px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                      Lukk
                    </button>
                    {"\n                "}
                    <button onClick={v.doExport} style={{"height":"38px","padding":"0 20px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                      Eksporter MP4
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.expBusy ? <>
                    {"\n                "}
                    <button onClick={v.abortExport} style={{"height":"38px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scpj">
                      Avbryt eksport
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
