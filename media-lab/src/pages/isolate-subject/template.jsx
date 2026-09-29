/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/isolate-subject.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

export default function template(v) {
  return (
    <>
    <div onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <div style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","flexWrap":"wrap"}}>
        {"\n    "}
        <a href="media-lab.dc.html" style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
          <span style={{"fontSize":"16px","letterSpacing":"0"}}>
            ←
          </span>
          <span>
            Media Lab
          </span>
        </a>
        {"\n    "}
        {v.isBusyPhase ? <>
          {"\n      "}
          <button onClick={v.reset} style={{"height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
            Nytt bilde
          </button>
          {"\n    "}
        </> : null}
        {"\n  "}
      </div>
      {"\n\n  "}
      {v.isEmpty ? <>
        {"\n    "}
        <main style={{"flex":"1","width":"100%","maxWidth":"900px","margin":"0 auto","padding":"9vh 28px 64px","display":"flex","flexDirection":"column","alignItems":"center","gap":"40px"}}>
          {"\n      "}
          <h1 style={{"margin":"0","textAlign":"center","fontSize":"clamp(34px, 7vw, 88px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
            Isolate Subject
          </h1>
          {"\n      "}
          <button onClick={v.pick} style={css(`width:100%; min-height:320px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:40px 28px; border:1px dashed ${v.dropBorder ?? ""}; border-radius:22px; background:${v.dropBg ?? ""}; color:#f3f1ec; font:inherit; cursor:pointer; backdrop-filter:blur(14px);`, "width:100%; min-height:320px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:40px 28px; border:1px dashed {{ dropBorder }}; border-radius:22px; background:{{ dropBg }}; color:#f3f1ec; font:inherit; cursor:pointer; backdrop-filter:blur(14px);")} className="scp1">
            {"\n        "}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
            </svg>
            {"\n        "}
            <span style={{"fontSize":"20px","fontWeight":"600","letterSpacing":"0.04em"}}>
              Slipp et bilde her, eller trykk for å velge
            </span>
            {"\n        "}
            <span style={{"fontSize":"13px","color":"#9d998f"}}>
              JPG, PNG eller WebP · du kan også lime inn med Ctrl/Cmd + V
            </span>
            {"\n        "}
            <span style={{"marginTop":"10px","display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid #f3f1ec","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase"}}>
              Velg bilde
            </span>
            {"\n      "}
          </button>
          {"\n      "}
          <button onClick={v.pickShared} style={{"height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
            Fra delt mappe
          </button>
          {"\n      "}
          {v.hasErr ? <>
            <span style={{"fontSize":"13px","color":"#ff8f8f"}}>
              {I(v.err)}
            </span>
          </> : null}
          {"\n      "}
          <p style={{"margin":"0","maxWidth":"560px","textAlign":"center","fontSize":"13px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
            AI-en kjører i nettleseren din, så bildet lastes aldri opp. Første gang lastes modellen ned, etterpå går det raskere.
          </p>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isCrop ? <>
        {"\n    "}
        <main data-ml-bg="static" style={{"flex":"1","width":"100%","maxWidth":"1320px","margin":"0 auto","padding":"24px 28px 48px","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
          {"\n      "}
          <div style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"6px","textAlign":"center"}}>
            {"\n        "}
            <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              Beskjær bildet
            </span>
            {"\n        "}
            <span style={{"fontSize":"14px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
              Dra i hjørnene, flytt rammen eller dra en ny ramme. Du kan også hoppe over.
            </span>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"maxWidth":"100%","padding":"20px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"22px","background":"rgba(12,12,12,0.55)"}}>
            {"\n        "}
            <div onPointerDown={v.cropDown} onPointerMove={v.cropMove} onPointerUp={v.cropUp} onPointerCancel={v.cropUp} style={{"position":"relative","maxWidth":"100%","lineHeight":"0","overflow":"hidden","borderRadius":"6px","touchAction":"none","userSelect":"none","cursor":"crosshair"}}>
              {"\n          "}
              <canvas ref={v.cropRef} width="16" height="16" style={{"display":"block","maxWidth":"100%","maxHeight":"calc(100dvh - 340px)","width":"auto","height":"auto"}} />
              {"\n          "}
              <div data-h="move" style={css(`position:absolute; left:${v.cL ?? ""}; top:${v.cT ?? ""}; width:${v.cW ?? ""}; height:${v.cH ?? ""}; box-shadow:0 0 0 9999px rgba(0,0,0,0.6); outline:1.5px solid #f3f1ec; cursor:move;`, "position:absolute; left:{{ cL }}; top:{{ cT }}; width:{{ cW }}; height:{{ cH }}; box-shadow:0 0 0 9999px rgba(0,0,0,0.6); outline:1.5px solid #f3f1ec; cursor:move;")}>
                {"\n            "}
                <span style={{"position":"absolute","left":"33.33%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                {"\n            "}
                <span style={{"position":"absolute","left":"66.66%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                {"\n            "}
                <span style={{"position":"absolute","top":"33.33%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                {"\n            "}
                <span style={{"position":"absolute","top":"66.66%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                {"\n            "}
                <span data-h="nw" style={{"position":"absolute","left":"-14px","top":"-14px","width":"28px","height":"28px","display":"flex","alignItems":"center","justifyContent":"center","cursor":"nwse-resize"}}>
                  <span style={{"width":"14px","height":"14px","borderRadius":"3px","background":"#f3f1ec","boxShadow":"0 0 0 1px #000","pointerEvents":"none"}} />
                </span>
                {"\n            "}
                <span data-h="ne" style={{"position":"absolute","right":"-14px","top":"-14px","width":"28px","height":"28px","display":"flex","alignItems":"center","justifyContent":"center","cursor":"nesw-resize"}}>
                  <span style={{"width":"14px","height":"14px","borderRadius":"3px","background":"#f3f1ec","boxShadow":"0 0 0 1px #000","pointerEvents":"none"}} />
                </span>
                {"\n            "}
                <span data-h="sw" style={{"position":"absolute","left":"-14px","bottom":"-14px","width":"28px","height":"28px","display":"flex","alignItems":"center","justifyContent":"center","cursor":"nesw-resize"}}>
                  <span style={{"width":"14px","height":"14px","borderRadius":"3px","background":"#f3f1ec","boxShadow":"0 0 0 1px #000","pointerEvents":"none"}} />
                </span>
                {"\n            "}
                <span data-h="se" style={{"position":"absolute","right":"-14px","bottom":"-14px","width":"28px","height":"28px","display":"flex","alignItems":"center","justifyContent":"center","cursor":"nwse-resize"}}>
                  <span style={{"width":"14px","height":"14px","borderRadius":"3px","background":"#f3f1ec","boxShadow":"0 0 0 1px #000","pointerEvents":"none"}} />
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"center","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
            {"\n        "}
            {list(v.aspects).map(($it1, $i1) => {
              const v1 = { ...v, "a": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <button onClick={v1.a?.onClick} style={css(`height:34px; padding:0 14px; border:0; border-radius:999px; background:${v1.a?.bg ?? ""}; color:${v1.a?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:34px; padding:0 14px; border:0; border-radius:999px; background:{{ a.bg }}; color:{{ a.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                  {I(v1.a?.label)}
                </button>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","flexWrap":"wrap","justifyContent":"center","alignItems":"center","gap":"10px"}}>
            {"\n        "}
            <span style={{"fontSize":"12px","color":"#8a867e","minWidth":"90px","textAlign":"center"}}>
              {I(v.cropDims)}
            </span>
            {"\n        "}
            <button onClick={v.cropSkip} style={{"height":"44px","padding":"0 22px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
              Hopp over
            </button>
            {"\n        "}
            <button onClick={v.cropOk} style={{"height":"44px","padding":"0 22px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}}>
              Beskjær og fortsett
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isWork ? <>
        {"\n    "}
        <main data-ml-bg="static" style={{"flex":"1","width":"100%","maxWidth":"1320px","margin":"0 auto","padding":"24px 28px 48px","display":"flex","flexWrap":"wrap","alignItems":"flex-start","gap":"24px"}}>
          {"\n      "}
          <section style={{"flex":"1 1 560px","minWidth":"0","display":"flex","flexDirection":"column","gap":"12px"}}>
            {"\n        "}
            <div style={{"position":"relative","minHeight":"360px","display":"flex","alignItems":"center","justifyContent":"center","padding":"20px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"22px","background":"rgba(12,12,12,0.55)"}}>
              {"\n          "}
              <div data-keep-color="1" style={{"maxWidth":"100%","lineHeight":"0","borderRadius":"6px","overflow":"hidden","background":"repeating-conic-gradient(#2c2c2c 0 25%, #1c1c1c 0 50%) 50% / 20px 20px"}}>
                {"\n            "}
                <canvas ref={v.viewRef} onPointerDown={v.onDown} onPointerMove={v.onMove} onPointerUp={v.onUp} onPointerCancel={v.onCancel} onContextMenu={v.onViewCtx} width="16" height="16" style={{"display":"block","maxWidth":"100%","maxHeight":"calc(100dvh - 260px)","width":"auto","height":"auto","cursor":"crosshair","touchAction":"none"}} />
                {"\n          "}
              </div>
              {"\n          "}
              {v.showHint ? <>
                {"\n            "}
                <div style={{"position":"absolute","top":"34px","left":"50%","transform":"translateX(-50%)","maxWidth":"calc(100% - 40px)","padding":"10px 18px","borderRadius":"999px","background":"rgba(0,0,0,0.72)","backdropFilter":"blur(6px)","fontSize":"13px","fontWeight":"600","textAlign":"center","pointerEvents":"none"}}>
                  Trykk eller dra en firkant i bildet, eller velg type
                </div>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.busy ? <>
                {"\n            "}
                <div style={{"position":"absolute","inset":"0","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"12px","padding":"24px","borderRadius":"22px","background":"rgba(0,0,0,0.62)","backdropFilter":"blur(4px)","textAlign":"center"}}>
                  {"\n              "}
                  <span style={{"fontSize":"15px","fontWeight":"600"}}>
                    {I(v.busyLabel)}
                  </span>
                  {"\n              "}
                  {v.isModelLoad ? <>
                    {"\n                "}
                    <div style={{"width":"220px","height":"4px","borderRadius":"999px","background":"rgba(255,255,255,0.14)","overflow":"hidden"}}>
                      <div style={css(`width:${v.barW ?? ""}; height:100%; background:#f3f1ec;`, "width:{{ barW }}; height:100%; background:#f3f1ec;")} />
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#9d998f","maxWidth":"320px","lineHeight":"1.5"}}>
                    {I(v.busyNote)}
                  </span>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap","padding":"0 6px"}}>
              {"\n          "}
              <button onClick={v.recrop} disabled={v.noRecrop} title="Gå tilbake og beskjær bildet" style={css(`display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:${v.recropOp ?? ""};`, "display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:{{ recropOp }};")} className="scp1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
                <span>
                  Beskjær
                </span>
              </button>
              {"\n          "}
              <button onClick={v.undo} disabled={v.noUndo} title="Angre siste steg" style={css(`display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:${v.undoOp ?? ""};`, "display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:{{ undoOp }};")} className="scp1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
                </svg>
                <span>
                  Tilbake
                </span>
              </button>
              {"\n          "}
              <button onClick={v.restore} disabled={v.noRestore} title="Tilbake til originalbildet" style={css(`display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:${v.restoreOp ?? ""};`, "display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 16px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; opacity:{{ restoreOp }};")} className="scp1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>
                  Tilbakestill
                </span>
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            {v.ready ? <>
              {"\n          "}
              <div style={{"display":"flex","alignItems":"center","gap":"14px","flexWrap":"wrap","padding":"0 6px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Etter
                </span>
                {"\n            "}
                <input type="range" min="0" max="100" step="1" value={val(v.cmp)} onChange={v.onCmp} aria-label="Sammenlign med originalen" style={{"flex":"1 1 200px","accentColor":"#e9e7e2"}} />
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Før
                </span>
                {"\n            "}
                <span style={{"marginLeft":"auto","fontSize":"12px","color":"#6f6b64","fontVariantNumeric":"tabular-nums"}}>
                  {I(v.name)}{" · "}{I(v.dims)}
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            {v.hasErr ? <>
              <span style={{"padding":"0 6px","fontSize":"13px","color":"#ff8f8f"}}>
                {I(v.err)}
              </span>
            </> : null}
            {"\n      "}
          </section>
          {"\n\n      "}
          <aside style={{"flex":"0 1 340px","minWidth":"0","display":"flex","flexDirection":"column","gap":"22px","padding":"22px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"22px","background":"rgba(12,12,12,0.55)"}}>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                1 · Hva skal beholdes?
              </span>
              {"\n          "}
              <div style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"8px"}}>
                {"\n            "}
                {list(v.kinds).map(($it1, $i1) => {
                  const v1 = { ...v, "k": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button onClick={v1.k?.onClick} style={css(`display:flex; flex-direction:column; align-items:flex-start; gap:3px; min-height:58px; padding:10px 14px; border:1px solid ${v1.k?.border ?? ""}; border-radius:14px; background:${v1.k?.bg ?? ""}; color:${v1.k?.color ?? ""}; font:inherit; text-align:left; cursor:pointer;`, "display:flex; flex-direction:column; align-items:flex-start; gap:3px; min-height:58px; padding:10px 14px; border:1px solid {{ k.border }}; border-radius:14px; background:{{ k.bg }}; color:{{ k.color }}; font:inherit; text-align:left; cursor:pointer;")} className="scp1">
                      {"\n                "}
                      <span style={{"fontSize":"14px","fontWeight":"700"}}>
                        {I(v1.k?.label)}
                      </span>
                      {"\n                "}
                      <span style={css(`font-size:11.5px; color:${v1.k?.sub ?? ""}; line-height:1.35;`, "font-size:11.5px; color:{{ k.sub }}; line-height:1.35;")}>
                        {I(v1.k?.desc)}
                      </span>
                      {"\n              "}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n          "}
              <button onClick={v.pointOn} style={css(`display:flex; align-items:center; gap:12px; min-height:52px; padding:10px 14px; border:1px solid ${v.ptBorder ?? ""}; border-radius:14px; background:${v.ptBg ?? ""}; color:${v.ptColor ?? ""}; font:inherit; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:12px; min-height:52px; padding:10px 14px; border:1px solid {{ ptBorder }}; border-radius:14px; background:{{ ptBg }}; color:{{ ptColor }}; font:inherit; text-align:left; cursor:pointer;")} className="scp1">
                {"\n            "}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
                {"\n            "}
                <span style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                  <span style={{"fontSize":"14px","fontWeight":"700"}}>
                    Merk i bildet
                  </span>
                  <span style={css(`font-size:11.5px; color:${v.ptSub ?? ""};`, "font-size:11.5px; color:{{ ptSub }};")}>
                    Trykk eller dra en firkant
                  </span>
                </span>
                {"\n          "}
              </button>
              {"\n          "}
              {v.isPoint ? <>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                    {"\n                "}
                    {list(v.ptModes).map(($it1, $i1) => {
                      const v1 = { ...v, "p": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.p?.onClick} style={css(`display:flex; align-items:center; gap:7px; height:30px; padding:0 14px; border:0; border-radius:999px; background:${v1.p?.bg ?? ""}; color:${v1.p?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "display:flex; align-items:center; gap:7px; height:30px; padding:0 14px; border:0; border-radius:999px; background:{{ p.bg }}; color:{{ p.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                          <span data-keep-color="1" style={css(`width:8px; height:8px; border-radius:999px; background:${v1.p?.dot ?? ""};`, "width:8px; height:8px; border-radius:999px; background:{{ p.dot }};")} />
                          <span>
                            {I(v1.p?.label)}
                          </span>
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.hasPts ? <>
                    {"\n                "}
                    <button onClick={v.clearPts} style={{"height":"30px","padding":"0 4px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12.5px","fontWeight":"600","textDecoration":"underline","textUnderlineOffset":"3px","cursor":"pointer"}}>
                      Nullstill merker
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                    Etter fjerning
                  </span>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                    {"\n                "}
                    {list(v.fillModes).map(($it1, $i1) => {
                      const v1 = { ...v, "fm": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.fm?.onClick} style={css(`flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:${v1.fm?.bg ?? ""}; color:${v1.fm?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:{{ fm.bg }}; color:{{ fm.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                          {I(v1.fm?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <span style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                  Dra en firkant over det som skal bort, f.eks. en logo eller en hånd. Bare objektet blir rødt, ikke bakgrunnen. Trykk på det røde for å fjerne markeringen. Trykk Fjern når du er klar.
                </span>
                {"\n            "}
                <button onClick={v.apply} disabled={v.noApply} style={css(`height:44px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:${v.applyOp ?? ""};`, "height:44px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:{{ applyOp }};")}>
                  Fjern
                </button>
                {"\n            "}
                {v.showViews ? <>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                    {"\n                "}
                    {list(v.viewModes).map(($it1, $i1) => {
                      const v1 = { ...v, "w": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.w?.onClick} style={css(`flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:${v1.w?.bg ?? ""}; color:${v1.w?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:{{ w.bg }}; color:{{ w.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                          {I(v1.w?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.hasNote ? <>
                {"\n            "}
                <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                  {I(v.note)}
                </span>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"18px","borderTop":"1px solid #262626"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                2 · Bakgrunn
              </span>
              {"\n          "}
              <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                {"\n            "}
                {list(v.bgTypes).map(($it1, $i1) => {
                  const v1 = { ...v, "b": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button onClick={v1.b?.onClick} style={css(`flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:32px; padding:0 10px; border:0; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v1.b?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n          "}
              {v.isColor ? <>
                {"\n            "}
                <div style={{"display":"flex","flexWrap":"wrap","gap":"8px","paddingTop":"2px"}}>
                  {"\n              "}
                  {list(v.swatches).map(($it1, $i1) => {
                    const v1 = { ...v, "s": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-keep-color="1" onClick={v1.s?.onClick} title={v1.s?.title} aria-label={v1.s?.title} style={css(`width:30px; height:30px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:${v1.s?.bg ?? ""}; box-shadow:${v1.s?.ring ?? ""}; cursor:pointer;`, "width:30px; height:30px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:{{ s.bg }}; box-shadow:{{ s.ring }}; cursor:pointer;")} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <label data-keep-color="1" title="Egen farge" style={css(`position:relative; width:30px; height:30px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:${v.customRing ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:{{ customRing }}; overflow:hidden; cursor:pointer;")}>
                    <input type="color" value={val(v.bgHex)} onChange={v.onBgHex} aria-label="Egen farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","border":"0","padding":"0","cursor":"pointer"}} />
                  </label>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n          "}
              <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                {I(v.bgName)}
              </span>
              {"\n        "}
            </div>
            {"\n\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"14px","paddingTop":"18px","borderTop":"1px solid #262626"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                3 · Finjuster
              </span>
              {"\n          "}
              <button onClick={v.toggleCrop} aria-pressed={v.crop} style={css(`display:flex; align-items:center; gap:14px; width:100%; padding:14px 16px; border:1px solid ${v.cropBorder ?? ""}; border-radius:16px; background:${v.cropBg ?? ""}; color:${v.cropColor ?? ""}; font:inherit; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:14px; width:100%; padding:14px 16px; border:1px solid {{ cropBorder }}; border-radius:16px; background:{{ cropBg }}; color:{{ cropColor }}; font:inherit; text-align:left; cursor:pointer;")}>
                {"\n            "}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style={{"flex":"none"}}>
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
                {"\n            "}
                <span style={{"display":"flex","flexDirection":"column","gap":"3px","flex":"1 1 auto","minWidth":"0"}}>
                  <span style={{"fontSize":"14.5px","fontWeight":"700"}}>
                    Beskjær til motivet
                  </span>
                  <span style={css(`font-size:11.5px; color:${v.cropSub ?? ""};`, "font-size:11.5px; color:{{ cropSub }};")}>
                    Fjerner tomrom rundt motivet
                  </span>
                </span>
                {"\n            "}
                <span style={css(`flex:none; display:flex; align-items:center; width:40px; height:24px; padding:3px; border-radius:999px; background:${v.cropTrack ?? ""}; justify-content:${v.cropJustify ?? ""};`, "flex:none; display:flex; align-items:center; width:40px; height:24px; padding:3px; border-radius:999px; background:{{ cropTrack }}; justify-content:{{ cropJustify }};")}>
                  <span style={css(`width:18px; height:18px; border-radius:999px; background:${v.cropKnob ?? ""};`, "width:18px; height:18px; border-radius:999px; background:{{ cropKnob }};")} />
                </span>
                {"\n          "}
              </button>
              {"\n          "}
              <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                {"\n            "}
                <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#b3afa6"}}>
                  <span>
                    Myke kanter
                  </span>
                  <span>
                    {I(v.soft)}
                  </span>
                </span>
                {"\n            "}
                <input type="range" min="0" max="10" step="1" value={val(v.soft)} onChange={v.onSoft} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                {"\n          "}
              </label>
              {"\n          "}
              <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                {"\n            "}
                <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#b3afa6"}}>
                  <span>
                    Stram inn kantene
                  </span>
                  <span>
                    {I(v.tight)}
                  </span>
                </span>
                {"\n            "}
                <input type="range" min="0" max="10" step="1" value={val(v.tight)} onChange={v.onTight} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                {"\n          "}
              </label>
              {"\n        "}
            </div>
            {"\n\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"18px","borderTop":"1px solid #262626"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                4 · Last ned
              </span>
              {"\n          "}
              <button onClick={v.download} disabled={v.notReady} style={css(`height:44px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:${v.dlOpacity ?? ""};`, "height:44px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:{{ dlOpacity }};")}>
                Last ned PNG
              </button>
              {"\n            "}
              <button onClick={v.copyOut} disabled={v.notReady} style={css(`height:44px; padding:0 18px; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; opacity:${v.dlOpacity ?? ""};`, "height:44px; padding:0 18px; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; opacity:{{ dlOpacity }};")}>
                Kopier
              </button>
              {"\n            "}
              <button onClick={v.sendOut} disabled={v.notReady} style={css(`height:44px; padding:0 18px; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; opacity:${v.dlOpacity ?? ""};`, "height:44px; padding:0 18px; border:1px solid rgba(255,255,255,0.3); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; opacity:{{ dlOpacity }};")}>
                Send til …
              </button>
              {"\n          "}
              <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                {I(v.dlNote)}
              </span>
              {"\n        "}
            </div>
            {"\n      "}
          </aside>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.done ? <>
        {"\n    "}
        <div onClick={v.closeDone} style={{"position":"fixed","inset":"0","zIndex":"50","display":"flex","alignItems":"center","justifyContent":"center","padding":"24px","background":"rgba(0,0,0,0.7)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div role="dialog" aria-modal="true" onClick={v.stop} style={{"width":"100%","maxWidth":"440px","display":"flex","flexDirection":"column","gap":"20px","padding":"28px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"#0c0c0c","textAlign":"center"}}>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                Bildet er lastet ned
              </span>
              {"\n          "}
              <span style={{"fontSize":"22px","fontWeight":"600","lineHeight":"1.25","textWrap":"pretty"}}>
                Vil du isolere noe mer?
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
              {"\n          "}
              <button onClick={v.againNew} style={{"height":"44px","padding":"0 22px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}}>
                Nytt bilde
              </button>
              {"\n          "}
              <button onClick={v.againSame} style={{"height":"44px","padding":"0 22px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.1em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                Annet motiv i samme bilde
              </button>
              {"\n          "}
              <button onClick={v.closeDone} style={{"height":"36px","padding":"0 22px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}}>
                Nei takk
              </button>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp" ref={v.fileRef} onChange={v.onFile} style={{"display":"none"}} />
      {"\n  "}
      <footer style={{"position":"relative","flexShrink":"0","marginTop":"auto","height":"56px","paddingBottom":"env(safe-area-inset-bottom)","display":"flex","alignItems":"center","justifyContent":"center"}}>
        {"\n    "}
        <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"#b3afa6"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
    </div>
    </>
  );
}
