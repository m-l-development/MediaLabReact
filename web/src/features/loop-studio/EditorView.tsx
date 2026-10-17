'use no memo'
/* oxlint-disable react/refs -- refene (canvasRef, stripRef …) eies av kontrolleren og leses bare i hendelser og tegnesløyfen;
   regelen tror feilaktig at alle v.* er refer fordi v inneholder refer. */
/* Konvertert fra media-lab/src/pages/studio-editor/template.jsx (samme elementer og stiler, altså samme utseende).
   Tekstene vises gjennom oversetteren (norsk er kilden). Ikke rediger for hånd uten å oppdatere konverteringen:
   endringer i utseende gjøres heller i LoopStudio.module.css eller her med vilje. */
import React from 'react'
import type { LoopView } from './controller'
import { chk, css, interp, list, val } from './dc'
import P from './LoopStudio.module.css'

export function EditorView({ v, tx }: { v: LoopView & { homeHref: string; goHome: (e: { preventDefault(): void }) => void }; tx: (s: unknown) => string }) {
  const I = (x: unknown) => interp(x, tx)
  return (
    <>
    <div data-ml-bg="static" style={css(`min-height:100vh; padding-bottom:${v.rootPadB ?? ""}; display:flex; flex-direction:${v.rootDir ?? ""}; flex-wrap:${v.rootWrap ?? ""}; font-family:Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#f3f1ec; background:transparent; font-size:14px;`)}>
      {"\n\n  "}
      {v.mobile ? <>
        {"\n    "}
        <div style={{"position":"sticky","top":"0","zIndex":"52","display":"flex","alignItems":"center","gap":"10px","padding":"calc(8px + env(safe-area-inset-top)) 12px 8px","background":"rgba(0,0,0,0.94)","backdropFilter":"blur(10px)","WebkitBackdropFilter":"blur(10px)","borderBottom":"1px solid #262626"}}>
          {"\n      "}
          <a href={v.homeHref} onClick={v.goHome} title={tx("Tilbake til malene")} aria-label={tx("Tilbake til malene")} style={{"flex":"0 0 auto","width":"44px","height":"44px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","color":"#f3f1ec","textDecoration":"none"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </a>
          {"\n      "}
          <div style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
            {"\n        "}
            <div style={{"fontSize":"10.5px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#8a867e"}}>
              {tx("Loop Studio")}
            </div>
            {"\n        "}
            <div style={{"fontSize":"13.5px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
              {I(v.tplTitle)}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <button onClick={v.togglePlay} aria-label={tx(v.playLabel)} style={{"flex":"0 0 auto","width":"44px","height":"44px","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
            {"\n        "}
            {v.isLive ? <>
              <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor">
                <rect x="0" y="0" width="3.2" height="12" rx="1" />
                <rect x="6.8" y="0" width="3.2" height="12" rx="1" />
              </svg>
            </> : null}
            {"\n        "}
            {v.isPaused ? <>
              <svg width="13" height="14" viewBox="0 0 11 12" fill="currentColor">
                <path d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
              </svg>
            </> : null}
            {"\n      "}
          </button>
          {"\n      "}
          <button onClick={v.goExport} style={{"flex":"0 0 auto","height":"44px","padding":"0 16px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}}>
            {tx("Eksporter")}
          </button>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      <aside style={css(`flex:${v.asideFlex ?? ""}; width:${v.paneW ?? ""}; max-width:${v.asideMaxW ?? ""}; min-width:0; height:${v.paneH ?? ""}; overflow-y:auto; background:#0a0a0a; border-right:${v.asideBorder ?? ""}; display:${v.asideDisplay ?? ""}; flex-direction:column;`)}>
        {"\n    "}
        <header style={css(`position:sticky; top:0; z-index:5; background:#0a0a0a; padding:${v.asideHeadPad ?? ""}; display:flex; flex-direction:column; gap:12px;`)}>
          {"\n      "}
          <div style={css(`display:${v.asideBackDisp ?? ""}; align-items:center; gap:12px; min-width:0;`)}>
            {"\n        "}
            <a href={v.homeHref} onClick={v.goHome} title={tx("Tilbake til malene")} aria-label={tx("Tilbake til malene")} style={{"flex":"0 0 auto","width":"38px","height":"38px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","color":"#f3f1ec","fontSize":"17px"}} className={P.scp0}>
              ←
            </a>
            {"\n        "}
            <div style={{"minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
              {"\n          "}
              <div style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#8a867e"}}>
                {tx("Loop Studio")}
              </div>
              {"\n          "}
              <div style={{"fontSize":"14px","fontWeight":"700","letterSpacing":"0.16em","textTransform":"uppercase","fontStretch":"112%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                {I(v.tplTitle)}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
            {"\n        "}
            {v.saveClosed ? <>
              {"\n          "}
              <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <button onClick={v.openSave} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                  {"\n              "}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                    <path d="M7 3v5h8V3" />
                    <rect x="7" y="13" width="10" height="6" rx="1" />
                  </svg>
                  {"\n              "}
                  <span>
                    {I(v.saveBtnLabel)}
                  </span>
                  {"\n            "}
                </button>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#8fe3cf"}}>
                  {I(v.saveMsg)}
                </span>
                {"\n            "}
                <button onClick={v.toggleAuto} role="switch" aria-checked={v.autoAria} title={tx("Slå autolagring av eller på")} style={css(`display:inline-flex; align-items:center; gap:9px; height:34px; min-height:0; padding:0 12px 0 6px; border:1px solid #2b2b2b; border-radius:999px; background:transparent; color:${v.autoTextColor ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)} className={P.scp2}>
                  {"\n              "}
                  <span data-keep-color="1" style={css(`position:relative; width:34px; height:20px; border-radius:999px; background:${v.autoTrack ?? ""}; transition:background 180ms ease;`)}>
                    <span style={css(`position:absolute; top:2px; left:${v.autoKnobX ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.autoKnob ?? ""}; transition:left 180ms ease;`)} />
                  </span>
                  {"\n              "}
                  <span>
                    {tx("Autolagring")}
                  </span>
                  {"\n              "}
                  {v.hasAutoAt ? <>
                    <span style={{"fontWeight":"400","color":"#6f6b64"}}>
                      {I(v.autoAtLabel)}
                    </span>
                  </> : null}
                  {"\n            "}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            {v.saveOpen ? <>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Navn på loopen")}
                </span>
                {"\n            "}
                <input value={val(v.saveName)} onChange={v.onSaveName} onKeyDown={v.onSaveKey} placeholder={tx("F.eks. Påskemøte 2026")} maxLength={60} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.doSave} style={{"height":"34px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                    {I(v.saveActionLabel)}
                  </button>
                  {"\n              "}
                  {v.canSaveAsNew ? <>
                    {"\n                "}
                    <button onClick={v.doSaveNew} style={{"height":"34px","padding":"0 16px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                      {tx("Lagre som ny")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <button onClick={v.closeSave} style={{"height":"34px","padding":"0 12px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12.5px","cursor":"pointer"}} className={P.scp4}>
                    {tx("Avbryt")}
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                {v.hasSaveErr ? <>
                  <span style={{"fontSize":"12px","color":"#ff8f8f"}}>
                    {I(v.saveMsg)}
                  </span>
                </> : null}
                {"\n            "}
                <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                  {I(v.diskUsage)}{tx(" Lagres på Disk i denne nettleseren. Du finner den igjen i Loop Studio. Video og lydspor lagres ikke.")}
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </div>
          {"\n    "}
        </header>
        {"\n    "}
        <nav style={css(`position:sticky; top:0; z-index:4; display:grid; grid-template-columns:repeat(${v.tabCount ?? ""}, minmax(0,1fr)); gap:4px; padding:8px 14px 10px; background:#0a0a0a; border-bottom:1px solid #262626;`)}>
          {"\n      "}
          {list(v.tabs).map(($it1, $i1) => {
            const v1 = { ...v, "t": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              <button onClick={v1.t?.onClick} title={tx(v1.t?.tip)} aria-current={v1.t?.current} style={css(`display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; height:52px; min-width:0; padding:0 4px; border:1px solid ${v1.t?.border ?? ""}; border-radius:12px; background:${v1.t?.bg ?? ""}; color:${v1.t?.color ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer;`)} className={P.scp4}>
                {"\n          "}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={v1.t?.icon} />
                </svg>
                {"\n          "}
                <span style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                  {I(v1.t?.label)}
                </span>
                {"\n        "}
              </button>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </nav>
        {"\n\n    "}
        <div style={{"padding":"20px 24px 40px","display":"flex","flexDirection":"column","gap":"18px"}}>
          {"\n\n      "}
          {v.isBuild ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"22px"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span style={{"fontSize":"15px","fontWeight":"700"}}>
                  {tx("Bygg din egen loop")}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                  {tx("Legg til slides og velg en stil med ett trykk. Du kan finjustere alt under Slides, Video og stil og Effekter.")}
                </span>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Legg til slide")}
                </span>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(120px, 1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.buildAdd).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"4px","minHeight":"64px","padding":"10px 12px","border":"1px dashed #3a3a3a","borderRadius":"12px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className={P.scp5}>
                        <span style={{"fontSize":"13.5px","fontWeight":"700"}}>
                          {"+ "}{I(v1.b?.label)}
                        </span>
                        <span style={{"fontSize":"11.5px","color":"#8a867e","lineHeight":"1.35"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Stilpakker")}
                </span>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(130px, 1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.buildPresets).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={css(`display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-height:70px; padding:12px; border:1px solid ${v1.b?.border ?? ""}; border-radius:12px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; text-align:left; cursor:pointer;`)} className={P.scp1}>
                        <span style={{"fontSize":"13.5px","fontWeight":"700","letterSpacing":"0.06em","textTransform":"uppercase"}}>
                          {I(v1.b?.label)}
                        </span>
                        <span style={{"fontSize":"11.5px","opacity":"0.75","lineHeight":"1.35"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <button onClick={v.buildRandom} style={{"alignSelf":"flex-start","height":"38px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp6}>
                  {tx("Overrask meg")}
                </button>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Effekter av og på")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildToggles).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`)}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Overlegg")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildOverlay).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`)}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Tempo for alle slides")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildTempo).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`)}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Aksentfarge")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildColors).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-keep-color="1" onClick={v1.b?.onClick} title={tx(v1.b?.label)} aria-label={tx(v1.b?.label)} style={css(`width:36px; height:36px; padding:0; border:2px solid ${v1.b?.ring ?? ""}; border-radius:999px; background:${v1.b?.hex ?? ""}; cursor:pointer;`)} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isProgram ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                    1
                  </span>
                  <span style={{"fontSize":"13px","fontWeight":"700"}}>
                    {tx("Hent ukens program")}
                  </span>
                </div>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0,1fr))","gap":"8px"}}>
                  {"\n              "}
                  <button onClick={v.pickOcr} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className={P.scp1}>
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {I(v.ocrLabel)}
                    </span>
                    <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      {tx("JPG eller PNG")}
                    </span>
                  </button>
                  {"\n              "}
                  <button onClick={v.loadStandard} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className={P.scp1}>
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {tx("Standard uke")}
                    </span>
                    <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      {tx("Fast oppsett")}
                    </span>
                  </button>
                  {"\n              "}
                  <button onClick={v.pickText} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className={P.scp1}>
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {tx("Fra fil")}
                    </span>
                    <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      {tx(".txt eller .csv")}
                    </span>
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                    <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                      2
                    </span>
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {tx("Se over og rediger")}
                    </span>
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"2px"}}>
                    {"\n                "}
                    <button onClick={v.clearText} style={{"height":"28px","padding":"0 8px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp7}>
                      {tx("Tøm")}
                    </button>
                    {"\n                "}
                    <button onClick={v.saveStandard} style={{"height":"28px","padding":"0 8px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp7}>
                      {tx("Lagre som standard uke")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <textarea value={val(v.programText)} onChange={v.onProgramText} spellCheck={false} placeholder={tx("Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen")} style={{"minHeight":"240px","resize":"vertical","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","fontFamily":"ui-monospace, Menlo, Consolas, monospace","fontSize":"13px","lineHeight":"1.7","outline":"none"}} className={P.scp3} />
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.55","textWrap":"pretty"}}>
                  {tx("Én linje per møte: ukedag, dato, tid og navn. Linjer uten ukedag, eller som starter med «Ekstra:», legges til som ekstra utenom uka. Linjer som starter med dato («3. september kl 18:30: …») blir egne slides.")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <span style={{"fontSize":"13px","fontWeight":"700"}}>
                  {tx("Legg til møte")}
                </span>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Ukedag")}
                    </span>
                    {"\n                "}
                    <select value={val(v.addF?.day)} onChange={v.addOn?.day} style={{"height":"38px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%","cursor":"pointer"}}>
                      {"\n                  "}
                      {list(v.addDays).map(($it1, $i1) => {
                        const v1 = { ...v, "d": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option value={val(v1.d?.v)}>
                            {tx(v1.d?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </select>
                    {"\n              "}
                  </label>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Dato")}
                    </span>
                    <input value={val(v.addF?.date)} onChange={v.addOn?.date} onKeyDown={v.addKey} placeholder={tx("25. aug")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Tid")}
                    </span>
                    <input type="time" value={val(v.addF?.time)} onChange={v.addOn?.time} onKeyDown={v.addKey} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%","colorScheme":"dark"}} />
                  </label>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1.6fr) minmax(0,1fr)","gap":"8px"}}>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Navn")}
                    </span>
                    <input value={val(v.addF?.title)} onChange={v.addOn?.title} onKeyDown={v.addKey} placeholder={tx("Kveldsmat i kafeen")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Sted")}
                    </span>
                    <input value={val(v.addF?.place)} onChange={v.addOn?.place} onKeyDown={v.addKey} placeholder={tx("Valgfritt")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n            "}
                </div>
                {"\n            "}
                <button onClick={v.addMeeting} style={{"alignSelf":"flex-start","height":"36px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp6}>
                  {tx("+ Legg til")}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  <span style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                    3
                  </span>
                  <span style={{"fontSize":"13px","fontWeight":"700"}}>
                    {tx("Lag videoen")}
                  </span>
                </div>
                {"\n            "}
                <button onClick={v.applyProgram} style={{"height":"44px","width":"100%","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"14px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                  {tx("Oppdater videoen")}
                </button>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f"}}>
                  {tx("Tom tekstboks gir standarduken.")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              {v.hasParseMsg ? <>
                {"\n            "}
                <div style={css(`font-size:13px; line-height:1.5; padding:10px 12px; border-radius:8px; background:#121212; color:${v.parseColor ?? ""};`)}>
                  {I(v.parseMsg)}
                </div>
                {"\n          "}
              </> : null}
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {tx("Standard uke")}
                    </span>
                    {"\n                "}
                    <span style={{"fontSize":"12px","color":"#9d998f"}}>
                      {tx("Brukes når tekstboksen er tom, og av knappen «Standard uke».")}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.stdClosed ? <>
                    {"\n                "}
                    <button onClick={v.openStd} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","flex":"0 0 auto"}} className={P.scp1}>
                      {tx("Endre")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.stdOpen ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    <textarea value={val(v.stdDraft)} onChange={v.onStdDraft} spellCheck={false} style={{"minHeight":"130px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","fontFamily":"ui-monospace, Menlo, Consolas, monospace","fontSize":"12.5px","lineHeight":"1.7","outline":"none"}} className={P.scp3} />
                    {"\n                "}
                    <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                      {"\n                  "}
                      <button onClick={v.saveStdDraft} style={{"height":"34px","padding":"0 14px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                        {tx("Lagre standard uke")}
                      </button>
                      {"\n                  "}
                      <button onClick={v.closeStd} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                        {tx("Avbryt")}
                      </button>
                      {"\n                  "}
                      <button onClick={v.resetStd} style={{"height":"34px","padding":"0 6px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","marginLeft":"auto"}} className={P.scp4}>
                        {tx("Tilbakestill")}
                      </button>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"13px","fontWeight":"700"}}>
                      {tx("Faste bilder")}
                    </span>
                    {"\n                "}
                    <span style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                      {tx("Hvert møtenavn får alltid sitt eget bakgrunnsbilde. ")}{I(v.ruleCount)}.
                    </span>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.rulesClosed ? <>
                    {"\n                "}
                    <button onClick={v.openRules} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","flex":"0 0 auto"}} className={P.scp1}>
                      {tx("Endre")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.rulesOpen ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    {v.hasRulesOrientNote ? <>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","color":"#c9c5bc","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.rulesOrientNote)}
                      </span>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.sharedNote ? <span data-ch-shared-note="1" style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>{I(v.sharedNote)}</span> : null}
                    {v.rulesReadOnly ? <span data-ch-rules-readonly="1" style={{"fontSize":"12px","color":"#f5d38f","textWrap":"pretty"}}>{I(v.rulesReadOnlyNote)}</span> : null}
                    {list(v.rules).map(($it1, $i1) => {
                      const v1 = { ...v, "r": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #262626","borderRadius":"8px","background":"#141414"}}>
                          {"\n                    "}
                          <div style={{"display":"flex","gap":"10px","alignItems":"center"}}>
                            {"\n                      "}
                            <button onClick={v1.r?.toggleGallery} title={tx("Bytt bilde")} style={css(`position:relative; width:${v1.ruleThumbW ?? ""}; height:54px; flex:0 0 auto; padding:0; border:1px solid ${v1.r?.thumbBorder ?? ""}; border-radius:999px; background-color:#000; background-image:${v1.r?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer; color:#9d998f; font:inherit; font-size:11px; font-weight:600;`)} className={P.scp1}>
                              {"\n                        "}
                              {v1.r?.noImg ? <>
                                <span>
                                  {tx("Velg bilde")}
                                </span>
                              </> : null}
                              {"\n                      "}
                            </button>
                            {"\n                      "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"4px","flex":"1","minWidth":"0"}}>
                              {"\n                        "}
                              <input value={val(v1.r?.kw)} onChange={v1.r?.onKw} readOnly={!v1.rulesEdit} placeholder={tx("Møtenavn, f.eks. Seniortreff")} style={{"height":"34px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","fontWeight":"600","outline":"none","minWidth":"0"}} className={P.scp3} />
                              {"\n                        "}
                              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                                {"\n                          "}
                                <div style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
                                  {"\n                            "}
                                  {v1.rulesEdit ? <button onClick={v1.r?.toggleGallery} style={{"border":"0","padding":"0","background":"transparent","color":"#e9e7e2","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp9}>
                                    {I(v1.r?.galleryLabel)}
                                  </button> : null}
                                  {"\n                            "}
                                  {v1.r?.hasImg && v1.rulesEdit ? <>
                                    <button onClick={v1.r?.clearImg} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scpa}>
                                      {tx("Fjern bilde")}
                                    </button>
                                  </> : null}
                                  {"\n                          "}
                                </div>
                                {"\n                          "}
                                <span style={{"fontSize":"11px","color":"#6f6b64"}}>
                                  {I(v1.r?.hits)}
                                </span>
                                {"\n                        "}
                              </div>
                              {"\n                      "}
                            </div>
                            {"\n                      "}
                            {v1.rulesEdit ? <button onClick={v1.r?.del} data-ch-rule-del="1" title={tx("Fjern fast bilde")} aria-label={tx("Fjern fast bilde")} style={{"width":"28px","height":"28px","flex":"0 0 auto","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"16px","cursor":"pointer","alignSelf":"flex-start"}} className={P.scpb}>
                              ×
                            </button> : null}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          {v1.r?.galleryOpen ? <>
                            {"\n                      "}
                            <div style={css(`display:grid; grid-template-columns:${v1.galCols ?? ""}; gap:6px; padding-top:8px; border-top:1px solid #262626;`)}>
                              {"\n                        "}
                              {list(v1.r?.gallery).map(($it2, $i2) => {
                                const v2 = { ...v1, "g": $it2, $index: $i2 };
                                return <React.Fragment key={$i2}>
                                  {"\n                          "}
                                  <button onClick={v2.g?.pick} style={css(`aspect-ratio:${v2.galAspect ?? ""}; padding:0; border:2px solid ${v2.g?.border ?? ""}; border-radius:5px; background-color:#000; background-image:${v2.g?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer;`)} className={P.scp1} />
                                  {"\n                        "}
                                </React.Fragment>;
                              })}
                              {"\n                        "}
                              <button onClick={v1.r?.upload} style={css(`aspect-ratio:${v1.galAspect ?? ""}; padding:0; border:1px dashed #555; border-radius:5px; background:transparent; color:#f3f1ec; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`)} className={P.scp1}>
                                {tx("+ Last opp")}
                              </button>
                              <button onClick={v1.r?.fromShared} data-ch-rule-shared="1" style={css(`aspect-ratio:${v1.galAspect ?? ""}; padding:0; border:1px dashed #555; border-radius:5px; background:transparent; color:#f3f1ec; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`)}>
                                {tx("Fellesmappe")}
                              </button>
                              {"\n                      "}
                            </div>
                            {"\n                    "}
                          </> : null}
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    {v.rulesEdit ? <button onClick={v.addRule} style={{"alignSelf":"flex-start","height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                      {tx("+ Legg til møte")}
                    </button> : null}
                    {"\n                "}
                    <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                      {"\n                  "}
                      <button onClick={v.saveRules} style={{"height":"34px","padding":"0 14px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                        {tx("Ferdig")}
                      </button>
                      {"\n                  "}
                      <button onClick={v.closeRules} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                        {tx("Avbryt")}
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                      {tx("Endringer brukes på slidene med en gang. Avbryt angrer alt.")}
                    </span>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                      {tx("Store og små bokstaver spiller ingen rolle. Treffer flere navn, vinner det lengste («Seniortreff» før «treff»).")}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.55","textWrap":"pretty","paddingTop":"4px","borderTop":"1px solid #262626"}}>
                {tx("Bildene huskes per møte. Kommer «Tirsdag Kveldsmat» igjen neste uke, beholder den bildet sitt. Nye møter får bildet som sist ble brukt på samme ukedag.")}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isSlides ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","padding":"5px 9px","borderRadius":"4px","background":"#e9e7e2","color":"#000000"}}>
                    {I(v.selTypeLabel)}
                  </span>
                  {"\n              "}
                  <span style={{"fontSize":"13px","color":"#9d998f"}}>
                    {I(v.selPos)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","gap":"4px"}}>
                  {"\n              "}
                  <button onClick={v.prevSlide} style={{"width":"34px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className={P.scp2}>
                    ‹
                  </button>
                  {"\n              "}
                  <button onClick={v.nextSlide} style={{"width":"34px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className={P.scp2}>
                    ›
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              {v.isDay ? <>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Ukedag")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.day ? <>
                            <button onClick={v.tcReset?.day} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.day ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.day)} onChange={v.tcOn?.day} aria-label={tx("Tekstfarge for Ukedag")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.day)} onChange={v.on?.day} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Dato")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          <button onClick={v.toggleDateLink} title={tx(v.dateLinkTitle)} aria-label={tx(v.dateLinkTitle)} style={css(`width:22px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.dateLinkBg ?? ""}; color:${v.dateLinkColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                            </svg>
                          </button>
                          {v.tcSet?.date ? <>
                            <button onClick={v.tcReset?.date} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.date ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.date)} onChange={v.tcOn?.date} aria-label={tx("Tekstfarge for Dato")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.date)} onChange={v.on?.date} placeholder={tx("25. aug")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Tid")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.time ? <>
                            <button onClick={v.tcReset?.time} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.time ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.time)} onChange={v.tcOn?.time} aria-label={tx("Tekstfarge for Tid")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.time)} onChange={v.on?.time} placeholder={tx("kl 19:00")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Navn på møtet")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.title ? <>
                          <button onClick={v.tcReset?.title} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.title ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.title)} onChange={v.tcOn?.title} aria-label={tx("Tekstfarge for Navn på møtet")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.title)} onChange={v.on?.title} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Sted eller ekstra info (valgfritt)")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.place ? <>
                          <button onClick={v.tcReset?.place} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.place ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.place)} onChange={v.tcOn?.place} aria-label={tx("Tekstfarge for Sted eller ekstra info (valgfritt)")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.place)} onChange={v.on?.place} placeholder={tx("F.eks. Kafeen")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"fontSize":"12px","color":"#9d998f"}}>
                    {tx("Endringer her oppdaterer også ukeprogrammet.")}
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isText ? <>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Merkelapp")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.kicker ? <>
                            <button onClick={v.tcReset?.kicker} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.kicker ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.kicker)} onChange={v.tcOn?.kicker} aria-label={tx("Tekstfarge for Merkelapp")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.kicker)} onChange={v.on?.kicker} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Tid-merke")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.pill ? <>
                            <button onClick={v.tcReset?.pill} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.pill ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.pill)} onChange={v.tcOn?.pill} aria-label={tx("Tekstfarge for Tid-merke")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.pill)} onChange={v.on?.pill} placeholder={tx("Søndag kl 11")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Tekst")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.body ? <>
                          <button onClick={v.tcReset?.body} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.body ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.body)} onChange={v.tcOn?.body} aria-label={tx("Tekstfarge for Tekst")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <textarea value={val(v.f?.body)} onChange={v.on?.body} style={{"minHeight":"120px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.5","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Undertekst")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.sub ? <>
                          <button onClick={v.tcReset?.sub} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.sub ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.sub)} onChange={v.tcOn?.sub} aria-label={tx("Tekstfarge for Undertekst")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.sub)} onChange={v.on?.sub} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isContact ? <>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Merkelapp")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.kicker ? <>
                          <button onClick={v.tcReset?.kicker} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.kicker ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.kicker)} onChange={v.tcOn?.kicker} aria-label={tx("Tekstfarge for Merkelapp")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.kicker)} onChange={v.on?.kicker} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Overskrift")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.headline ? <>
                          <button onClick={v.tcReset?.headline} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.headline ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.headline)} onChange={v.tcOn?.headline} aria-label={tx("Tekstfarge for Overskrift")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <textarea value={val(v.f?.headline)} onChange={v.on?.headline} style={{"minHeight":"64px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.5","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Tekst")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.text ? <>
                          <button onClick={v.tcReset?.text} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.text ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.text)} onChange={v.tcOn?.text} aria-label={tx("Tekstfarge for Tekst")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.text)} onChange={v.on?.text} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("E-post")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.email ? <>
                            <button onClick={v.tcReset?.email} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.email ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.email)} onChange={v.tcOn?.email} aria-label={tx("Tekstfarge for E-post")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.email)} onChange={v.on?.email} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Telefon")}
                        </span>
                        <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.phone ? <>
                            <button onClick={v.tcReset?.phone} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                              ↺
                            </button>
                          </> : null}
                          <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.phone ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                            <input type="color" value={val(v.tc?.phone)} onChange={v.tcOn?.phone} aria-label={tx("Tekstfarge for Telefon")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input value={val(v.f?.phone)} onChange={v.on?.phone} placeholder={tx("Valgfritt")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"12px","alignItems":"flex-start"}}>
                    {"\n                "}
                    <label style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("QR-kode peker til")}
                      </span>
                      {"\n                  "}
                      <input value={val(v.f?.qrUrl)} onChange={v.on?.qrUrl} placeholder={tx("https://… eller mailto:…")} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                      {"\n                  "}
                      <span style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.5"}}>
                        {tx("Nettside, skjema, «mailto:adresse» eller «tel:nummer». Tomt felt skjuler QR-koden.")}
                      </span>
                      {"\n                "}
                    </label>
                    {"\n                "}
                    {v.hasQr ? <>
                      {"\n                  "}
                      <div role="img" aria-label={tx("QR")} title={tx("QR")} style={css(`width:84px; height:84px; flex:0 0 auto; margin-top:22px; border-radius:6px; background-color:#fff; background-image:${v.qrImgCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; image-rendering:pixelated;`)} />
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.hasQr ? <>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"12px","border":"1px solid #262626","borderRadius":"8px","background":"#141414"}}>
                      {"\n                  "}
                      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
                        {"\n                    "}
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Plassering av QR-koden")}
                        </span>
                        {"\n                    "}
                        <button onClick={v.resetQrPos} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                          {tx("Standard")}
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                        {"\n                    "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          {"\n                      "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span>
                              {tx("Vannrett")}
                            </span>
                            <span>
                              {I(v.qrXPct)}{" %"}
                            </span>
                          </span>
                          {"\n                      "}
                          <input type="range" min="0" max="100" step="1" value={val(v.qrXPct)} onChange={v.onQrX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                    "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          {"\n                      "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span>
                              {tx("Loddrett")}
                            </span>
                            <span>
                              {I(v.qrYPct)}{" %"}
                            </span>
                          </span>
                          {"\n                      "}
                          <input type="range" min="0" max="100" step="1" value={val(v.qrYPct)} onChange={v.onQrY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        {"\n                    "}
                        <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                          <span>
                            {tx("Størrelse")}
                          </span>
                          <span>
                            {I(v.qrSizeVal)}
                          </span>
                        </span>
                        {"\n                    "}
                        <input type="range" min="160" max="520" step="10" value={val(v.qrSizeVal)} onChange={v.onQrSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                  "}
                      </label>
                      {"\n                  "}
                      <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                        {tx("Du kan også dra QR-koden i forhåndsvisningen. Den flytter seg automatisk unna logoen.")}
                      </span>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isOutro ? <>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Tittel")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.title ? <>
                          <button onClick={v.tcReset?.title} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.title ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.title)} onChange={v.tcOn?.title} aria-label={tx("Tekstfarge for Tittel")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.title)} onChange={v.on?.title} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Undertekst")}
                      </span>
                      <span style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.sub ? <>
                          <button onClick={v.tcReset?.sub} title={tx("Tilbakestill farge")} aria-label={tx("Tilbakestill farge")} style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scp4}>
                            ↺
                          </button>
                        </> : null}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.sub ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`)}>
                          <input type="color" value={val(v.tc?.sub)} onChange={v.tcOn?.sub} aria-label={tx("Tekstfarge for Undertekst")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input value={val(v.f?.sub)} onChange={v.on?.sub} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Legg til på sliden")}
                </span>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0,1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.freeAdd).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.b?.onClick} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","minHeight":"62px","padding":"10px 12px","border":"1px dashed #3a3a3a","borderRadius":"12px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className={P.scp5}>
                        <span style={{"fontSize":"13px","fontWeight":"700"}}>
                          {"+ "}{I(v1.b?.label)}
                        </span>
                        <span style={{"fontSize":"11px","color":"#8a867e","lineHeight":"1.3"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.noFree ? <>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45","textWrap":"pretty"}}>
                    {tx("Det du legger til, kan dras fritt i forhåndsvisningen. Dra i hjørnene for å endre størrelse.")}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.ftextRows).map(($it1, $i1) => {
                  const v1 = { ...v, "t": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={css(`display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid ${v1.t?.border ?? ""}; border-radius:12px; background:#0c0c0c;`)}>
                      {"\n                "}
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <button onClick={v1.t?.onSelect} style={{"height":"26px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                  "}
                        <button onClick={v1.t?.onRemove} style={{"height":"26px","minHeight":"0","padding":"0 8px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className={P.scp4}>
                          {tx("Fjern")}
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <textarea value={val(v1.t?.text)} onChange={v1.t?.onText} rows={2} style={{"padding":"8px 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.4","resize":"vertical","outline":"none"}} className={P.scp3} />
                      {"\n                "}
                      <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) 40px","gap":"10px","alignItems":"end"}}>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"11.5px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Størrelse")}
                            </span>
                            <span style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                              <input type="text" inputMode="decimal" value={val(v1.t?.sz?.numVal)} onChange={v1.t?.sz?.onNum} onBlur={v1.t?.sz?.onNumBlur} onKeyDown={v1.t?.sz?.onNumKey} onFocus={v1.t?.sz?.onNumFocus} aria-label={tx("Størrelse")} style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                              <button type="button" onClick={v1.t?.sz?.cycleUnit} title={tx(v1.t?.sz?.unitTitle)} aria-label={tx(v1.t?.sz?.unitTitle)} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                                {I(v1.t?.sz?.unit)}
                              </button>
                            </span>
                          </span>
                          <input type="range" min="20" max="800" step="5" value={val(v1.t?.sizePct)} onChange={v1.t?.onSize} aria-label={tx("Størrelse")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </div>
                        {"\n                  "}
                        <span data-keep-color="1" title={tx("Tekstfarge")} style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.t?.color ?? ""}; overflow:hidden; cursor:pointer;`)}>
                          <input type="color" value={val(v1.t?.color)} onChange={v1.t?.onColor} aria-label={tx("Tekstfarge")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        {"\n                  "}
                        {list(v1.t?.actions).map(($it2, $i2) => {
                          const v2 = { ...v1, "a": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            <button onClick={v2.a?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:1px solid ${v2.a?.border ?? ""}; border-radius:999px; background:${v2.a?.bg ?? ""}; color:${v2.a?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                              {I(v2.a?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                {v.hasFqr ? <>
                  {"\n              "}
                  <div style={css(`display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid ${v.fqrBorder ?? ""}; border-radius:12px; background:#0c0c0c;`)}>
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      {"\n                  "}
                      <button onClick={v.fqrSelect} style={{"height":"26px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                        {tx("QR-kode og kontakt")}
                      </button>
                      {"\n                  "}
                      <button onClick={v.fqrRemove} title={tx("Slett QR-koden fra sliden")} style={{"height":"28px","minHeight":"0","padding":"0 12px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scpc}>
                        {tx("Slett QR-kode")}
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Hva skal koden åpne?")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"4px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","flexWrap":"wrap","width":"max-content","maxWidth":"100%"}}>
                        {"\n                    "}
                        {list(v.fqrKinds).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.o?.onClick} style={css(`height:28px; min-height:0; padding:0 11px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                              {I(v1.o?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                        {I(v.fqrValLabel)}
                      </span>
                      <input value={val(v.fqrVal)} onChange={v.onFqrVal} placeholder={tx(v.fqrValPh)} inputMode={v.fqrValMode} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className={P.scp3} />
                    </label>
                    {"\n                "}
                    {v.fqrHasExtra ? <>
                      {"\n                  "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          {I(v.fqrExtraLabel)}
                        </span>
                        <input value={val(v.fqrExtra)} onChange={v.onFqrExtra} placeholder={tx(v.fqrExtraPh)} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className={P.scp3} />
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                      {I(v.fqrHint)}
                    </span>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                      {"\n                  "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Tekst under")}
                        </span>
                        <input value={val(v.fqrCaption)} onChange={v.onFqrCaption} placeholder={tx("Skann meg")} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className={P.scp3} />
                      </label>
                      {"\n                  "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          {tx("Kontakt")}
                        </span>
                        <input value={val(v.fqrContact)} onChange={v.onFqrContact} placeholder={tx("E-post eller telefon")} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className={P.scp3} />
                      </label>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Størrelse")}
                        </span>
                        <span>
                          {I(v.fqrSize)}{tx(" px")}
                        </span>
                      </span>
                      <input type="range" min="60" max="1000" step="10" value={val(v.fqrSize)} onChange={v.onFqrSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    </label>
                    {"\n                "}
                    {v.fqrNoUrl ? <>
                      <span style={{"fontSize":"11.5px","color":"#b3afa6"}}>
                        {tx("Viser en eksempelkode til du fyller inn feltet over.")}
                      </span>
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.pipRows).map(($it1, $i1) => {
                  const v1 = { ...v, "p": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={css(`display:grid; grid-template-columns:60px minmax(0,1fr); gap:12px; padding:10px; border:1px solid ${v1.p?.border ?? ""}; border-radius:12px; background:#0c0c0c;`)}>
                      {"\n                "}
                      <button onClick={v1.p?.onSelect} title={tx("Marker i forhåndsvisningen")} aria-label={tx("Marker bildet")} style={css(`width:60px; height:60px; min-height:0; padding:0; border:0; border-radius:8px; background-color:#000; background-image:${v1.p?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer;`)} />
                      {"\n                "}
                      <div style={{"display":"flex","flexDirection":"column","gap":"8px","minWidth":"0"}}>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Størrelse")}
                            </span>
                            <span>
                              {I(v1.p?.sizePct)}{" %"}
                            </span>
                          </span>
                          <input type="range" min="3" max="150" step="1" value={val(v1.p?.sizePct)} onChange={v1.p?.onSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Runde hjørner")}
                            </span>
                            <span>
                              {I(v1.p?.radius)}{tx(" px")}
                            </span>
                          </span>
                          <input type="range" min="0" max="200" step="1" value={val(v1.p?.radius)} onChange={v1.p?.onRadius} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Synlighet")}
                            </span>
                            <span>
                              {I(v1.p?.opPct)}{" %"}
                            </span>
                          </span>
                          <input type="range" min="10" max="100" step="1" value={val(v1.p?.opPct)} onChange={v1.p?.onOp} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                          {"\n                    "}
                          {list(v1.p?.actions).map(($it2, $i2) => {
                            const v2 = { ...v1, "a": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              {"\n                      "}
                              <button onClick={v2.a?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:1px solid ${v2.a?.border ?? ""}; border-radius:999px; background:${v2.a?.bg ?? ""}; color:${v2.a?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                                {I(v2.a?.label)}
                              </button>
                              {"\n                    "}
                            </React.Fragment>;
                          })}
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    {tx("Video på sliden")}
                  </span>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                    {tx("Maks 5 min")}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                {v.noSlideVid ? <>
                  {"\n              "}
                  <button onClick={v.pickSlideVid} style={{"alignSelf":"flex-start","height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp2}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="14" height="14" rx="2" />
                      <path d="m16 10 6-3v10l-6-3" />
                    </svg>
                    <span>
                      {tx("Legg til video…")}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                    {tx("Videoen vises i stedet for bakgrunnsbildet, og sliden varer like lenge som videoen.")}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasSlideVid ? <>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","gap":"10px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e9e7e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{"flex":"0 0 auto"}}>
                      <rect x="2" y="5" width="14" height="14" rx="2" />
                      <path d="m16 10 6-3v10l-6-3" />
                    </svg>
                    {"\n                "}
                    <div style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"13px","fontWeight":"600","color":"#f3f1ec","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
                        {I(v.slideVidName)}
                      </span>
                      {"\n                  "}
                      <span style={{"fontSize":"11.5px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                        {I(v.slideVidLen)}{tx(" · sliden varer like lenge")}
                      </span>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button onClick={v.pickSlideVid} style={{"flex":"0 0 auto","height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                      {tx("Bytt")}
                    </button>
                    {"\n                "}
                    <button onClick={v.removeSlideVid} style={{"flex":"0 0 auto","height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                      {tx("Fjern")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Lyd fra videoen")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"4px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d"}}>
                        {"\n                    "}
                        <button onClick={v.vidSoundOn} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidSoundOnBg ?? ""}; color:${v.vidSoundOnFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                          {tx("På")}
                        </button>
                        {"\n                    "}
                        <button onClick={v.vidSoundOff} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidSoundOffBg ?? ""}; color:${v.vidSoundOffFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                          {tx("Av")}
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Loop-musikken")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"4px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d"}}>
                        {"\n                    "}
                        <button onClick={v.vidMusicOn} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidMusicOnBg ?? ""}; color:${v.vidMusicOnFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                          {tx("Spill")}
                        </button>
                        {"\n                    "}
                        <button onClick={v.vidMusicOff} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidMusicOffBg ?? ""}; color:${v.vidMusicOffFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                          {tx("Demp")}
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.vidSoundIsOn ? <>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Videovolum")}
                        </span>
                        <span>
                          {I(v.vidVolPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="0" max="100" step="5" value={val(v.vidVolPct)} onChange={v.onVidVol} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                    {I(v.vidAudioNote)}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {I(v.bgHeading)}
                </span>
                {"\n            "}
                <div style={css(`position:relative; width:${v.bgBoxW ?? ""}; aspect-ratio:${v.bgAspect ?? ""}; border-radius:8px; border:1px solid #2b2b2b; background-color:#000; background-image:${v.selBgCss ?? ""}; background-size:cover; background-position:${v.bgPos ?? ""}; overflow:hidden;`)}>
                  {"\n              "}
                  {v.noBg ? <>
                    {"\n                "}
                    <span style={{"position":"absolute","left":"10px","bottom":"8px","fontSize":"11.5px","color":"#9d998f","pointerEvents":"none"}}>
                      {tx("Ingen bilde – grunnvideoen vises")}
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n\n            "}
                {v.bgSourceNote ? <span data-ch-bg-source="1" style={{"fontSize":"12px","color":"#9d998f"}}>{I(v.bgSourceNote)}</span> : null}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.pickImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {I(v.pickBgLabel)}
                  </button>
                  {"\n              "}
                  <button onClick={v.pickBgShared} data-ch-shared-bg="1" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Fellesmappe")}
                  </button>
                  {"\n              "}
                  <button onClick={v.pickSharedImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Fra delt mappe")}
                  </button>
                  {"\n              "}
                  {v.hasBg ? <>
                    {"\n                "}
                    <button onClick={v.editImg} title={tx("Flytt utsnittet eller beskjær bildet")} style={{"height":"34px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp8}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                      </svg>
                      <span>
                        {tx("Beskjær / flytt bilde")}
                      </span>
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.hasRuleOpts ? <>
                    {"\n                "}
                    <button onClick={v.toggleRulePick} aria-expanded={v.rulePickOpen} style={css(`height:34px; padding:0 14px; border:1px solid ${v.rulePickBorder ?? ""}; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`)} className={P.scp1}>
                      {I(v.rulePickLabel)}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.canRemoveBg ? <>
                    {"\n                "}
                    <button onClick={v.removeImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                      {I(v.removeBgLabel)}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.ruleLinked ? <>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","padding":"8px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <span style={{"display":"flex","alignItems":"baseline","gap":"6px","minWidth":"0","fontSize":"12px","color":"#9d998f"}}>
                      <span>
                        {tx("Koblet til fast bilde")}
                      </span>
                      <span style={{"color":"#f3f1ec","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v.ruleLinkedName)}
                      </span>
                    </span>
                    {"\n                "}
                    <button onClick={v.unlinkRule} style={{"flex":"0 0 auto","border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scpa}>
                      {tx("Fjern kobling")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.rulePickOpen ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                      {tx("Velg hvilket fast bilde sliden hører til. Når du bytter det faste bildet, byttes det her også.")}
                    </span>
                    {"\n                "}
                    <div style={css(`display:grid; grid-template-columns:${v.galCols ?? ""}; gap:8px;`)}>
                      {"\n                  "}
                      {list(v.rulePickList).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <button onClick={v1.o?.pick} title={tx(v1.o?.name)} style={{"display":"flex","flexDirection":"column","gap":"4px","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","minWidth":"0","textAlign":"left"}}>
                            {"\n                      "}
                            <span style={css(`display:block; width:100%; aspect-ratio:${v1.galAspect ?? ""}; border:2px solid ${v1.o?.border ?? ""}; border-radius:5px; background-color:#000; background-image:${v1.o?.thumb ?? ""}; background-size:cover; background-position:center;`)} />
                            {"\n                      "}
                            <span style={{"fontSize":"11px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                              {I(v1.o?.name)}
                            </span>
                            {"\n                    "}
                          </button>
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
                <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <button onClick={v.fillToggleBox} aria-expanded={v.fillOpenBox} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","textAlign":"left"}}>
                    {"\n                "}
                    <span style={{"display":"flex","alignItems":"center","gap":"10px","minWidth":"0"}}>
                      {"\n                  "}
                      <span data-keep-color="1" style={css(`flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`)} />
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                        {tx("Bakgrunnsfarge")}
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
                      {tx("Type")}
                    </span>
                    {"\n              "}
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(92px, 1fr))","gap":"5px"}}>
                      {"\n                "}
                      {list(v.fillModes).map(($it1, $i1) => {
                        const v1 = { ...v, "m": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                  "}
                          <button onClick={v1.m?.onClick} style={css(`height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.m?.bg ?? ""}; color:${v1.m?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>
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
                      <div data-keep-color="1" style={css(`height:44px; border-radius:8px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`)} />
                      {"\n                "}
                      {v.fillSolidOnly ? <>
                        {"\n                  "}
                        <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                          <label data-keep-color="1" title={tx("Farge")} style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v.fillSolidC ?? ""}; overflow:hidden; cursor:pointer;`)}>
                            <input type="color" value={val(v.fillSolidC)} onChange={v.onFillSolid} aria-label={tx("Farge")} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </label>
                          <span style={{"fontSize":"12px","color":"#9d998f"}}>
                            {tx("Trykk på fargen for å endre den")}
                          </span>
                          <button onClick={v.fillHarmonyOne} title={tx("Tilfeldige farger som passer")} aria-label={tx("Tilfeldige farger som passer")} style={{"marginLeft":"auto","flex":"0 0 auto","width":"28px","height":"28px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className={P.scpd}>
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
                            {tx("Gradientfarger")}
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
                                  <button onClick={v1.q?.up} title={tx("Flytt opp i rekkefølgen")} aria-label={tx("Flytt fargen opp")} style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.upOp ?? ""};`)}>
                                    ▲
                                  </button>
                                  {"\n                          "}
                                  <button onClick={v1.q?.down} title={tx("Flytt ned i rekkefølgen")} aria-label={tx("Flytt fargen ned")} style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.downOp ?? ""};`)}>
                                    ▼
                                  </button>
                                  {"\n                        "}
                                </div>
                                {"\n                        "}
                                <label data-keep-color="1" title={`Farge ${v1.q?.num ?? ""}`} style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v1.q?.c ?? ""}; overflow:hidden; cursor:pointer;`)}>
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
                                  <button onClick={v1.q?.del} title={tx("Fjern farge")} aria-label={tx("Fjern farge")} style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"15px","cursor":"pointer"}} className={P.scpa}>
                                    ×
                                  </button>
                                </> : null}
                                {"\n                      "}
                              </div>
                              {"\n                      "}
                              <div style={{"display":"grid","gridTemplateColumns":"60px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px","margin":"-2px 0 6px 30px"}}>
                                {"\n                        "}
                                <span style={{"fontSize":"11px","color":"#6f6b64"}}>
                                  {tx("Mengde")}
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
                                  <button onClick={v1.q?.toggleHard} title={tx("Skarp eller myk overgang til neste farge")} style={css(`height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.q?.hardBg ?? ""}; color:${v1.q?.hardFg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`)}>
                                    {tx("Skarp kant til neste")}
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
                                {tx("+ Legg til farge")}
                              </button>
                            </> : null}
                            {"\n                      "}
                            <button onClick={v.fillHarmony} title={tx("Tilfeldige farger som passer")} aria-label={tx("Tilfeldige farger som passer")} style={{"width":"30px","height":"30px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className={P.scpd}>
                              <span aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                              </span>
                            </button>
                            {"\n                      "}
                            <button onClick={v.fillReverse} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                              {tx("⇄ Snu")}
                            </button>
                            {"\n                      "}
                            <button onClick={v.fillEven} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                              {tx("Fordel jevnt")}
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
                              {tx("Retning")}
                            </span>
                            <span style={{"fontVariantNumeric":"tabular-nums"}}>
                              {I(v.fillAngle)}°
                            </span>
                          </span>
                          {"\n                    "}
                          <input type="range" min="0" max="360" step="1" value={val(v.fillAngle)} onChange={v.onFillAngle} aria-label={tx("Retning")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
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
                              {tx("Overgang")}
                            </span>
                            <span style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                              <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                {I(v.fillSoft)}{" %"}
                              </span>
                              <button onClick={v.fillSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                {tx("Standard")}
                              </button>
                            </span>
                          </span>
                          {"\n                    "}
                          <input type="range" min="0" max="100" step="1" value={val(v.fillSoft)} onChange={v.onFillSoft} aria-label={tx("Overgang")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                            <span>
                              {tx("Skarp kant")}
                            </span>
                            <span>
                              {tx("Myk, diffus")}
                            </span>
                          </span>
                          {"\n                  "}
                        </div>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Skarphet")}
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
                          <input type="range" min="0" max="100" step="1" value={val(v.fillSharp)} onChange={v.onFillSharp} aria-label={tx("Skarphet")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                            <span>
                              {tx("Myke overganger")}
                            </span>
                            <span>
                              {tx("Skarpe kanter")}
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
                                {tx("Antall gjentakelser")}
                              </span>
                              <span style={{"fontVariantNumeric":"tabular-nums"}}>
                                {I(v.fillRep)}
                              </span>
                            </span>
                            {"\n                      "}
                            <input type="range" min="1" max="20" step="1" value={val(v.fillRep)} onChange={v.onFillRep} aria-label={tx("Antall gjentakelser")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
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
                          <button onClick={v.fillCenter} style={{"flex":"0 0 auto","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                            {tx("Midtstill")}
                          </button>
                        </> : null}
                      </div>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.panShown ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                        {tx("Flytt utsnittet")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                        {"\n                  "}
                        <button onClick={v.panReset} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                          {tx("Midtstill")}
                        </button>
                        {"\n                  "}
                        <button onClick={v.panToggle} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"700","cursor":"pointer"}} className={P.scp9}>
                          {tx("Ferdig")}
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.panCanX ? <>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <span style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          {tx("Venstre")}
                        </span>
                        {"\n                    "}
                        <input type="range" min="0" max="100" step="1" value={val(v.panXPct)} onChange={v.onPanX} aria-label={tx("Flytt bildet vannrett")} style={{"flex":"1 1 auto","minWidth":"0","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          {tx("Høyre")}
                        </span>
                        {"\n                  "}
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.panCanY ? <>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <span style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          {tx("Topp")}
                        </span>
                        {"\n                    "}
                        <input type="range" min="0" max="100" step="1" value={val(v.panYPct)} onChange={v.onPanY} aria-label={tx("Flytt bildet loddrett")} style={{"flex":"1 1 auto","minWidth":"0","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          {tx("Bunn")}
                        </span>
                        {"\n                  "}
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                      {I(v.panHint)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasPortNote ? <>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty","marginTop":"-4px"}}>
                    {I(v.portNote)}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.isDayBg ? <>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"8px","alignItems":"flex-start","padding":"9px 11px","borderRadius":"8px","background":"#121212","fontSize":"12px","lineHeight":"1.5","color":"#c9c5bc"}}>
                    {"\n                "}
                    <div style={{"width":"3px","alignSelf":"stretch","background":"#e9e7e2","borderRadius":"2px","flex":"0 0 auto"}} />
                    {"\n                "}
                    <span style={{"textWrap":"pretty"}}>
                      {I(v.titleImgNote)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasBg ? <>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    {"\n                "}
                    <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span style={{"fontWeight":"600"}}>
                        {tx("Bildestyrke")}
                      </span>
                      <span>
                        {I(v.bgOpacityPct)}{" %"}
                      </span>
                    </span>
                    {"\n                "}
                    <input type="range" min="10" max="100" step="5" value={val(v.bgOpacityPct)} onChange={v.onBgOpacity} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasBg ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Fargefilter på denne sliden")}
                    </span>
                    {"\n                "}
                    <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.selTintOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.selTintCustom ? <>
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <label data-keep-color="1" style={css(`position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:${v.selTint ?? ""}; overflow:hidden; cursor:pointer;`)} title={tx("Velg farge")}>
                          <input type="color" value={val(v.selTint)} onChange={v.onSelTint} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </label>
                        {"\n                    "}
                        <input type="range" min="0" max="100" step="1" value={val(v.selTintAmtPct)} onChange={v.onSelTintAmt} aria-label={tx("Styrke")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span style={{"fontSize":"12px","color":"#9d998f","textAlign":"right"}}>
                          {I(v.selTintAmtPct)}%
                        </span>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                      {I(v.selTintNote)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"4px 12px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0c0c0c"}}>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                    {"\n                "}
                    <button onClick={v.toggleSlideStyle} aria-expanded={v.slideStyleAria} style={{"flex":"1","display":"flex","alignItems":"center","gap":"10px","height":"44px","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"13px","fontWeight":"700"}}>
                        {tx("Stil og effekter for denne sliden")}
                      </span>
                      {"\n                  "}
                      <span style={{"fontSize":"11.5px","color":"#8a867e"}}>
                        {I(v.slideStyleSummary)}
                      </span>
                      {"\n                  "}
                      <span style={{"marginLeft":"auto","color":"#8a867e","fontSize":"11px"}}>
                        {I(v.slideStyleArrow)}
                      </span>
                      {"\n                "}
                    </button>
                    {"\n                "}
                    {v.selOvAny ? <>
                      {"\n                  "}
                      <button onClick={v.selOvReset} style={{"height":"26px","minHeight":"0","padding":"0 8px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className={P.scp4}>
                        {tx("Tilbakestill")}
                      </button>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.slideStyleOpen ? <>
                    {"\n              "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"12px","paddingBottom":"12px"}}>
                      {"\n          "}
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","flexWrap":"wrap","paddingBottom":"12px","borderBottom":"1px solid #1f1f1f"}}>
                        {"\n            "}
                        <span style={{"fontSize":"12.5px","fontWeight":"600","color":"#f3f1ec"}}>
                          {tx("Fargepaneler på denne sliden")}
                        </span>
                        {"\n            "}
                        <div style={{"display":"flex","gap":"4px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                          {"\n              "}
                          {list(v.selPanelOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button onClick={v1.o?.onClick} style={css(`height:28px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                                {I(v1.o?.label)}
                              </button>
                            </React.Fragment>;
                          })}
                          {"\n            "}
                        </div>
                        {"\n            "}
                        {v.selPanelsActive ? <>
                          {"\n              "}
                          <button onClick={v.togglePanelEdit} style={css(`flex-basis:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; height:38px; padding:0 14px 0 8px; border:1px solid ${v.panelEditBorder ?? ""}; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)} className={P.scp1}>
                            {"\n                "}
                            <span style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                              <span style={{"display":"flex","gap":"3px"}}>
                                {list(v.selPanelDots).map(($it1, $i1) => {
                                  const v1 = { ...v, "d": $it1, $index: $i1 };
                                  return <React.Fragment key={$i1}>
                                    <span data-keep-color="1" style={css(`width:14px; height:14px; border-radius:4px; background:${v1.d?.color ?? ""}; opacity:${v1.d?.op ?? ""}; border:1px solid rgba(255,255,255,0.15);`)} />
                                  </React.Fragment>;
                                })}
                              </span>
                              <span>
                                {tx("Farger på panelene")}
                              </span>
                            </span>
                            {"\n                "}
                            <span style={{"color":"#8a867e"}}>
                              {I(v.panelEditArrow)}
                            </span>
                            {"\n              "}
                          </button>
                          {"\n            "}
                        </> : null}
                        {"\n            "}
                        {v.panelEditOpen ? <>
                          {"\n              "}
                          <div style={{"flexBasis":"100%","display":"flex","flexDirection":"column","gap":"10px","paddingTop":"4px"}}>
                            {"\n                "}
                            <div style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                              {"\n                  "}
                              <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                                {tx("Bakgrunn")}
                              </span>
                              {"\n                  "}
                              <label data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v.selPanelBg ?? ""}; overflow:hidden; cursor:pointer;`)} title={tx("Velg farge")}>
                                <input type="color" value={val(v.selPanelBg)} onChange={v.onSelPanelBg} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                              </label>
                              {"\n                  "}
                              <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                                {tx("Fargen bak panelene")}
                              </span>
                              {"\n                  "}
                              <span />
                              {"\n                "}
                            </div>
                            {"\n                "}
                            {list(v.selPanelRows).map(($it1, $i1) => {
                              const v1 = { ...v, "p": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                {"\n                  "}
                                <div style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                                  {"\n                    "}
                                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                                    {I(v1.p?.label)}
                                  </span>
                                  {"\n                    "}
                                  <label data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.p?.color ?? ""}; opacity:${v1.p?.swatchOpacity ?? ""}; overflow:hidden; cursor:pointer;`)} title={tx("Velg farge")}>
                                    <input type="color" value={val(v1.p?.color)} onChange={v1.p?.onColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                                  </label>
                                  {"\n                    "}
                                  <input type="range" min="0" max="100" step="1" value={val(v1.p?.alphaPct)} onChange={v1.p?.onAlpha} aria-label={tx("Gjennomsiktighet")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                  {"\n                    "}
                                  <span style={{"fontSize":"12px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                    {I(v1.p?.alphaPct)}%
                                  </span>
                                  {"\n                  "}
                                </div>
                                {"\n                "}
                              </React.Fragment>;
                            })}
                            {"\n                "}
                            <button onClick={v.selPanelRandom} style={{"alignSelf":"flex-start","display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className={P.scpd}>
                              <span aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                              </span>
                              <span>
                                {tx("Tilfeldige farger")}
                              </span>
                            </button>
                            {"\n                "}
                            <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","flexWrap":"wrap"}}>
                              {"\n                  "}
                              <span style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                                {I(v.selPanelNote)}
                              </span>
                              {"\n                  "}
                              {v.selPanelCustom ? <>
                                {"\n                    "}
                                <button onClick={v.selPanelReset} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                                  {tx("Bruk standardfarger")}
                                </button>
                                {"\n                  "}
                              </> : null}
                              {"\n                "}
                            </div>
                            {"\n              "}
                          </div>
                          {"\n            "}
                        </> : null}
                        {"\n          "}
                      </div>
                      {"\n              "}
                      <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"10px"}}>
                        {"\n                "}
                        {list(v.selOvRows).map(($it1, $i1) => {
                          const v1 = { ...v, "r": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                  "}
                            <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                              {"\n                    "}
                              <span style={css(`font-size:11.5px; font-weight:600; color:${v1.r?.labelColor ?? ""};`)}>
                                {I(v1.r?.label)}
                              </span>
                              {"\n                    "}
                              <select value={val(v1.r?.value)} onChange={v1.r?.onChange} style={css(`height:36px; padding:0 8px; border:1px solid ${v1.r?.border ?? ""}; border-radius:8px; background:#000; color:#f3f1ec; font:inherit; font-size:13px; outline:none; cursor:pointer; min-width:0;`)}>
                                {"\n                      "}
                                {list(v1.r?.options).map(($it2, $i2) => {
                                  const v2 = { ...v1, "op": $it2, $index: $i2 };
                                  return <React.Fragment key={$i2}>
                                    <option value={val(v2.op?.v)}>
                                      {tx(v2.op?.l)}
                                    </option>
                                  </React.Fragment>;
                                })}
                                {"\n                    "}
                              </select>
                              {"\n                  "}
                            </label>
                            {"\n                "}
                          </React.Fragment>;
                        })}
                        {"\n              "}
                      </div>
                      {"\n              "}
                      <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                        {tx("«Som standard» følger innstillingene under Effekter. Valg du gjør her, gjelder bare denne sliden.")}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.selVigOn)} onChange={v.onSelVig} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span>
                    {tx("Vignett på denne sliden")}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div style={css(`display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:${v.vigCtlOpacity ?? ""};`)}>
                  {"\n              "}
                  <button onClick={v.openVigEd} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp8}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    </svg>
                    <span>
                      {tx("Rediger vignett…")}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                    {I(v.vigSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.openOvEd} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp8}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="7" cy="8" r="2.5" />
                      <circle cx="16" cy="6" r="1.8" />
                      <circle cx="14" cy="15" r="3" />
                      <circle cx="6" cy="17" r="1.5" />
                    </svg>
                    <span>
                      {tx("Rediger overlegg…")}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                    {I(v.ovSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span style={{"fontWeight":"600"}}>
                      {tx("Varighet")}
                    </span>
                    <span>
                      {I(v.selDurLabel)}
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="2" max="15" step="0.5" value={val(v.selDur)} onChange={v.onSelDur} disabled={v.selDurLocked} style={css(`width:100%; accent-color:#e9e7e2; opacity:${v.selDurOp ?? ""};`)} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.selVisible)} onChange={v.onVisible} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span>
                    {tx("Vis i loopen")}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                {v.hasLogo ? <>
                  {"\n              "}
                  <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                    {"\n                "}
                    <input type="checkbox" checked={chk(v.selShowLogo)} onChange={v.onSelShowLogo} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                    {"\n                "}
                    <span>
                      {tx("Vis logo på denne sliden")}
                    </span>
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.moveEarlier} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("← Flytt")}
                  </button>
                  {"\n              "}
                  <button onClick={v.moveLater} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Flytt →")}
                  </button>
                  {"\n              "}
                  <button onClick={v.duplicate} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Dupliser")}
                  </button>
                  {"\n              "}
                  <button onClick={v.del} style={{"height":"34px","padding":"0 12px","border":"0","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scpe}>
                    {tx("Slett")}
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Legg til slide etter denne")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.addText} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                    {tx("+ Tekst")}
                  </button>
                  {"\n              "}
                  <button onClick={v.addContact} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                    {tx("+ Kontakt med QR")}
                  </button>
                  {"\n              "}
                  <button onClick={v.addOutro} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                    {tx("+ Avslutning")}
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isStyle ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Logo")}
                </span>
                {"\n            "}
                {v.hasLogo ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                      {"\n                  "}
                      <div style={{"width":"72px","height":"56px","flex":"0 0 auto","borderRadius":"8px","border":"1px solid #2b2b2b","background":"#000","display":"flex","alignItems":"center","justifyContent":"center","padding":"8px"}}>
                        {"\n                    "}
                        <div role="img" aria-label={tx("Logo")} style={css(`width:100%; height:100%; background-image:${v.logoPreviewCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center;`)} />
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        <button onClick={v.pickLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                          {tx("Bytt logo…")}
                        </button>
                        {"\n                    "}
                        <button onClick={v.pickLogoShared} data-ch-shared-logo="1" style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                          {tx("Fellesmappe")}
                        </button>
                        {"\n                    "}
                        <button onClick={v.removeLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                          {tx("Fjern")}
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                      {"\n                  "}
                      <input type="checkbox" checked={chk(v.logoOn)} onChange={v.onLogoOn} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                      {"\n                  "}
                      <span>
                        {tx("Vis logoen i videoen")}
                      </span>
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Plassering")}
                        </span>
                        {tx(" – dra logoen i forhåndsvisningen (dobbeltklikk for å bytte), eller velg et hjørne:")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"6px"}}>
                        {"\n                    "}
                        {list(v.logoCorners).map(($it1, $i1) => {
                          const v1 = { ...v, "lc": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button onClick={v1.lc?.onClick} style={{"width":"38px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className={P.scp1}>
                              {I(v1.lc?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Vannrett (venstre – høyre)")}
                        </span>
                        <span>
                          {I(v.logoXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="0" max="100" step="1" value={val(v.logoXPct)} onChange={v.onLogoX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Loddrett (topp – bunn)")}
                        </span>
                        <span>
                          {I(v.logoYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="0" max="100" step="1" value={val(v.logoYPct)} onChange={v.onLogoY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Størrelse")}
                        </span>
                        <span>
                          {I(v.logoSize)}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="30" max="300" step="5" value={val(v.logoSize)} onChange={v.onLogoSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Synlighet")}
                        </span>
                        <span>
                          {I(v.logoOpacityPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="10" max="100" step="5" value={val(v.logoOpacityPct)} onChange={v.onLogoOpacity} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.noLogo ? <>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    <button onClick={v.pickLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                      {tx("Legg til logo…")}
                    </button>
                    {"\n                "}
                    <button onClick={v.pickLogoShared} data-ch-shared-logo="1" style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer","display":"inline-flex","alignItems":"center","gap":"6px"}} className={P.scp2}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></svg>Fellesmappe
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Grunnvideo")}
                </span>
                {"\n            "}
                <div style={{"padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","fontSize":"13px","lineHeight":"1.5"}}>
                  {"\n              "}
                  <div style={{"fontWeight":"600","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.videoLabel)}
                  </div>
                  {"\n              "}
                  <div style={{"color":"#9d998f","fontSize":"12px","marginTop":"2px"}}>
                    {tx("Går i loop bak alle slides. Vises der sliden mangler eget bilde, og skinner gjennom når bildestyrken er skrudd ned.")}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.pickVideo} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Velg video…")}
                  </button>
                  {"\n              "}
                  {v.hasVideo ? <>
                    {"\n                "}
                    <button onClick={v.removeVideo} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                      {tx("Fjern")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Lydspor")}
                </span>
                {"\n            "}
                <div style={{"padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","fontSize":"13px","lineHeight":"1.5"}}>
                  {"\n              "}
                  <div style={{"fontWeight":"600","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
                    {I(v.audioLabel)}
                  </div>
                  {"\n              "}
                  <div style={{"color":"#9d998f","fontSize":"12px","marginTop":"2px"}}>
                    {tx("Musikk under hele loopen. MP3, M4A eller WAV.")}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.pickAudio} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                    {tx("Velg lyd…")}
                  </button>
                  {"\n              "}
                  {v.hasAudio ? <>
                    {"\n                "}
                    <button onClick={v.removeAudio} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                      {tx("Fjern")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#0a0a0a"}}>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Lydbibliotek")}
                    </span>
                    {"\n                "}
                    <button onClick={v.pickLib} style={{"height":"26px","minHeight":"0","padding":"0 10px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                      {tx("+ Legg til lyder")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.noLib ? <>
                    {"\n                "}
                    <span style={{"fontSize":"12px","color":"#6f6b64","lineHeight":"1.45","textWrap":"pretty"}}>
                      {tx("Lyder du laster opp, blir lagret her, så du kan bytte mellom dem senere.")}
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.hasLib ? <>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"4px","maxHeight":"240px","overflowY":"auto"}}>
                      {"\n                  "}
                      {list(v.audioLib).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                            {"\n                      "}
                            <button onClick={v1.t?.use} title={tx("Bruk denne lyden")} style={css(`flex:1 1 auto; min-width:0; height:36px; min-height:0; padding:0 12px; display:flex; align-items:center; gap:10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:13px; text-align:left; cursor:pointer;`)} className={P.scpf}>
                              {"\n                        "}
                              <span style={css(`width:8px; height:8px; flex:0 0 auto; border-radius:999px; background:${v1.t?.dot ?? ""};`)} />
                              {"\n                        "}
                              <span style={{"flex":"1 1 auto","minWidth":"0","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap","fontWeight":"600"}}>
                                {I(v1.t?.name)}
                              </span>
                              {"\n                        "}
                              <span style={{"flex":"0 0 auto","fontSize":"12px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                                {I(v1.t?.dur)}
                              </span>
                              {"\n                      "}
                            </button>
                            {"\n                      "}
                            <button onClick={v1.t?.del} title={tx("Slett fra biblioteket")} aria-label={tx("Slett fra biblioteket")} style={{"width":"32px","height":"36px","minHeight":"0","padding":"0","flex":"0 0 auto","border":"0","borderRadius":"8px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"16px","cursor":"pointer"}} className={P.scpg}>
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
                  {"\n            "}
                </div>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    {tx("Sjanger")}
                  </span>
                  {"\n              "}
                  <select value={val(v.genreVal)} onChange={v.onGenre} style={{"height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","cursor":"pointer"}}>
                    {"\n                "}
                    {list(v.genreOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "g": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option value={val(v1.g?.value)}>
                          {tx(v1.g?.label)}
                        </option>
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </select>
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                    {I(v.genreDesc)}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                {v.genreReapply ? <>
                  {"\n              "}
                  <button onClick={v.onGenreReapply} style={{"alignSelf":"flex-start","height":"24px","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                    {tx("Bruk analysen på nytt")}
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasAudio ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Volum")}
                        </span>
                        <span data-vol-pct="1">
                          {I(v.audioVolPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="0" max="100" step="1" defaultValue={v.audioVolPct} onChange={v.onAudioVol} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Looping")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        {list(v.audioModes).map(($it1, $i1) => {
                          const v1 = { ...v, "am": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button onClick={v1.am?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.am?.bg ?? ""}; color:${v1.am?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                              {I(v1.am?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.audioModeDesc)}
                      </span>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","color":"#e9e7e2"}}>
                        {I(v.audioDurLabel)}
                      </span>
                      {"\n                  "}
                      {v.audioIsFit ? <>
                        {"\n                    "}
                        <span style={{"fontSize":"12px","color":"#e9e7e2"}}>
                          {I(v.audioFitNote)}
                        </span>
                        {"\n                  "}
                      </> : null}
                      {"\n                  "}
                      {v.audioIsBeat ? <>
                        {"\n                    "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000"}}>
                          {"\n                      "}
                          <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","flexWrap":"wrap"}}>
                            {"\n                        "}
                            <div style={{"display":"flex","flexDirection":"column","gap":"2px","minWidth":"0"}}>
                              <span style={{"fontSize":"15px","fontWeight":"700"}}>
                                {I(v.bpmLabel)}
                              </span>
                              <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                                {I(v.bpmSub)}
                              </span>
                            </div>
                            {"\n                        "}
                            <div style={{"display":"flex","gap":"4px","flexWrap":"wrap"}}>
                              {"\n                          "}
                              <button onClick={v.bpmMinus} title={tx("1 BPM saktere")} style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                −
                              </button>
                              {"\n                          "}
                              <button onClick={v.bpmPlus} title={tx("1 BPM raskere")} style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                +
                              </button>
                              {"\n                          "}
                              <button onClick={v.bpmHalf} title={tx("Halvt tempo")} style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                ½
                              </button>
                              {"\n                          "}
                              <button onClick={v.bpmDouble} title={tx("Dobbelt tempo")} style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                ×2
                              </button>
                              {"\n                          "}
                              <button onClick={v.bpmAuto} title={tx("Bruk tempoet som ble funnet")} style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                {tx("Auto")}
                              </button>
                              {"\n                        "}
                            </div>
                            {"\n                      "}
                          </div>
                          {"\n                      "}
                          <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {tx("Finjuster slaget")}
                              </span>
                              <span>
                                {I(v.beatNudgeLabel)}
                              </span>
                            </span>
                            <input type="range" min="-200" max="200" step="5" value={val(v.beatNudge)} onChange={v.onBeatNudge} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                          {"\n                      "}
                          <span style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                            {tx("Kommer skiftene litt før eller etter slaget, dra her til de sitter.")}
                          </span>
                          {"\n                    "}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span style={{"fontWeight":"600"}}>
                          {tx("Start i sangen ved")}
                        </span>
                        <span>
                          {I(v.audioOffsetLabel)}
                        </span>
                      </span>
                      {"\n                  "}
                      <input type="range" min="0" max={v.audioMax} step="0.5" value={val(v.audioOffset)} onChange={v.onAudioOffset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    {v.audioNotFree ? <>
                      {"\n                  "}
                      <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"12px"}}>
                        {"\n                    "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                      "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Inntoning")}
                            </span>
                            <span>
                              {I(v.fadeInLabel)}
                            </span>
                          </span>
                          {"\n                      "}
                          <input type="range" min="0" max="3" step="0.05" value={val(v.fadeInVal)} onChange={v.onFadeIn} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                    "}
                        <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                      "}
                          <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span style={{"fontWeight":"600"}}>
                              {tx("Uttoning")}
                            </span>
                            <span>
                              {I(v.fadeOutLabel)}
                            </span>
                          </span>
                          {"\n                      "}
                          <input type="range" min="0" max="4" step="0.05" value={val(v.fadeOutVal)} onChange={v.onFadeOut} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Overskrift («Ukentlige møter»)")}
                    </span>
                    <input value={val(v.cfgHeader)} onChange={v.onHeader} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </label>
                  {"\n            "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) auto","gap":"10px","alignItems":"end"}}>
                    {"\n              "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span>
                          {tx("Vannrett")}
                        </span>
                        <span>
                          {I(v.headerXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input type="range" min="0" max="100" step="1" value={val(v.headerXPct)} onChange={v.onHeaderX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span>
                          {tx("Loddrett")}
                        </span>
                        <span>
                          {I(v.headerYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input type="range" min="0" max="100" step="1" value={val(v.headerYPct)} onChange={v.onHeaderY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <button onClick={v.resetHeaderPos} style={{"height":"24px","padding":"0 2px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                      {tx("Standard")}
                    </button>
                    {"\n            "}
                  </div>
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Merkelapp («Program for uken»)")}
                    </span>
                    <input value={val(v.cfgTopLabel)} onChange={v.onTopLabel} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className={P.scp3} />
                  </label>
                  {"\n            "}
                  <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) auto","gap":"10px","alignItems":"end"}}>
                    {"\n              "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span>
                          {tx("Vannrett")}
                        </span>
                        <span>
                          {I(v.topXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input type="range" min="0" max="100" step="1" value={val(v.topXPct)} onChange={v.onTopX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span>
                          {tx("Loddrett")}
                        </span>
                        <span>
                          {I(v.topYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input type="range" min="0" max="100" step="1" value={val(v.topYPct)} onChange={v.onTopY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <button onClick={v.resetTopPos} style={{"height":"24px","padding":"0 2px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                      {tx("Standard")}
                    </button>
                    {"\n            "}
                  </div>
                </div>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f"}}>
                  {tx("Tips: dra tekstene og logoen direkte i forhåndsvisningen. Blå hjelpelinjer viser når noe står midt på, langs margen eller på linje med noe annet.")}
                </span>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Aksentfarge")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"10px"}}>
                  {"\n              "}
                  {list(v.swatches).map(($it1, $i1) => {
                    const v1 = { ...v, "sw": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-keep-color="1" onClick={v1.sw?.onClick} style={css(`width:32px; height:32px; border-radius:50%; border:0; cursor:pointer; background:${v1.sw?.color ?? ""}; box-shadow:${v1.sw?.ring ?? ""};`)} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <label title={tx("Velg egen farge")} style={css(`position:relative; width:32px; height:32px; border-radius:50%; overflow:hidden; cursor:pointer; background:conic-gradient(#ff5d5d, #ffd23f, #6ee07a, #4fc3ff, #a77bff, #ff5d5d); box-shadow:${v.accentCustomRing ?? ""};`)}>
                    {"\n                "}
                    <input type="color" value={val(v.accentVal)} onChange={v.onAccentPick} style={{"position":"absolute","inset":"-8px","width":"48px","height":"48px","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"14px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    {tx("Skrift")}
                  </span>
                  {"\n              "}
                  <select value={val(v.fontVal)} onChange={v.onFont} style={{"height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}}>
                    {"\n                "}
                    {list(v.fontOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option value={val(v1.f?.value)}>
                          {tx(v1.f?.label)}
                        </option>
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </select>
                  {"\n            "}
                </label>
                {"\n            "}
                <div style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"12px"}}>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12px","color":"#9d998f"}}>
                      <span style={{"fontWeight":"600"}}>
                        {tx("Titler")}
                      </span>
                      <span style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                        <input type="text" inputMode="decimal" value={val(v.titleSz?.numVal)} onChange={v.titleSz?.onNum} onBlur={v.titleSz?.onNumBlur} onKeyDown={v.titleSz?.onNumKey} onFocus={v.titleSz?.onNumFocus} aria-label={tx("Størrelse")} style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                        <button type="button" onClick={v.titleSz?.cycleUnit} title={tx(v.titleSz?.unitTitle)} aria-label={tx(v.titleSz?.unitTitle)} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v.titleSz?.unit)}
                        </button>
                      </span>
                    </span>
                    <input type="range" min="50" max="250" step="5" value={val(v.titleScalePct)} onChange={v.onTitleScale} aria-label={tx("Titler")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12px","color":"#9d998f"}}>
                      <span style={{"fontWeight":"600"}}>
                        {tx("Øvrig tekst")}
                      </span>
                      <span style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                        <input type="text" inputMode="decimal" value={val(v.textSz?.numVal)} onChange={v.textSz?.onNum} onBlur={v.textSz?.onNumBlur} onKeyDown={v.textSz?.onNumKey} onFocus={v.textSz?.onNumFocus} aria-label={tx("Størrelse")} style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                        <button type="button" onClick={v.textSz?.cycleUnit} title={tx(v.textSz?.unitTitle)} aria-label={tx(v.textSz?.unitTitle)} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v.textSz?.unit)}
                        </button>
                      </span>
                    </span>
                    <input type="range" min="50" max="250" step="5" value={val(v.textScalePct)} onChange={v.onTextScale} aria-label={tx("Øvrig tekst")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"14px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span style={{"fontWeight":"600"}}>
                      {tx("Vignett bak teksten")}
                    </span>
                    <span>
                      {I(v.overlayPct)}{" %"}
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="30" max="120" step="5" value={val(v.overlayPct)} onChange={v.onOverlay} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span style={{"fontWeight":"600"}}>
                      {tx("Standard varighet per slide")}
                    </span>
                    <span>
                      {I(v.defDur)}{tx(" s")}
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="3" max="12" step="0.5" value={val(v.defDur)} onChange={v.onDefDur} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.vigOnAll)} onChange={v.onVigAll} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span>
                    {tx("Vignett på alle slides")}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div style={css(`display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:${v.vigAllOp ?? ""};`)}>
                  {"\n              "}
                  <button onClick={v.openVigEdAll} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp8}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    </svg>
                    <span>
                      {tx("Rediger vignett for alle slides…")}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#9d998f"}}>
                    {I(v.vigAllSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.rail)} onChange={v.onRail} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span>
                    {tx("Vis ukestripen nederst på møte-slidene")}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    {tx("Strek ved ukedagen og merkelappene")}
                  </span>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                    {list(v.kickerLineOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "o": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                          {I(v1.o?.label)}
                        </button>
                      </React.Fragment>;
                    })}
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Oppløsning")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","width":"max-content"}}>
                  {"\n              "}
                  {list(v.resOptions).map(($it1, $i1) => {
                    const v1 = { ...v, "r": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button onClick={v1.r?.onClick} style={css(`height:30px; padding:0 14px; border:0; border-radius:999px; background:${v1.r?.bg ?? ""}; color:${v1.r?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`)}>
                        {I(v1.r?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isFx ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"13px","fontWeight":"700"}}>
                    {tx("Fargepaneler")}
                  </span>
                  {"\n              "}
                  {v.panelsCustom ? <>
                    {"\n                "}
                    <button onClick={v.panelsReset} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className={P.scp4}>
                      {tx("Tilbakestill")}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#f3f1ec","cursor":"pointer"}}>
                  <input type="checkbox" checked={chk(v.panelsBg)} onChange={v.onPanelsBg} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {tx(" Vis fargepaneler bak slides uten bilde")}
                </label>
                {"\n            "}
                <button onClick={v.panelsRandom} style={{"alignSelf":"flex-start","display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className={P.scpd}>
                  <span aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                    <span style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                  </span>
                  <span>
                    {tx("Tilfeldige farger")}
                  </span>
                </button>
                {"\n            "}
                <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                  {tx("Fargene brukes også i overgangen «Paneler» og i fargefilteret. Du kan slå panelene av eller på for hver slide under Slides.")}
                </span>
                {"\n            "}
                {v.panelsOn ? <>
                  {"\n              "}
                  {list(v.panelRows).map(($it1, $i1) => {
                    const v1 = { ...v, "p": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                        {"\n                  "}
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {I(v1.p?.label)}
                        </span>
                        {"\n                  "}
                        <label data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.p?.color ?? ""}; opacity:${v1.p?.swatchOpacity ?? ""}; overflow:hidden; cursor:pointer;`)} title={tx("Velg farge")}>
                          {"\n                    "}
                          <input type="color" value={val(v1.p?.color)} onChange={v1.p?.onColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          {"\n                  "}
                        </label>
                        {"\n                  "}
                        <input type="range" min="0" max="100" step="1" value={val(v1.p?.alphaPct)} onChange={v1.p?.onAlpha} aria-label={tx("Gjennomsiktighet")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                  "}
                        <span style={{"fontSize":"12px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.p?.alphaPct)}%
                        </span>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <label style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#b3afa6","cursor":"pointer"}}>
                    <input type="checkbox" checked={chk(v.panelsRotate)} onChange={v.onPanelsRotate} style={{"accentColor":"#e9e7e2"}} />
                    {tx(" Bytt rekkefølge på fargene for hver slide")}
                  </label>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                    {tx("Glideren styrer hvor synlig hvert panel er. 0 % skjuler panelet.")}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"13px","fontWeight":"700"}}>
                    {tx("Fargefilter på bilder")}
                  </span>
                  {"\n              "}
                  <button data-keep-color="1" onClick={v.tintToggle} role="switch" aria-checked={v.tintAria} aria-label={tx("Fargefilter av eller på")} style={css(`position:relative; width:40px; height:24px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.tintTrack ?? ""}; cursor:pointer;`)}>
                    <span style={css(`position:absolute; top:3px; left:${v.tintKnobX ?? ""}; width:18px; height:18px; border-radius:999px; background:${v.tintKnob ?? ""}; transition:left 160ms ease;`)} />
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#8a867e","lineHeight":"1.5"}}>
                  {tx("Legger en farge over bakgrunnsbildene. Du kan overstyre filteret på hver slide under Slides.")}
                </span>
                {"\n            "}
                {v.tintOn ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Farge")}
                    </span>
                    {"\n                "}
                    <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.tintSrcOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.tintSingle ? <>
                      {"\n                  "}
                      <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        <label data-keep-color="1" style={css(`position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:${v.tintColor ?? ""}; overflow:hidden; cursor:pointer;`)} title={tx("Velg farge")}>
                          <input type="color" value={val(v.tintColor)} onChange={v.onTintColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </label>
                        {"\n                    "}
                        {list(v.tintSwatches).map(($it1, $i1) => {
                          const v1 = { ...v, "w": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-keep-color="1" onClick={v1.w?.onClick} title={tx(v1.w?.hex)} style={css(`width:28px; height:28px; min-height:0; padding:0; border:2px solid ${v1.w?.ring ?? ""}; border-radius:999px; background:${v1.w?.hex ?? ""}; cursor:pointer;`)} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      {tx("Blanding")}
                    </span>
                    {"\n                "}
                    <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.tintBlendOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    {"\n                "}
                    <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span style={{"fontWeight":"600"}}>
                        {tx("Styrke")}
                      </span>
                      <span>
                        {I(v.tintAmtPct)}{" %"}
                      </span>
                    </span>
                    {"\n                "}
                    <input type="range" min="0" max="100" step="1" value={val(v.tintAmtPct)} onChange={v.onTintAmt} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Overgang mellom slides")}
                </span>
                <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                  {list(v.transOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                        {I(v1.o?.label)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Tekstanimasjon")}
                </span>
                <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                  {list(v.textOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                        {I(v1.o?.label)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.speedFree ? <>
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span style={{"fontWeight":"600"}}>
                        {tx("Fart")}
                      </span>
                      <span>
                        {I(v.fxSpeedPct)}{" %"}
                      </span>
                    </span>
                    <input type="range" min="50" max="200" step="10" value={val(v.fxSpeedPct)} onChange={v.onFxSpeed} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </label>
                </> : null}
                {"\n            "}
                {v.speedByBeat ? <>
                  <span style={{"fontSize":"12px","color":"#e9e7e2"}}>
                    {tx("Farten styres av takten i musikken.")}
                  </span>
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {tx("Overlegg")}
                </span>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button onClick={v.openOvEdAll} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className={P.scp8}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="7" cy="8" r="2.5" />
                      <circle cx="16" cy="6" r="1.8" />
                      <circle cx="14" cy="15" r="3" />
                      <circle cx="6" cy="17" r="1.5" />
                    </svg>
                    <span>
                      {tx("Rediger overlegg for alle slides…")}
                    </span>
                  </button>
                  {"\n              "}
                  <span style={{"fontSize":"12px","color":"#9d998f"}}>
                    {I(v.ovAllSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  <input type="checkbox" checked={chk(v.kenBurns)} onChange={v.onKenBurns} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  <span>
                    {tx("Langsom zoom i bildene")}
                  </span>
                </label>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  <input type="checkbox" checked={chk(v.sweep)} onChange={v.onSweep} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  <span>
                    {tx("Lysstripe i aksentfargen ved hvert skifte")}
                  </span>
                </label>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"12px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                  <span style={{"fontSize":"13px","fontWeight":"700"}}>
                    {tx("Følg takten i musikken")}
                  </span>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                    {I(v.beatBadge)}
                  </span>
                </div>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                  {I(v.beatFxDesc)}
                </span>
                {"\n            "}
                {v.beatLive ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Alltid med")}
                      </span>
                      {"\n                  "}
                      <span style={{"fontSize":"12.5px","color":"#d8d4cb","lineHeight":"1.6","textWrap":"pretty"}}>
                        {tx("Slidene skifter på første slag i takten, og overgangene er tilpasset tempoet.")}
                      </span>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input type="checkbox" checked={chk(v.beatPolish)} onChange={v.onBeatPolish} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                          <span style={{"fontWeight":"600"}}>
                            {tx("Rolig dybde")}
                          </span>
                          <span style={{"fontSize":"12px","color":"#9d998f"}}>
                            {tx("Teksten glir svakt mot bildet mens sliden står, som i en tittelsekvens.")}
                          </span>
                        </span>
                      </label>
                      {"\n                  "}
                      {v.beatPolish ? <>
                        {"\n                    "}
                        <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                          {list(v.beatLevelOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                                {I(v1.o?.label)}
                              </button>
                            </React.Fragment>;
                          })}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Lengde per slide")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                        {list(v.beatBarsOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                              {I(v1.o?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input type="checkbox" checked={chk(v.beatText)} onChange={v.onBeatText} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span>
                          {tx("Ord og linjer kommer inn i takt med musikken")}
                        </span>
                      </label>
                      {"\n                  "}
                      <label style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input type="checkbox" checked={chk(v.beatReframe)} onChange={v.onBeatReframe} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span>
                          {tx("Bildet glir rolig til et nytt utsnitt på hver takt")}
                        </span>
                      </label>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px dashed #2b2b2b"}}>
                      {"\n                  "}
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        {tx("Ekstra effekter (valgfritt)")}
                      </span>
                      {"\n                  "}
                      <div style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        {list(v.beatFxOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "b": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button onClick={v1.b?.onClick} title={tx(v1.b?.hint)} style={css(`height:30px; padding:0 12px; border:1px solid ${v1.b?.border ?? ""}; border-radius:15px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                              {I(v1.b?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <span style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.beatFxHint)}
                      </span>
                      {"\n                  "}
                      {v.hasExtras ? <>
                        {"\n                    "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                          {"\n                      "}
                          <div style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                            {list(v.beatEveryOpts).map(($it1, $i1) => {
                              const v1 = { ...v, "o": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`)}>
                                  {I(v1.o?.label)}
                                </button>
                              </React.Fragment>;
                            })}
                          </div>
                          {"\n                      "}
                          <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span style={{"fontWeight":"600"}}>
                                {tx("Styrke")}
                              </span>
                              <span>
                                {I(v.beatPulsePct)}{" %"}
                              </span>
                            </span>
                            <input type="range" min="0" max="100" step="5" value={val(v.beatPulsePct)} onChange={v.onBeatPulse} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                          {"\n                    "}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button onClick={v.disableBeat} style={{"alignSelf":"flex-start","height":"30px","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                      {tx("Slå av takt-synk")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.beatOff ? <>
                  {"\n              "}
                  <button onClick={v.enableBeat} style={{"alignSelf":"flex-start","height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                    {I(v.enableBeatLabel)}
                  </button>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isExport ? <>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div style={{"fontSize":"13px","color":"#9d998f"}}>
                {I(v.exportSummary)}
              </div>
              {"\n          "}
              {v.hasAudio ? <>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"flex-start","gap":"10px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.exportAudio)} onChange={v.onExportAudio} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                    <span style={{"fontWeight":"600"}}>
                      {tx("Ta med lyd i eksporten")}
                    </span>
                    <span style={{"fontSize":"12px","color":"#9d998f"}}>
                      {I(v.exportAudioNote)}
                    </span>
                  </span>
                  {"\n            "}
                </label>
                {"\n          "}
              </> : null}
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div style={{"fontSize":"15px","fontWeight":"700"}}>
                  {tx("Fullskjerm-spiller (.html)")}
                </div>
                {"\n            "}
                <div style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  {tx("Én fil med alt inni: bilder, video, skrift og lyd. Spiller loopen uten stopp, også uten internett. Legg den inn som nettleserkilde i sendeprogrammet (f.eks. Wirecast) i ")}{I(v.dimLabel)}.
                </div>
                {"\n            "}
                {v.hasAudio ? <>
                  {"\n              "}
                  <div style={{"fontSize":"12px","color":"#e9e7e2","lineHeight":"1.5"}}>
                    {I(v.htmlNote)}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button onClick={v.exportHTML} style={{"alignSelf":"flex-start","height":"40px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13.5px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                  {I(v.htmlLabel)}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #3a3a3a","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"15px","fontWeight":"700"}}>
                    {tx("Rask MP4-eksport")}
                  </div>
                  <span style={{"padding":"3px 8px","borderRadius":"999px","background":"#e9e7e2","color":"#000","fontSize":"11px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}}>
                    {tx("4K · med lyd")}
                  </span>
                </div>
                {"\n            "}
                <div style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  Lager én hel runde ({I(v.loopLen)}) som MP4 så fort maskinen klarer, uten å spille av i sanntid. Filen spilles av overalt og kan loopes sømløst. Hold fanen åpen mens den jobber.
                </div>
                {"\n            "}
                {v.fastIdle ? <>
                  {"\n              "}
                  <div style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    <button onClick={v.fast4k} disabled={v.fastUnsupported} style={css(`height:40px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; opacity:${v.fastBtnOp ?? ""};`)} className={P.scp8}>
                      {tx("Lag MP4 i 4K")}
                    </button>
                    {"\n                "}
                    <button onClick={v.fast1080} disabled={v.fastUnsupported} style={css(`height:40px; padding:0 16px; border:1px solid #3a3a3a; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer; opacity:${v.fastBtnOp ?? ""};`)} className={P.scp1}>
                      {tx("1080p")}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.fastBusy ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <div style={{"height":"6px","borderRadius":"3px","background":"#2b2b2b","overflow":"hidden"}}>
                      <div style={css(`height:100%; width:${v.fastWidth ?? ""}; background:#e9e7e2;`)} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#b3afa6"}}>
                      <span>
                        {I(v.fastLabel)}
                      </span>
                      <button onClick={v.fastCancel} style={{"border":"0","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        {tx("Avbryt")}
                      </button>
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasFastNote ? <>
                  <div style={css(`font-size:12px; color:${v.fastNoteColor ?? ""}; line-height:1.5;`)}>
                    {I(v.fastNote)}
                  </div>
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div style={{"fontSize":"15px","fontWeight":"700"}}>
                  {tx("Videofil (sanntid)")}
                </div>
                {"\n            "}
                <div style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  Tar opp én hel runde i sanntid ({I(v.loopLen)}). Slutten går sømløst over i starten, så filen kan loopes i sendeprogrammet eller brukes som vanlig video. Hold fanen åpen og synlig mens den tar opp.
                </div>
                {"\n            "}
                {v.notRecording ? <>
                  {"\n              "}
                  <button onClick={v.startRec} style={{"alignSelf":"flex-start","height":"40px","padding":"0 18px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","fontWeight":"700","cursor":"pointer"}} className={P.scp1}>
                    {tx("Ta opp video")}
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.recording ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <div style={{"height":"6px","borderRadius":"3px","background":"#2b2b2b","overflow":"hidden"}}>
                      <div style={css(`height:100%; width:${v.recWidth ?? ""}; background:#e9e7e2;`)} />
                    </div>
                    {"\n                "}
                    <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12.5px","color":"#b3afa6"}}>
                      <span>
                        {tx("Tar opp … ")}{I(v.recPct)}{" %"}
                      </span>
                      <button onClick={v.cancelRec} style={{"border":"0","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        {tx("Avbryt")}
                      </button>
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.recNote)}
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
      </aside>
      {"\n\n  "}
      <main style={css(`flex:${v.mainFlex ?? ""}; width:${v.paneW ?? ""}; min-width:0; height:${v.paneH ?? ""}; overflow-y:auto; padding:${v.mainPad ?? ""}; display:${v.mainDisplay ?? ""}; flex-direction:column; gap:16px;`)}>
        {"\n    "}
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","flexWrap":"wrap"}}>
          {"\n      "}
          <div style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
            {"\n        "}
            <div style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
              {tx("Forhåndsvisning")}
            </div>
            {"\n        "}
            <div style={{"fontSize":"13px","color":"#9d998f"}}>
              {I(v.statusLine)}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
            {"\n        "}
            <div style={{"display":"flex","border":"1px solid #2b2b2b","borderRadius":"999px","overflow":"hidden","background":"#121212"}}>
              {"\n          "}
              <button onClick={v.undo} title={tx("Angre (Ctrl/Cmd + Z)")} aria-label={tx("Angre")} style={css(`width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:${v.undoCursor ?? ""}; opacity:${v.undoOpacity ?? ""}; display:flex; align-items:center; justify-content:center;`)} className={P.scph}>
                ↶
              </button>
              {"\n          "}
              <div style={{"width":"1px","background":"#2b2b2b"}} />
              {"\n          "}
              <button onClick={v.redo} title={tx("Gjør om (Ctrl/Cmd + Shift + Z)")} aria-label={tx("Gjør om")} style={css(`width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:${v.redoCursor ?? ""}; opacity:${v.redoOpacity ?? ""}; display:flex; align-items:center; justify-content:center;`)} className={P.scph}>
                ↷
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div title={tx("Format på videoen")} style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
              {"\n          "}
              {list(v.orientOptions).map(($it1, $i1) => {
                const v1 = { ...v, "o": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.o?.onClick} style={css(`height:30px; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px;`)}>
                    <span style={css(`display:block; width:${v1.o?.iw ?? ""}; height:${v1.o?.ih ?? ""}; border:1.5px solid currentColor; border-radius:2px;`)} />
                    <span>
                      {I(v1.o?.label)}
                    </span>
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <button onClick={v.goExport} style={css(`display:${v.mainExportDisp ?? ""}; height:38px; padding:0 16px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer;`)} className={P.scp8}>
              {tx("Eksporter")}
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n\n    "}
        <div style={{"display":"flex","alignItems":"stretch","gap":"10px","flexShrink":"0"}}>
          {"\n    "}
          <div ref={v.zoomOuter} style={{"position":"relative","flex":"1 1 auto","minWidth":"0","overflow":"hidden","borderRadius":"10px"}}>
            {"\n    "}
            <div ref={v.fsRef} style={css(`position:relative; flex-shrink:0; background:#000; border:1px solid #262626; border-radius:10px; overflow:hidden; display:flex; justify-content:center; align-items:center; transform:${v.zoomTf ?? ""}; transform-origin:0 0;`)}>
              {"\n      "}
              {v.isFs ? <>
                {"\n        "}
                <button onClick={v.exitFs} title={tx("Lukk fullskjerm (Esc)")} aria-label={tx("Lukk fullskjerm")} style={{"position":"absolute","zIndex":"20","top":"18px","right":"18px","width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.45)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","opacity":"0.28","transition":"opacity .2s ease, background .2s ease"}} className={P.scpi}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                {"\n        "}
                <div style={{"position":"absolute","zIndex":"20","left":"18px","bottom":"18px","display":"flex","gap":"10px","opacity":"0.28","transition":"opacity .2s ease"}} className={P.scpj}>
                  {"\n          "}
                  <button onClick={v.togglePlay} title={`${v.playLabel ?? ""} (mellomrom)`} aria-label={tx(v.playLabel)} style={{"width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.6)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
                    {"\n            "}
                    {v.isLive ? <>
                      <svg width="13" height="15" viewBox="0 0 10 12" fill="currentColor">
                        <rect x="0" y="0" width="3.2" height="12" rx="1" />
                        <rect x="6.8" y="0" width="3.2" height="12" rx="1" />
                      </svg>
                    </> : null}
                    {"\n            "}
                    {v.isPaused ? <>
                      <svg width="14" height="15" viewBox="0 0 11 12" fill="currentColor">
                        <path d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                      </svg>
                    </> : null}
                    {"\n          "}
                  </button>
                  {"\n          "}
                  <button onClick={v.volBtn} title={tx(v.volTitle)} aria-label={tx(v.volTitle)} style={{"width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.6)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
                    {"\n            "}
                    {v.volOn ? <>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                        <path d="M19 5a10 10 0 0 1 0 14" />
                      </svg>
                    </> : null}
                    {"\n            "}
                    {v.volOff ? <>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                        <path d="m22 9-6 6" />
                        <path d="m16 9 6 6" />
                      </svg>
                    </> : null}
                    {"\n          "}
                  </button>
                  {"\n        "}
                </div>
                {"\n      "}
              </> : null}
              {"\n      "}
              <canvas data-loop-canvas="" ref={v.canvasRef} onPointerDown={v.onCanvasDown} onPointerMove={v.onCanvasMove} onDoubleClick={v.onCanvasDbl} title={tx("Dra tekster, bilder, logo og QR for å flytte · dra i hjørnene for å endre størrelse · klikk på et tomt område for å spille av/pause · dobbeltklikk tekst for å redigere")} style={css(`touch-action:none; cursor:${v.canvasCursor ?? ""}; display:block; width:100%; height:auto; max-height:${v.canvasMaxH ?? ""}; object-fit:contain; aspect-ratio:${v.canvasAspect ?? ""};`)} />
              {"\n      "}
              <div ref={v.guideRef} aria-hidden="true" style={{"position":"absolute","zIndex":"3","left":"0","top":"0","width":"0","height":"0","display":"none","pointerEvents":"none"}}>
                {"\n        "}
                {v.gThirds ? <>
                  {"\n          "}
                  <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="3" vectorEffect="non-scaling-stroke">
                      <path d="M100 0V300M200 0V300M0 100H300M0 200H300" vectorEffect="non-scaling-stroke" />
                    </g>
                    {"\n            "}
                    <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2">
                      <path d="M100 0V300M200 0V300M0 100H300M0 200H300" vectorEffect="non-scaling-stroke" />
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v.gGolden ? <>
                  {"\n          "}
                  <svg width="100%" height="100%" viewBox={v.gViewBox} preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g transform={v.gTransform}>
                      {"\n              "}
                      <path d={v.gSquares} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      {"\n              "}
                      <path d={v.gSpiral} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="3.2" vectorEffect="non-scaling-stroke" />
                      {"\n              "}
                      <path d={v.gSpiral} fill="none" stroke="#ffffff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                      {"\n            "}
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v.gFib ? <>
                  {"\n          "}
                  <svg width="100%" height="100%" viewBox={v.gViewBox} preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g transform={v.gTransform}>
                      {"\n              "}
                      <path d={v.gSquares} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                      {"\n              "}
                      <path d={v.gSquares} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                      {"\n            "}
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n          "}
                  {list(v.gFibLabels).map(($it1, $i1) => {
                    const v1 = { ...v, "l": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n            "}
                      <span style={css(`position:absolute; left:${v1.l?.left ?? ""}; top:${v1.l?.top ?? ""}; transform:translate(-50%, -50%); padding:1px 6px; border-radius:999px; background:rgba(0,0,0,0.6); color:#ffffff; font-size:${v1.l?.fs ?? ""}; font-weight:700; font-variant-numeric:tabular-nums;`)}>
                        {I(v1.l?.n)}
                      </span>
                      {"\n          "}
                    </React.Fragment>;
                  })}
                  {"\n        "}
                </> : null}
                {"\n      "}
              </div>
              {"\n      "}
              <div ref={v.selBoxRef} style={{"position":"absolute","zIndex":"4","left":"0","top":"0","width":"0","height":"0","display":"none","border":"1.5px solid rgba(255,255,255,0.95)","borderRadius":"4px","boxShadow":"0 0 0 1px rgba(0,0,0,0.55)","pointerEvents":"none"}}>
                {"\n        "}
                <div data-h="nw" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"0","top":"0","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nwse-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-h="ne" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"100%","top":"0","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nesw-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-h="sw" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"0","top":"100%","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nesw-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-h="se" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"100%","top":"100%","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nwse-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-sel-chip="1" style={{"position":"absolute","left":"-2px","bottom":"100%","marginBottom":"10px","display":"flex","alignItems":"center","gap":"4px","padding":"3px 4px 3px 10px","borderRadius":"999px","background":"rgba(0,0,0,0.85)","whiteSpace":"nowrap","pointerEvents":"auto","backdropFilter":"blur(6px)"}}>
                  {"\n          "}
                  <span style={{"fontSize":"11.5px","fontWeight":"600","color":"#f3f1ec"}}>
                    {I(v.selElLabel)}
                  </span>
                  {"\n          "}
                  <span style={{"fontSize":"11.5px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                    {I(v.selElPct)}
                  </span>
                  {"\n          "}
                  <button onClick={v.selReset} title={tx("Tilbakestill størrelse og plassering")} aria-label={tx("Tilbakestill størrelse og plassering")} style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#b3afa6","font":"inherit","fontSize":"13px","cursor":"pointer"}} className={P.scpk}>
                    ↺
                  </button>
                  {"\n          "}
                  {v.selCanDelete ? <>
                    {"\n            "}
                    <button onClick={v.selDelete} title={tx("Slett fra sliden (Delete)")} aria-label={tx("Slett fra sliden")} style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#ff9a9a","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scpl}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                    {"\n          "}
                  </> : null}
                  {"\n          "}
                  <button onClick={v.selClear} title={tx("Ferdig (Esc)")} aria-label={tx("Ferdig")} style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#b3afa6","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className={P.scpk}>
                    ✓
                  </button>
                  {"\n        "}
                </div>
                {"\n      "}
              </div>
              {"\n      "}
              {v.hasFlash ? <>
                {"\n        "}
                <div style={{"position":"absolute","left":"50%","top":"50%","zIndex":"4","width":"72px","height":"72px","margin":"-36px 0 0 -36px","borderRadius":"999px","background":"rgba(0,0,0,0.55)","color":"#ffffff","display":"flex","alignItems":"center","justifyContent":"center","pointerEvents":"none","backdropFilter":"blur(4px)"}}>
                  {"\n          "}
                  {v.flashPlayIcon ? <>
                    <svg width="26" height="28" viewBox="0 0 11 12" fill="currentColor">
                      <path d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                    </svg>
                  </> : null}
                  {"\n          "}
                  {v.flashPauseIcon ? <>
                    <svg width="24" height="28" viewBox="0 0 10 12" fill="currentColor">
                      <rect x="0" y="0" width="3.2" height="12" rx="1" />
                      <rect x="6.8" y="0" width="3.2" height="12" rx="1" />
                    </svg>
                  </> : null}
                  {"\n        "}
                </div>
                {"\n      "}
              </> : null}
              {"\n      "}
              {v.hasInline ? <>
                {"\n        "}
                <textarea ref={v.inlineRef} value={val(v.inlineVal)} onChange={v.onInlineChange} onKeyDown={v.onInlineKey} onBlur={v.onInlineCommit} rows={1} aria-label={tx("Rediger tekst")} style={css(`position:absolute; z-index:5; left:${v.inlineL ?? ""}; top:${v.inlineT ?? ""}; width:${v.inlineW ?? ""}; height:${v.inlineH ?? ""}; padding:6px 10px; border:1.5px solid #e9e7e2; border-radius:8px; background:rgba(0,0,0,0.82); color:#ffffff; font-family:inherit; font-size:${v.inlineFs ?? ""}; font-weight:600; line-height:1.25; resize:none; outline:none; box-shadow:0 8px 30px rgba(0,0,0,0.6); backdrop-filter:blur(6px);`)} />
                {"\n        "}
                <div style={css(`position:absolute; z-index:5; left:${v.inlineL ?? ""}; top:${v.inlineHintT ?? ""}; display:flex; gap:8px; align-items:center; padding:4px 10px; border-radius:999px; background:rgba(0,0,0,0.85); color:#b3afa6; font-size:11.5px; white-space:nowrap; pointer-events:none;`)}>
                  {I(v.inlineHint)}
                </div>
                {"\n      "}
              </> : null}
              {"\n    "}
            </div>
            {"\n\n    "}
            {v.zoomed ? <>
              {"\n      "}
              <div style={{"position":"absolute","left":"10px","bottom":"10px","zIndex":"6","padding":"4px 10px","borderRadius":"999px","background":"rgba(0,0,0,0.7)","color":"#c9c5bc","fontSize":"11.5px","pointerEvents":"none"}}>
                {tx("Rull eller dra med to fingre for å flytte · Ctrl/Cmd + scroll for zoom")}
              </div>
              {"\n    "}
            </> : null}
            {"\n    "}
          </div>
          {"\n    "}
          <div style={{"flex":"0 0 auto","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"6px"}}>
            {"\n      "}
            <button onClick={v.zoomIn} title={tx("Zoom inn")} aria-label={tx("Zoom inn")} style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"17px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scpm}>
              +
            </button>
            {"\n      "}
            <button onClick={v.zoomFit} title={tx("Standard visning")} aria-label={tx("Standard visning")} style={css(`width:34px; min-height:0; padding:6px 0; border:1px solid #3a3a3a; border-radius:999px; background:${v.zoomFitBgV ?? ""}; color:${v.zoomFitFg ?? ""}; font:inherit; font-size:10px; font-weight:700; line-height:1.1; cursor:pointer; font-variant-numeric:tabular-nums; writing-mode:horizontal-tb;`)} className={P.scp1}>
              {I(v.zoomLabelShort)}
            </button>
            {"\n      "}
            <button onClick={v.zoomOut} title={tx("Zoom ut")} aria-label={tx("Zoom ut")} style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"17px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scpm}>
              −
            </button>
            {"\n    "}
          </div>
          {"\n    "}
        </div>
        {"\n\n    "}
        <div style={{"flexShrink":"0","display":"flex","flexDirection":"column","gap":"8px"}}>
          {"\n          "}
          <div style={{"flexWrap":"wrap","rowGap":"8px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px"}}>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap","minWidth":"0"}}>
              {"\n          "}
              <button onClick={v.togglePlay} title={`${v.playLabel ?? ""} (mellomrom)`} aria-label={tx(v.playLabel)} style={{"flexShrink":"0","width":"30px","height":"30px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scp1}>
                {"\n            "}
                {v.isLive ? <>
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <rect x="0" y="0" width="3.2" height="12" rx="1" />
                    <rect x="6.8" y="0" width="3.2" height="12" rx="1" />
                  </svg>
                </> : null}
                {"\n            "}
                {v.isPaused ? <>
                  <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor">
                    <path d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                  </svg>
                </> : null}
                {"\n          "}
              </button>
              {"\n          "}
              <button onClick={v.volBtn} title={tx(v.volTitle)} aria-label={tx(v.volTitle)} style={css(`flex-shrink:0; width:30px; height:30px; min-height:0; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:#121212; color:${v.volIconColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`)} className={P.scp0}>
                {"\n            "}
                {v.volOn ? <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M19 5a10 10 0 0 1 0 14" />
                  </svg>
                </> : null}
                {"\n            "}
                {v.volOff ? <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                    <path d="m22 9-6 6" />
                    <path d="m16 9 6 6" />
                  </svg>
                </> : null}
                {"\n          "}
              </button>
              <button onClick={v.enterFs} title={tx("Fullskjerm")} aria-label={tx("Fullskjerm")} style={{"flexShrink":"0","width":"30px","height":"30px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scp0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              </button>
              {"\n          "}
              <span style={{"flex":"0 1 auto","minWidth":"0","overflow":"hidden","textOverflow":"ellipsis","fontSize":"12px","fontWeight":"600","color":"#9d998f","whiteSpace":"nowrap"}}>
                {tx("Slides i loopen")}
              </span>
              {"\n          "}
              <span ref={v.timeRef} style={{"fontSize":"12px","color":"#6f6b64","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}} />
              {"\n        "}
            </div>
            {"\n      "}
            <div title={tx("Hjelpelinjer vises bare i redigeringen, ikke i videoen")} style={{"flex":"0 0 auto","display":"flex","alignItems":"center","gap":"6px","marginLeft":"auto","whiteSpace":"nowrap"}}>
              {"\n        "}
              <label style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                {"\n        "}
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9d998f" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
                {"\n        "}
                <select value={val(v.guideMode)} onChange={v.onGuideMode} aria-label={tx("Hjelpelinjer")} title={tx("Hjelpelinjer – vises bare i redigeringen, ikke i videoen")} style={{"maxWidth":"128px","height":"32px","minHeight":"0","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","cursor":"pointer","outline":"none"}}>
                  {"\n          "}
                  <option value="none">
                    {tx("Ingen")}
                  </option>
                  {"\n          "}
                  <option value="golden">
                    {tx("Sneglehus")}
                  </option>
                  {"\n          "}
                  <option value="fib">
                    {tx("Fibonacci")}
                  </option>
                  {"\n          "}
                  <option value="thirds">
                    {tx("Tredeling")}
                  </option>
                  {"\n        "}
                </select>
                {"\n      "}
              </label>
              {"\n      "}
              {v.gCanFlip ? <>
                {"\n        "}
                <button onClick={v.guideFlip} title={tx("Snu hjelpelinjene")} aria-label={tx("Snu hjelpelinjene")} style={{"width":"32px","justifyContent":"center","height":"32px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px"}} className={P.scp1}>
                  <span style={{"fontSize":"14px"}}>
                    ⟲
                  </span>
                </button>
                {"\n      "}
              </> : null}
              {"\n      "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div ref={v.stripRef} onScroll={v.onStripScroll} style={{"position":"relative","display":"flex","gap":"10px","overflowX":"auto","paddingBottom":"22px"}}>
            {"\n        "}
            <div ref={v.trackRef} onPointerDown={v.onScrubDown} onPointerMove={v.onScrubMove} onPointerUp={v.onScrubUp} onPointerCancel={v.onScrubUp} title={tx("Klikk eller dra for å spole")} style={{"position":"absolute","left":"0","bottom":"0","height":"22px","width":"0","cursor":"pointer","touchAction":"none","zIndex":"3"}}>
              {"\n          "}
              <div style={{"position":"absolute","left":"0","right":"0","top":"10px","height":"2px","borderRadius":"2px","background":"rgba(255,255,255,0.12)","pointerEvents":"none"}} />
              {"\n          "}
              <div ref={v.fillRef} style={{"position":"absolute","left":"0","top":"10px","height":"2px","width":"0","borderRadius":"2px","background":"#e9e7e2","pointerEvents":"none"}} />
              {"\n          "}
              <div ref={v.headRef} style={{"position":"absolute","top":"11px","left":"0","width":"12px","height":"12px","margin":"-6px 0 0 -6px","borderRadius":"999px","background":"#ffffff","boxShadow":"0 0 0 3px rgba(255,255,255,0.18), 0 0 12px rgba(255,255,255,0.45)","pointerEvents":"none"}} />
              {"\n        "}
            </div>
            {"\n        "}
            {list(v.cards).map(($it1, $i1) => {
              const v1 = { ...v, "c": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <div data-loop-card={v1.c?.num} style={{"position":"relative","flex":"0 0 172px","display":"flex"}}>
                  {"\n          "}
                  <button onClick={v1.c?.onClick} style={css(`flex:1 1 auto; min-width:0; display:flex; flex-direction:column; padding:0; border:1px solid ${v1.c?.border ?? ""}; box-shadow:${v1.c?.shadow ?? ""}; border-radius:14px; background:#0a0a0a; overflow:hidden; cursor:pointer; text-align:left; font:inherit; color:#f3f1ec; opacity:${v1.c?.opacity ?? ""};`)}>
                    {"\n            "}
                    <div data-keep-color="1" style={css(`position:relative; height:96px; background-color:#000; background-image:${v1.c?.thumbBg ?? ""}; background-size:cover; background-position:center;`)}>
                      {"\n              "}
                      <div style={{"position":"absolute","inset":"0","background":"linear-gradient(78deg, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.5) 60%, rgba(8,8,8,0.3) 100%)"}} />
                      {"\n              "}
                      {v1.c?.playing ? <>
                        {"\n                "}
                        <div style={{"position":"absolute","left":"0","right":"0","top":"0","height":"3px","background":"#e9e7e2"}} />
                        {"\n              "}
                      </> : null}
                      {"\n              "}
                      <div style={{"position":"absolute","left":"10px","right":"10px","bottom":"9px","display":"flex","flexDirection":"column","gap":"3px"}}>
                        {"\n                "}
                        <div style={{"fontSize":"9.5px","fontWeight":"700","letterSpacing":"0.2em","textTransform":"uppercase","color":"#e9e7e2","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.c?.kicker)}
                        </div>
                        {"\n                "}
                        <div style={{"fontSize":"13px","fontWeight":"700","lineHeight":"1.15","textTransform":"uppercase","maxHeight":"30px","overflow":"hidden"}}>
                          {I(v1.c?.title)}
                        </div>
                        {"\n              "}
                      </div>
                      {"\n            "}
                    </div>
                    {"\n            "}
                    <div style={{"display":"flex","justifyContent":"space-between","padding":"7px 10px","fontSize":"11.5px","color":"#9d998f"}}>
                      <span>
                        {I(v1.c?.num)}{" · "}{I(v1.c?.label)}
                      </span>
                      <span>
                        {I(v1.c?.meta)}
                      </span>
                    </div>
                    {"\n          "}
                  </button>
                  {"\n          "}
                  {v1.c?.hasVid ? <>
                    {"\n            "}
                    <button onClick={v1.c?.toggleVidSound} title={tx(v1.c?.vidSoundTitle)} aria-label={tx(v1.c?.vidSoundTitle)} style={css(`position:absolute; z-index:2; right:8px; top:8px; height:26px; min-height:0; padding:0 9px 0 7px; border:1px solid rgba(255,255,255,0.25); border-radius:999px; background:rgba(0,0,0,0.7); color:${v1.c?.vidSoundColor ?? ""}; font:inherit; font-size:10.5px; font-weight:700; letter-spacing:0.04em; cursor:pointer; display:flex; align-items:center; gap:5px;`)} className={P.scpn}>
                      {"\n              "}
                      {v1.c?.vidSoundOn ? <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                          <path d="M19 5a10 10 0 0 1 0 14" />
                        </svg>
                      </> : null}
                      {"\n              "}
                      {v1.c?.vidSoundOff ? <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                          <path d="m22 9-6 6" />
                          <path d="m16 9 6 6" />
                        </svg>
                      </> : null}
                      {"\n              "}
                      <span>
                        {tx("VIDEO")}
                      </span>
                      {"\n            "}
                    </button>
                    {"\n          "}
                  </> : null}
                  {"\n          "}
                  <button onClick={v1.c?.onRemove} title={tx("Fjern slide")} aria-label={tx("Fjern slide")} style={{"position":"absolute","left":"6px","top":"6px","zIndex":"2","width":"22px","height":"22px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.7)","color":"#e9e7e2","font":"inherit","fontSize":"14px","lineHeight":"1","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scpo}>
                    ×
                  </button>
                  {"\n          "}
                </div>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n        "}
            <div style={{"position":"relative","flex":"0 0 120px","display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              {v.addMenuClosed ? <>
                {"\n            "}
                <button onClick={v.toggleAddMenu} title={tx("Legg til slide")} style={{"flex":"1","minHeight":"126px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"6px","border":"1px dashed #3a3a3a","borderRadius":"14px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scpp}>
                  <span style={{"fontSize":"26px","fontWeight":"300","lineHeight":"1"}}>
                    +
                  </span>
                  <span>
                    {tx("Legg til")}
                  </span>
                </button>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.addMenuOpen ? <>
                {"\n            "}
                {list(v.quickAdd).map(($it1, $i1) => {
                  const v1 = { ...v, "q": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button onClick={v1.q?.onClick} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0a0a0a","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textAlign":"left"}} className={P.scp1}>
                      {"+ "}{I(v1.q?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                <button onClick={v.toggleAddMenu} style={{"height":"24px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"11.5px","cursor":"pointer"}} className={P.scp4}>
                  {tx("Avbryt")}
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </main>
      {"\n\n  "}
      {v.ovEdOpen ? <>
        {"\n    "}
        <div role="dialog" aria-modal="true" aria-label={tx("Rediger overlegg")} style={{"position":"fixed","inset":"0","zIndex":"9400","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div style={{"width":"min(1080px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  {tx("Rediger overlegg")}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12.5px","color":"#9d998f"}}>
                  {tx("Effekter som ligger over bildet: filmkorn, lys, bokeh, snø og mer.")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <button onClick={v.oeDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                {tx("Ferdig")}
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"8px","paddingBottom":"12px","borderBottom":"1px solid #262626"}}>
              {"\n          "}
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                  {tx("Slides")}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.oeOnCount)}{tx(" · trykk på en slide for å redigere den")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","gap":"8px","overflowX":"auto","paddingBottom":"4px"}}>
                {"\n            "}
                {list(v.oeSlides).map(($it1, $i1) => {
                  const v1 = { ...v, "v": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div onClick={v1.v?.onPick} style={css(`flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid ${v1.v?.border ?? ""}; border-radius:10px; background:${v1.v?.bg ?? ""}; cursor:pointer;`)}>
                      {"\n                "}
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <span style={{"fontSize":"11px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.v?.num)}{" · "}{I(v1.v?.kind)}
                        </span>
                        {"\n                  "}
                        <button onClick={v1.v?.onToggle} role="switch" aria-label={tx("Overlegg av/på for sliden")} style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.v?.track ?? ""}; cursor:pointer; transition:background .18s ease;`)}>
                          <span style={css(`position:absolute; top:3px; left:${v1.v?.kx ?? ""}; width:16px; height:16px; border-radius:999px; background:${v1.v?.knob ?? ""}; transition:left .18s ease;`)} />
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <span style={css(`font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:${v1.v?.op ?? ""};`)}>
                        {I(v1.v?.title)}
                      </span>
                      {"\n                "}
                      <span style={css(`font-size:11px; color:${v1.v?.statusColor ?? ""};`)}>
                        {I(v1.v?.status)}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {"\n            "}
                <button onClick={v.oeToSlide} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.oeScopeSlide?.bg ?? ""}; color:${v.oeScopeSlide?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                  {tx("Denne sliden")}
                </button>
                {"\n            "}
                <button onClick={v.oeToAll} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.oeScopeAll?.bg ?? ""}; color:${v.oeScopeAll?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                  {tx("Alle slides")}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <span style={{"flex":"1 1 220px","minWidth":"0","fontSize":"12px","color":"#9d998f","lineHeight":"1.45","textWrap":"pretty"}}>
                {I(v.oeScopeNote)}
              </span>
              {"\n          "}
              {v.oeHasOwn ? <>
                {"\n            "}
                <button onClick={v.oeUseAll} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                  {tx("Bruk innstillingene for alle slides")}
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","gap":"18px","flexWrap":"wrap","alignItems":"flex-start"}}>
              {"\n          "}
              <div style={css(`position:relative; flex:0 0 auto; width:${v.oePW ?? ""}; height:${v.oePH ?? ""}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000;`)}>
                {"\n            "}
                <canvas ref={v.ovEdCanvas} style={{"display":"block","width":"100%","height":"100%"}} />
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"flex":"1 1 260px","minWidth":"0","display":"flex","flexDirection":"column","gap":"16px"}}>
                {"\n            "}
                <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <span style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                    {I(v.oeOnLabel)}
                  </span>
                  {"\n              "}
                  <button onClick={v.oeToggle} role="switch" aria-label={tx("Overlegg av/på")} style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.oeSw?.track ?? ""}; cursor:pointer; transition:background .18s ease;`)}>
                    <span style={css(`position:absolute; top:3px; left:${v.oeSw?.x ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.oeSw?.knob ?? ""}; transition:left .18s ease;`)} />
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    {tx("Type")}
                  </span>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(110px, 1fr))","gap":"6px"}}>
                    {"\n                "}
                    {list(v.oeTypes).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.t?.onClick} style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left;`)}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Mengde")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeAmt)}{" %"}
                      </span>
                      <button onClick={v.oeAmt60} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        {tx("Standard")}
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="0" max="150" step="1" value={val(v.oeAmt)} onChange={v.onOeAmt} aria-label={tx("Mengde")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Lite")}
                    </span>
                    <span>
                      {tx("Mye")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Fart")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeSpeed)}{" %"}
                      </span>
                      <button onClick={v.oeSpeed100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="10" max="400" step="1" value={val(v.oeSpeed)} onChange={v.onOeSpeed} aria-label={tx("Fart")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Rolig")}
                    </span>
                    <span>
                      {tx("Rask")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Gjennomsiktighet")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeTransp)}{" %"}
                      </span>
                      <button onClick={v.oeTransp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="0" max="100" step="1" value={val(v.oeTransp)} onChange={v.onOeTransp} aria-label={tx("Gjennomsiktighet")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Helt dekkende")}
                    </span>
                    <span>
                      {tx("Helt gjennomsiktig")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    {tx("Farge")}
                  </span>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    {list(v.oeSwList).map(($it1, $i1) => {
                      const v1 = { ...v, "w": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-keep-color="1" onClick={v1.w?.onClick} title={tx(v1.w?.c)} aria-label={`Farge ${v1.w?.c ?? ""}`} style={css(`width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.w?.c ?? ""}; box-shadow:${v1.w?.ring ?? ""}; cursor:pointer;`)} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label style={{"display":"flex","alignItems":"center","gap":"6px","height":"28px","padding":"0 10px 0 4px","border":"1px solid #2b2b2b","borderRadius":"999px","cursor":"pointer","fontSize":"12px","fontWeight":"600","color":"#c9c5bc"}}>
                      {"\n                  "}
                      <input type="color" value={val(v.oeColor)} onChange={v.onOeColor} style={{"width":"20px","height":"20px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","cursor":"pointer"}} />
                      {"\n                  "}
                      <span>
                        {tx("Egen farge")}
                      </span>
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span style={{"fontSize":"11px","color":"#6f6b64"}}>
                    {tx("Farge brukes av Lyslekkasje, Bokeh og Konfetti.")}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <label style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input type="checkbox" checked={chk(v.oeSync)} onChange={v.onOeSync} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span>
                    {tx("Farten følger tempoet i musikken (alle slides)")}
                  </span>
                  {"\n            "}
                </label>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.vigEdOpen ? <>
        {"\n    "}
        <div role="dialog" aria-modal="true" aria-label={tx("Rediger vignett")} style={{"position":"fixed","inset":"0","zIndex":"9400","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div style={{"width":"min(1080px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  {tx("Rediger vignett")}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12.5px","color":"#9d998f"}}>
                  {tx("Dra punktet i bildet for å flytte vignetten.")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <button onClick={v.veDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                {tx("Ferdig")}
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"8px","paddingBottom":"12px","borderBottom":"1px solid #262626"}}>
              {"\n          "}
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                  {tx("Slides")}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.veOnCount)}{tx(" · trykk på en slide for å redigere den")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","gap":"8px","overflowX":"auto","paddingBottom":"4px"}}>
                {"\n            "}
                {list(v.veSlides).map(($it1, $i1) => {
                  const v1 = { ...v, "v": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div onClick={v1.v?.onPick} style={css(`flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid ${v1.v?.border ?? ""}; border-radius:10px; background:${v1.v?.bg ?? ""}; cursor:pointer;`)}>
                      {"\n                "}
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <span style={{"fontSize":"11px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.v?.num)}{" · "}{I(v1.v?.kind)}
                        </span>
                        {"\n                  "}
                        <button onClick={v1.v?.onToggle} role="switch" aria-label={tx("Vignett av/på for sliden")} style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.v?.track ?? ""}; cursor:pointer; transition:background .18s ease;`)}>
                          <span style={css(`position:absolute; top:3px; left:${v1.v?.kx ?? ""}; width:16px; height:16px; border-radius:999px; background:${v1.v?.knob ?? ""}; transition:left .18s ease;`)} />
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <span style={css(`font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:${v1.v?.op ?? ""};`)}>
                        {I(v1.v?.title)}
                      </span>
                      {"\n                "}
                      <span style={css(`font-size:11px; color:${v1.v?.statusColor ?? ""};`)}>
                        {I(v1.v?.status)}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {"\n            "}
                <button onClick={v.veToSlide} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.veScopeSlide?.bg ?? ""}; color:${v.veScopeSlide?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                  {tx("Denne sliden")}
                </button>
                {"\n            "}
                <button onClick={v.veToAll} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.veScopeAll?.bg ?? ""}; color:${v.veScopeAll?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                  {tx("Alle slides")}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <span style={{"flex":"1 1 220px","minWidth":"0","fontSize":"12px","color":"#9d998f","lineHeight":"1.45","textWrap":"pretty"}}>
                {I(v.veScopeNote)}
              </span>
              {"\n          "}
              {v.veHasOwn ? <>
                {"\n            "}
                <button onClick={v.veUseAll} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                  {tx("Bruk innstillingene for alle slides")}
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"6px","flexWrap":"wrap"}}>
              {"\n          "}
              {list(v.veLayers).map(($it1, $i1) => {
                const v1 = { ...v, "l": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button onClick={v1.l?.onClick} style={css(`height:32px; min-height:0; padding:0 14px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.l?.bg ?? ""}; color:${v1.l?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                    {I(v1.l?.label)}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n          "}
              {v.veCanAdd ? <>
                {"\n            "}
                <button onClick={v.veAdd} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className={P.scp1}>
                  {tx("+ Legg til vignett")}
                </button>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.veIsExtra ? <>
                {"\n            "}
                <button onClick={v.veRemove} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"0","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","marginLeft":"auto"}}>
                  {tx("Fjern denne vignetten")}
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","gap":"18px","flexWrap":"wrap","alignItems":"flex-start"}}>
              {"\n          "}
              <div ref={v.vigEdWrap} onPointerDown={v.onVigEdDown} data-loop-viged="1" style={css(`position:${v.vePos ?? "relative"}; top:0; flex:0 0 auto; width:${v.vePW ?? ""}; height:${v.vePH ?? ""}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000; cursor:grab; touch-action:none; user-select:none;`)}>
                {"\n            "}
                <canvas ref={v.vigEdCanvas} style={{"display":"block","width":"100%","height":"100%","pointerEvents":"none"}} />
                {"\n            "}
                <div style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:30px; height:30px; margin:-15px 0 0 -15px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 2px rgba(0,0,0,0.55); pointer-events:none;`)} />
                {"\n            "}
                <div style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:80px; height:2px; margin:-1px 0 0 -40px; background:linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 25%, #ffffff 75%, rgba(255,255,255,0) 100%); transform:rotate(${v.veRotDeg ?? ""}); pointer-events:none;`)} />
                {"\n            "}
                <div style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:6px; height:6px; margin:-3px 0 0 -3px; border-radius:50%; background:#ffffff; pointer-events:none;`)} />
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"flex":"1 1 260px","minWidth":"0","display":"flex","flexDirection":"column","gap":"16px"}}>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                    {"\n                "}
                    <span style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                      {I(v.veOnLabel)}
                    </span>
                    {"\n                "}
                    <button onClick={v.veToggle} role="switch" aria-label={tx("Vignett av/på")} style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.veSw0?.track ?? ""}; cursor:pointer; transition:background .18s ease;`)}>
                      <span style={css(`position:absolute; top:3px; left:${v.veSw0?.x ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.veSw0?.knob ?? ""}; transition:left .18s ease;`)} />
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span style={{"fontSize":"11.5px","color":"#9d998f"}}>
                    {I(v.veOnNote)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    {tx("Type")}
                  </span>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(118px, 1fr))","gap":"6px"}}>
                    {"\n                "}
                    {list(v.veTypes).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.t?.onClick} style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`)}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Rotasjon")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veRot)}°
                      </span>
                      <button onClick={v.veRot0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0°
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"34px minmax(0,1fr) 34px","gap":"8px","alignItems":"center"}}>
                    {"\n                "}
                    <button onClick={v.veRotL} aria-label={tx("Roter mot klokka")} style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}}>
                      ⟲
                    </button>
                    {"\n                "}
                    <input type="range" min="-180" max="180" step="1" value={val(v.veRot)} onChange={v.onVeRot} aria-label={tx("Rotasjon")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n                "}
                    <button onClick={v.veRotR} aria-label={tx("Roter med klokka")} style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}}>
                      ⟳
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Styrke")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veAmt)}{" %"}
                      </span>
                      <button onClick={v.veAmt100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="0" max="200" step="1" value={val(v.veAmt)} onChange={v.onVeAmt} aria-label={tx("Styrke")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("0 % · ingen vignett")}
                    </span>
                    <span>
                      {tx("200 % · helt dekket")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Gjennomsiktighet")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veTransp)}{" %"}
                      </span>
                      <button onClick={v.veTransp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="0" max="100" step="1" value={val(v.veTransp)} onChange={v.onVeTransp} aria-label={tx("Gjennomsiktighet")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Helt dekkende")}
                    </span>
                    <span>
                      {tx("Helt gjennomsiktig")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Diffus")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veSoft)}{" %"}
                      </span>
                      <button onClick={v.veSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        {tx("Standard")}
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="0" max="100" step="1" value={val(v.veSoft)} onChange={v.onVeSoft} aria-label={tx("Diffus")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Skarp kant")}
                    </span>
                    <span>
                      {tx("Myk, diffus")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      {tx("Størrelse")}
                    </span>
                    <span style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veSize)}{" %"}
                      </span>
                      <button onClick={v.veSize100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input type="range" min="20" max="300" step="1" value={val(v.veSize)} onChange={v.onVeSize} aria-label={tx("Størrelse")} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span>
                      {tx("Mindre")}
                    </span>
                    <span>
                      {tx("Større")}
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    {tx("Farge")}
                  </span>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    {list(v.veSw).map(($it1, $i1) => {
                      const v1 = { ...v, "w": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-keep-color="1" onClick={v1.w?.onClick} title={tx(v1.w?.c)} aria-label={`Farge ${v1.w?.c ?? ""}`} style={css(`width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.w?.c ?? ""}; box-shadow:${v1.w?.ring ?? ""}; cursor:pointer;`)} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label style={{"display":"flex","alignItems":"center","gap":"6px","height":"28px","padding":"0 10px 0 4px","border":"1px solid #2b2b2b","borderRadius":"999px","cursor":"pointer","fontSize":"12px","fontWeight":"600","color":"#c9c5bc"}}>
                      {"\n                  "}
                      <input type="color" value={val(v.veColor)} onChange={v.onVeColor} style={{"width":"20px","height":"20px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","cursor":"pointer"}} />
                      {"\n                  "}
                      <span>
                        {tx("Egen farge")}
                      </span>
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <button onClick={v.veCenter} style={{"alignSelf":"flex-start","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                  {tx("Midtstill punktet")}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.eyedropOn ? <>
        {"\n    "}
        <div style={{"position":"fixed","left":"50%","top":"16px","transform":"translateX(-50%)","zIndex":"9700","display":"flex","alignItems":"center","gap":"12px","padding":"10px 12px 10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d","boxShadow":"0 12px 30px rgba(0,0,0,0.6)","fontSize":"13px","color":"#f3f1ec"}}>
          {"\n      "}
          <span>
            {tx("Klikk i forhåndsvisningen for å hente en farge")}
          </span>
          {"\n      "}
          <button onClick={v.cancelEyedrop} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
            {tx("Avbryt")}
          </button>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.hexOpen ? <>
        {"\n    "}
        <div id="hex-pop" role="dialog" aria-label={tx("Velg farge")} style={css(`position:fixed; left:${v.hexX ?? ""}; top:${v.hexY ?? ""}; z-index:9600; width:260px; box-sizing:border-box; display:flex; flex-direction:column; gap:10px; padding:12px; border:1px solid #2b2b2b; border-radius:14px; background:#0d0d0d; box-shadow:0 18px 40px rgba(0,0,0,0.6);`)}>
          {"\n      "}
          <div data-keep-color="1" onPointerDown={v.onPickSV} aria-label={tx("Metning og lysstyrke")} style={css(`position:relative; height:140px; border-radius:8px; background-color:${v.pickHueColor ?? ""}; background-image:linear-gradient(to top, #000000, rgba(0,0,0,0)), linear-gradient(to right, #ffffff, rgba(255,255,255,0)); cursor:crosshair; touch-action:none;`)}>
            {"\n        "}
            <div style={css(`position:absolute; left:${v.pickSX ?? ""}; top:${v.pickVY ?? ""}; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;`)} />
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            {"\n        "}
            <div onPointerDown={v.onPickHue} aria-label={tx("Fargetone")} style={{"position":"relative","flex":"1 1 auto","height":"14px","borderRadius":"999px","background":"linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)","cursor":"pointer","touchAction":"none"}}>
              {"\n          "}
              <div data-keep-color="1" style={css(`position:absolute; left:${v.pickHX ?? ""}; top:50%; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; background:${v.pickHueColor ?? ""}; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;`)} />
              {"\n        "}
            </div>
            {"\n        "}
            <button onClick={v.startEyedrop} title={tx("Hent en farge fra bildet")} aria-label={tx("Pipette")} style={{"flex":"0 0 auto","width":"32px","height":"32px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className={P.scp1}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 22 1-1h3l9-9" />
                <path d="M3 21v-3l9-9" />
                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
              </svg>
            </button>
            {"\n      "}
          </div>
          {"\n      "}
          <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
            {"\n        "}
            <span data-keep-color="1" style={css(`flex:0 0 auto; width:38px; height:38px; border-radius:10px; border:1px solid #3a3a3a; background:${v.hexSwatch ?? ""};`)} />
            {"\n        "}
            <label style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
              {"\n          "}
              <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#9d998f"}}>
                {tx("Hex-kode")}
              </span>
              {"\n          "}
              <input value={val(v.hexDraft)} onChange={v.onHexInput} onKeyDown={v.onHexKey} maxLength={7} spellCheck={false} autoComplete="off" autoFocus placeholder={tx("#RRGGBB")} style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v.hexBorder ?? ""}; border-radius:8px; background:#000; color:#f3f1ec; font:600 14px ui-monospace, Menlo, monospace; letter-spacing:0.06em; outline:none; min-width:0;`)} />
              {"\n        "}
            </label>
            {"\n      "}
          </div>
          {"\n\n      "}
          <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
            {"\n        "}
            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
              <span style={{"fontWeight":"600"}}>
                {tx("Toning")}
              </span>
              <span style={{"fontVariantNumeric":"tabular-nums"}}>
                {I(v.hexToneLabel)}
              </span>
            </span>
            {"\n        "}
            <input data-keep-color="1" type="range" min="-100" max="100" step="1" value={val(v.hexTone)} onChange={v.onHexTone} aria-label={tx("Toning")} style={css(`width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:${v.hexToneBg ?? ""}; -webkit-appearance:none; appearance:none; cursor:pointer;`)} />
            {"\n        "}
            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"10.5px","color":"#6f6b64"}}>
              <span>
                {tx("Mørkere")}
              </span>
              <span>
                {tx("Lysere")}
              </span>
            </span>
            {"\n      "}
          </label>
          {"\n      "}
          <label style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
            {"\n        "}
            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
              <span style={{"fontWeight":"600"}}>
                {tx("Varme")}
              </span>
              <span style={{"fontVariantNumeric":"tabular-nums"}}>
                {I(v.hexWarmLabel)}
              </span>
            </span>
            {"\n        "}
            <input data-keep-color="1" type="range" min="-100" max="100" step="1" value={val(v.hexWarm)} onChange={v.onHexWarm} aria-label={tx("Varme")} style={css(`width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:${v.hexWarmBg ?? ""}; -webkit-appearance:none; appearance:none; cursor:pointer;`)} />
            {"\n        "}
            <span style={{"display":"flex","justifyContent":"space-between","fontSize":"10.5px","color":"#6f6b64"}}>
              <span>
                {tx("Kaldere")}
              </span>
              <span>
                {tx("Varmere")}
              </span>
            </span>
            {"\n      "}
          </label>
          {"\n      "}
          <button onClick={v.hexAdjReset} style={{"alignSelf":"flex-start","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px","marginTop":"-4px"}} className={P.scp4}>
            {tx("Nullstill toning og varme")}
          </button>
          {"\n      "}
          <div style={{"display":"flex","gap":"8px"}}>
            {"\n        "}
            <button onClick={v.hexWheel} style={{"flex":"1 1 auto","height":"34px","minHeight":"0","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"7px"}} className={P.scp2}>
              <span style={{"width":"14px","height":"14px","borderRadius":"999px","background":"conic-gradient(#ff5d5d, #ffd23f, #6ee07a, #4fc3ff, #b18cff, #ff5d5d)"}} />
              <span>
                {tx("Fargehjul")}
              </span>
            </button>
            {"\n        "}
            <button onClick={v.hexOk} style={{"flex":"0 0 auto","height":"34px","minHeight":"0","padding":"0 16px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
              {tx("OK")}
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.panModal ? <>
        {"\n    "}
        <div role="dialog" aria-modal="true" aria-label={tx("Rediger bilde")} style={{"position":"fixed","inset":"0","zIndex":"9500","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div style={{"width":"min(980px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","alignSelf":"flex-start"}}>
              {"\n          "}
              <button onClick={v.edTabPan} title={tx(v.edPanTitle)} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                {tx("Flytt utsnitt")}
              </button>
              {"\n          "}
              <button onClick={v.edTabCrop} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                {tx("Beskjær")}
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
              {"\n          "}
              <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                {tx("Flytt utsnitt")}
              </span>
              {"\n          "}
              <span style={{"fontSize":"12.5px","color":"#9d998f","textWrap":"pretty"}}>
                {tx("Dra rammen dit du vil. Det som er inne i rammen, vises i videoen. Bildet beskjæres ikke.")}
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"center","padding":"4px 0"}}>
              {"\n          "}
              <div ref={v.panWrapRef} style={css(`position:relative; width:${v.panDispW ?? ""}; height:${v.panDispH ?? ""}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;`)}>
                {"\n            "}
                <div style={css(`width:100%; height:100%; background-image:${v.panImgBg ?? ""}; background-size:100% 100%; pointer-events:none;`)} />
                {"\n            "}
                <div onPointerDown={v.onPanFrameDown} data-loop-panframe="1" style={css(`position:absolute; left:${v.pfL ?? ""}; top:${v.pfT ?? ""}; width:${v.pfW ?? ""}; height:${v.pfH ?? ""}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:grab; touch-action:none; display:flex; align-items:center; justify-content:center;`)}>
                  {"\n              "}
                  <div style={{"position":"absolute","left":"33.333%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","left":"66.666%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","top":"33.333%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","top":"66.666%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"width":"44px","height":"44px","borderRadius":"999px","background":"rgba(0,0,0,0.55)","border":"1px solid rgba(255,255,255,0.6)","display":"flex","alignItems":"center","justifyContent":"center","color":"#ffffff","pointerEvents":"none"}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" />
                    </svg>
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
              {"\n          "}
              <button onClick={v.panReset} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                {tx("Midtstill")}
              </button>
              {"\n          "}
              <div style={{"display":"flex","gap":"8px","marginLeft":"auto"}}>
                {"\n            "}
                <button onClick={v.panCancel} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                  {tx("Avbryt")}
                </button>
                {"\n            "}
                <button onClick={v.panDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                  {tx("Ferdig")}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.cropOpen ? <>
        {"\n    "}
        <div role="dialog" aria-modal="true" aria-label={tx(v.cropTitle)} style={{"position":"fixed","inset":"0","zIndex":"9500","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div style={{"width":"min(980px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            {v.cropIsEdit ? <>
              {"\n        "}
              <div style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","alignSelf":"flex-start"}}>
                {"\n          "}
                <button onClick={v.edTabPan} title={tx(v.edPanTitle)} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:transparent; color:${v.edPanFg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`)}>
                  {tx("Flytt utsnitt")}
                </button>
                {"\n          "}
                <button onClick={v.edTabCrop} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                  {tx("Beskjær")}
                </button>
                {"\n        "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  {I(v.cropTitle)}
                </span>
                {"\n            "}
                <span style={{"fontSize":"12.5px","color":"#9d998f","textWrap":"pretty"}}>
                  {tx("Dra i rammen for å flytte utsnittet, og i hjørnene for å endre størrelsen.")}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","flexWrap":"wrap"}}>
                {"\n            "}
                {list(v.cropAspects).map(($it1, $i1) => {
                  const v1 = { ...v, "a": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button onClick={v1.a?.onClick} style={css(`height:30px; padding:0 11px; border:0; border-radius:999px; background:${v1.a?.bg ?? ""}; color:${v1.a?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                      {I(v1.a?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"center","padding":"4px 0"}}>
              {"\n          "}
              <div ref={v.cropWrapRef} style={css(`position:relative; width:${v.cropDispW ?? ""}; height:${v.cropDispH ?? ""}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;`)}>
                {"\n            "}
                <div style={css(`width:100%; height:100%; background-image:${v.cropBg ?? ""}; background-size:100% 100%; pointer-events:none;`)} />
                {"\n            "}
                <div onPointerDown={v.cropMove} data-loop-cropbox="1" style={css(`position:absolute; left:${v.cropL ?? ""}; top:${v.cropT ?? ""}; width:${v.cropW ?? ""}; height:${v.cropH ?? ""}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:move; touch-action:none;`)}>
                  {"\n              "}
                  <div style={{"position":"absolute","left":"33.333%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","left":"66.666%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","top":"33.333%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div style={{"position":"absolute","top":"66.666%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div onPointerDown={v.cropNW} style={css(`position:absolute; left:${v.cropHO ?? ""}; top:${v.cropHO ?? ""}; cursor:nwse-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropNE} style={css(`position:absolute; right:${v.cropHO ?? ""}; top:${v.cropHO ?? ""}; cursor:nesw-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropSW} style={css(`position:absolute; left:${v.cropHO ?? ""}; bottom:${v.cropHO ?? ""}; cursor:nesw-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropSE} style={css(`position:absolute; right:${v.cropHO ?? ""}; bottom:${v.cropHO ?? ""}; cursor:nwse-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropN} style={css(`position:absolute; left:${v.cropELo ?? ""}; top:${v.cropETo ?? ""}; width:${v.cropEL ?? ""}; height:${v.cropET ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropS} style={css(`position:absolute; left:${v.cropELo ?? ""}; bottom:${v.cropETo ?? ""}; width:${v.cropEL ?? ""}; height:${v.cropET ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropW2} style={css(`position:absolute; top:${v.cropELo ?? ""}; left:${v.cropETo ?? ""}; width:${v.cropET ?? ""}; height:${v.cropEL ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;`)} />
                  {"\n              "}
                  <div onPointerDown={v.cropE} style={css(`position:absolute; top:${v.cropELo ?? ""}; right:${v.cropETo ?? ""}; width:${v.cropET ?? ""}; height:${v.cropEL ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;`)} />
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
              {"\n          "}
              <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                {"\n            "}
                <span style={{"fontSize":"12px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                  {I(v.cropSize)}
                </span>
                {"\n            "}
                <button onClick={v.cropReset} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className={P.scp4}>
                  {tx("Nullstill")}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","marginLeft":"auto"}}>
                {"\n            "}
                <button onClick={v.cropCancel} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp4}>
                  {tx("Avbryt")}
                </button>
                {"\n            "}
                <button onClick={v.cropFull} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className={P.scp2}>
                  {tx("Bruk hele bildet")}
                </button>
                {"\n            "}
                <button onClick={v.cropApply} style={{"height":"40px","padding":"0 20px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className={P.scp8}>
                  {tx("Bruk utsnitt")}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.mobile ? <>
        {"\n    "}
        <div style={{"position":"fixed","left":"0","right":"0","bottom":"36px","zIndex":"51","display":"flex","gap":"8px","padding":"8px 12px calc(8px + env(safe-area-inset-bottom))","background":"rgba(0,0,0,0.92)","borderTop":"1px solid #262626","backdropFilter":"blur(10px)"}}>
          {"\n      "}
          {list(v.mobileTabs).map(($it1, $i1) => {
            const v1 = { ...v, "m": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              <button onClick={v1.m?.onClick} style={css(`flex:1; height:46px; border:1px solid ${v1.m?.border ?? ""}; border-radius:999px; background:${v1.m?.bg ?? ""}; color:${v1.m?.color ?? ""}; font:inherit; font-size:14px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer;`)}>
                {I(v1.m?.label)}
              </button>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n  "}
      <footer style={{"position":"fixed","left":"0","right":"0","bottom":"0","zIndex":"50","height":"36px","display":"flex","alignItems":"center","justifyContent":"center","background":"#000","borderTop":"1px solid #262626"}}>
        {"\n    "}
        <span style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.24em","textTransform":"uppercase","color":"#9d998f"}}>
          {tx("Design by Kristen Utvikling")}
        </span>
        {"\n  "}
      </footer>
      {"\n\n  "}
      <input type="file" accept="video/*" ref={v.fileVideo} onChange={v.onVideoFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="image/*" ref={v.fileImg} onChange={v.onImgFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.m4v,.webm" ref={v.fileSlideVid} onChange={v.onSlideVidFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="image/*" ref={v.filePip} onChange={v.onPipFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" ref={v.fileAudio} onChange={v.onAudioFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" multiple={true} accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" ref={v.fileLib} onChange={v.onLibFiles} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="image/*" ref={v.fileRule} onChange={v.onRuleFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="image/*" ref={v.fileLogo} onChange={v.onLogoFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept="image/*" ref={v.fileOcr} onChange={v.onOcrFile} style={{"display":"none"}} />
      {"\n  "}
      <input type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" ref={v.fileText} onChange={v.onTextFile} style={{"display":"none"}} />
    </div>
    </>
  );
}
