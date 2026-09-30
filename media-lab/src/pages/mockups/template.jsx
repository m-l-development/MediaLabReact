/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/mockups.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"23":["\n      ","←","Tools","\n    "],"24":["←","Tools"],"25":["←"],"26":["Tools"],"29":["Mockups"],"30":["Legg designet ditt inn i ekte bilder av mobiler, skjermer og trykksaker. Last opp én gang, så ser du det i alle bildene."],"32":["{{ uploadLabel }}"],"33":["Fra delt mappe"],"37":["{{ designName }}"],"38":["×"],"39":["Du kan også dra et bilde inn i vinduet eller lime inn med Ctrl/Cmd + V."],"42":["{{ c.l }}","{{ c.n }}"],"43":["{{ c.l }}"],"44":["{{ c.n }}"],"46":["+ Legg til egne mockup-bilder"],"47":["Lagres i denne nettleseren. Skjermen i bildet finnes automatisk."],"49":["{{ libMsg }}"],"55":["\n              ","{{ m.name }}","\n              ","{{ m.cat }}","\n            "],"56":["{{ m.name }}"],"57":["{{ m.cat }}"],"59":["×"],"63":["←","Alle mockups"],"64":["←"],"65":["Alle mockups"],"66":["{{ selName }}"],"67":["{{ selCat }}"],"70":["‹"],"71":["›"],"72":["{{ dlLabel }}"],"83":["Slipp bildet for å bruke det som design"],"86":["Design"],"89":["{{ designLabel }}"],"91":["{{ uploadLabel }}"],"92":["Fra delt mappe"],"93":["Plassering"],"96":["{{ f.l }}"],"99":["{{ f.label }}","{{ f.show }}"],"100":["{{ f.label }}"],"101":["{{ f.show }}"],"104":["Bakgrunn"],"106":["Realisme"],"109":["{{ f.label }}","{{ f.show }}"],"110":["{{ f.label }}"],"111":["{{ f.show }}"],"114":["Behold fingre og ting foran skjermen"],"115":["Behold fingre og ting foran skjermen"],"116":[],"118":["Skjerm"],"119":["{{ adjLabel }}"],"121":["Dra de fire gule punktene til hjørnene av skjermen. Endringen lagres for dette bildet."],"123":["Finn automatisk"],"124":["Tilbakestill"],"125":["Eksporter"],"128":["{{ f.l }}"],"129":["{{ sizeLabel }}"],"130":["{{ dlLabel }}"],"132":["Kopier bilde"],"133":["Send til …"],"134":["Piltastene bytter bilde. Dobbeltklikk på en glidebryter for å nullstille den."],"136":["{{ toast }}"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="19" onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <input data-dc-tpl="20" ref={v.fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={v.onFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="21" ref={v.mockRef} type="file" multiple={true} accept="image/png,image/jpeg,image/webp" onChange={v.onMockFiles} style={{"display":"none"}} />
      {"\n\n  "}
      {v.isGallery ? <>
        {"\n    "}
        <div data-dc-tpl="23" style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","flexWrap":"wrap"}}>
          {"\n      "}
          <a data-dc-tpl="24" href={v.backHref} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span data-dc-tpl="25" style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span data-dc-tpl="26">
              Tools
            </span>
          </a>
          {"\n    "}
        </div>
        {"\n    "}
        <main data-dc-tpl="27" style={{"flex":"1","width":"100%","maxWidth":"1320px","margin":"0 auto","padding":"5vh 28px 64px","display":"flex","flexDirection":"column","gap":"34px"}}>
          {"\n      "}
          <div data-dc-tpl="28" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"18px","textAlign":"center"}}>
            {"\n        "}
            <h1 data-dc-tpl="29" style={{"margin":"0","fontSize":"clamp(34px, 7vw, 88px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
              Mockups
            </h1>
            {"\n        "}
            <p data-dc-tpl="30" style={{"margin":"0","maxWidth":"560px","fontSize":"15px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
              Legg designet ditt inn i ekte bilder av mobiler, skjermer og trykksaker. Last opp én gang, så ser du det i alle bildene.
            </p>
            {"\n        "}
            <div data-dc-tpl="31" style={{"display":"flex","flexWrap":"wrap","justifyContent":"center","gap":"10px"}}>
              {"\n          "}
              <button data-dc-tpl="32" onClick={v.pickFile} style={{"height":"46px","padding":"0 26px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
                {I(v.uploadLabel)}
              </button>
              {"\n          "}
              <button data-dc-tpl="33" onClick={v.pickShared} style={{"height":"46px","padding":"0 22px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(12,12,12,0.6)","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                Fra delt mappe
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            {v.hasDesign ? <>
              {"\n          "}
              <div data-dc-tpl="35" style={{"display":"flex","alignItems":"center","gap":"10px","padding":"6px 8px 6px 6px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"rgba(12,12,12,0.7)"}}>
                {"\n            "}
                <span data-dc-tpl="36" style={css(`width:34px; height:34px; border-radius:50%; background-color:#1a1a1a; background-image:${v.designCss ?? ""}; background-size:cover; background-position:center;`, "width:34px; height:34px; border-radius:50%; background-color:#1a1a1a; background-image:{{ designCss }}; background-size:cover; background-position:center;")} />
                {"\n            "}
                <span data-dc-tpl="37" data-no-i18n="1" style={{"maxWidth":"240px","fontSize":"12.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                  {I(v.designName)}
                </span>
                {"\n            "}
                <button data-dc-tpl="38" onClick={v.clearDesign} title="Fjern design" aria-label="Fjern design" style={{"width":"26px","height":"26px","border":"0","borderRadius":"999px","background":"#1c1c1c","color":"#f3f1ec","font":"inherit","fontSize":"13px","cursor":"pointer"}} className="scp3">
                  ×
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            <span data-dc-tpl="39" style={{"fontSize":"12px","color":"#6f6b64"}}>
              Du kan også dra et bilde inn i vinduet eller lime inn med Ctrl/Cmd + V.
            </span>
            {"\n      "}
          </div>
          {"\n\n      "}
          <div data-dc-tpl="40" style={{"display":"flex","flexWrap":"wrap","justifyContent":"center","gap":"6px"}}>
            {"\n        "}
            {list(v.cats).map(($it1, $i1) => {
              const v1 = { ...v, "c": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <button data-dc-tpl="42" onClick={v1.c?.click} style={css(`height:34px; padding:0 14px; display:flex; align-items:center; gap:7px; border:1px solid ${v1.c?.border ?? ""}; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:34px; padding:0 14px; display:flex; align-items:center; gap:7px; border:1px solid {{ c.border }}; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                  <span data-dc-tpl="43">
                    {I(v1.c?.l)}
                  </span>
                  <span data-dc-tpl="44" data-no-i18n="1" style={{"fontSize":"11px","opacity":"0.6"}}>
                    {I(v1.c?.n)}
                  </span>
                </button>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </div>
          {"\n\n      "}
          <div data-dc-tpl="45" style={{"display":"flex","flexWrap":"wrap","justifyContent":"center","alignItems":"center","gap":"10px","marginTop":"-14px"}}>
            {"\n        "}
            <button data-dc-tpl="46" onClick={v.pickMocks} style={{"height":"36px","padding":"0 16px","border":"1px dashed rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              + Legg til egne mockup-bilder
            </button>
            {"\n        "}
            <span data-dc-tpl="47" style={{"fontSize":"12px","color":"#6f6b64","textWrap":"pretty"}}>
              Lagres i denne nettleseren. Skjermen i bildet finnes automatisk.
            </span>
            {"\n      "}
          </div>
          {"\n      "}
          {v.libEmpty ? <>
            {"\n        "}
            <p data-dc-tpl="49" style={{"margin":"0","textAlign":"center","fontSize":"13px","lineHeight":"1.6","color":"#9d998f"}}>
              {I(v.libMsg)}
            </p>
            {"\n      "}
          </> : null}
          {"\n      "}
          <div data-dc-tpl="50" style={{"columns":"260px","columnGap":"18px"}}>
            {"\n        "}
            {list(v.cards).map(($it1, $i1) => {
              const v1 = { ...v, "m": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <div data-dc-tpl="52" style={{"position":"relative","margin":"0 0 18px","breakInside":"avoid"}}>
                  {"\n          "}
                  <button data-dc-tpl="53" onClick={v1.m?.open} style={{"display":"flex","width":"100%","flexDirection":"column","gap":"0","padding":"0","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","overflow":"hidden","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp5">
                    {"\n            "}
                    <canvas data-dc-tpl="54" ref={v1.m?.ref} width="480" height="320" style={css(`display:block; width:100%; height:auto; aspect-ratio:${v1.m?.ar ?? ""}; background:#141414;`, "display:block; width:100%; height:auto; aspect-ratio:{{ m.ar }}; background:#141414;")} />
                    {"\n            "}
                    <div data-dc-tpl="55" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","padding":"11px 14px 13px"}}>
                      {"\n              "}
                      <span data-dc-tpl="56" data-no-i18n="1" style={{"fontSize":"13.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v1.m?.name)}
                      </span>
                      {"\n              "}
                      <span data-dc-tpl="57" style={{"flex":"0 0 auto","fontSize":"11px","color":"#8a867e"}}>
                        {I(v1.m?.cat)}
                      </span>
                      {"\n            "}
                    </div>
                    {"\n          "}
                  </button>
                  {"\n          "}
                  {v1.m?.own ? <>
                    <button data-dc-tpl="59" onClick={v1.m?.del} title="Slett mockup-bildet" aria-label="Slett mockup-bildet" style={{"position":"absolute","top":"10px","right":"10px","width":"28px","height":"28px","padding":"0","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.72)","color":"#f3f1ec","font":"inherit","fontSize":"15px","lineHeight":"1","cursor":"pointer"}} className="scp6">
                      ×
                    </button>
                  </> : null}
                  {"\n          "}
                </div>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </div>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isEdit ? <>
        {"\n    "}
        <div data-dc-tpl="61" data-ml-bg="static" style={{"flex":"1","minHeight":"100dvh","display":"flex","flexDirection":"column"}}>
          {"\n      "}
          <header data-dc-tpl="62" style={{"position":"sticky","top":"0","zIndex":"50","background":"rgba(7,7,7,0.92)","backdropFilter":"blur(10px)","display":"flex","alignItems":"center","gap":"10px","padding":"12px 16px","borderBottom":"1px solid #1c1c1c","flexWrap":"wrap"}}>
            {"\n        "}
            <button data-dc-tpl="63" onClick={v.back} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"36px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
              <span data-dc-tpl="64" style={{"fontSize":"15px"}}>
                ←
              </span>
              <span data-dc-tpl="65">
                Alle mockups
              </span>
            </button>
            {"\n        "}
            <span data-dc-tpl="66" data-no-i18n="1" style={{"fontSize":"14px","fontWeight":"600"}}>
              {I(v.selName)}
            </span>
            {"\n        "}
            <span data-dc-tpl="67" style={{"fontSize":"12px","color":"#6f6b64"}}>
              {I(v.selCat)}
            </span>
            {"\n        "}
            <span data-dc-tpl="68" style={{"flex":"1"}} />
            {"\n        "}
            <div data-dc-tpl="69" style={{"display":"flex","gap":"4px"}}>
              {"\n          "}
              <button data-dc-tpl="70" onClick={v.prev} title="Forrige (←)" aria-label="Forrige" style={{"width":"36px","height":"36px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","cursor":"pointer"}} className="scp7">
                ‹
              </button>
              {"\n          "}
              <button data-dc-tpl="71" onClick={v.next} title="Neste (→)" aria-label="Neste" style={{"width":"36px","height":"36px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","cursor":"pointer"}} className="scp7">
                ›
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <button data-dc-tpl="72" onClick={v.doDownload} style={{"height":"36px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
              {I(v.dlLabel)}
            </button>
            {"\n      "}
          </header>
          {"\n      "}
          <div data-dc-tpl="73" style={css(`flex:1; min-height:0; display:grid; grid-template-columns:${v.cols ?? ""};`, "flex:1; min-height:0; display:grid; grid-template-columns:{{ cols }};")}>
            {"\n        "}
            <section data-dc-tpl="74" ref={v.stageRef} style={css(`position:relative; min-width:0; min-height:${v.stageMinH ?? ""}; display:flex; align-items:center; justify-content:center; padding:24px; overflow:hidden;`, "position:relative; min-width:0; min-height:{{ stageMinH }}; display:flex; align-items:center; justify-content:center; padding:24px; overflow:hidden;")}>
              {"\n          "}
              <div data-dc-tpl="75" ref={v.wrapRef} style={css(`position:relative; width:${v.cvW ?? ""}; height:${v.cvH ?? ""}; line-height:0; touch-action:none;`, "position:relative; width:{{ cvW }}; height:{{ cvH }}; line-height:0; touch-action:none;")}>
                {"\n            "}
                <canvas data-dc-tpl="76" ref={v.canvasRef} width="16" height="16" style={{"width":"100%","height":"100%","borderRadius":"6px","boxShadow":"0 18px 60px rgba(0,0,0,0.55)"}} />
                {"\n            "}
                {v.adj ? <>
                  {"\n              "}
                  <svg data-dc-tpl="78" viewBox="0 0 100 100" preserveAspectRatio="none" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","pointerEvents":"none","overflow":"visible"}}>
                    <polygon data-dc-tpl="79" points={v.quadPts} fill="rgba(245,184,44,0.12)" stroke="#f5b82c" stroke-width="0.35" vector-effect="non-scaling-stroke" />
                  </svg>
                  {"\n              "}
                  {list(v.handles).map(($it1, $i1) => {
                    const v1 = { ...v, "h": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="81" onPointerDown={v1.h?.down} aria-label={v1.h?.label} title={v1.h?.label} style={css(`position:absolute; left:${v1.h?.left ?? ""}; top:${v1.h?.top ?? ""}; width:22px; height:22px; margin:-11px 0 0 -11px; padding:0; border:2px solid #000000; border-radius:50%; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.35); cursor:grab; touch-action:none;`, "position:absolute; left:{{ h.left }}; top:{{ h.top }}; width:22px; height:22px; margin:-11px 0 0 -11px; padding:0; border:2px solid #000000; border-radius:50%; background:#f5b82c; box-shadow:0 0 0 3px rgba(245,184,44,0.35); cursor:grab; touch-action:none;")} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              {v.dragOver ? <>
                {"\n            "}
                <div data-dc-tpl="83" style={{"position":"absolute","inset":"12px","border":"2px dashed #e9e7e2","borderRadius":"14px","background":"rgba(0,0,0,0.6)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600"}}>
                  Slipp bildet for å bruke det som design
                </div>
                {"\n          "}
              </> : null}
              {"\n        "}
            </section>
            {"\n        "}
            <aside data-dc-tpl="84" style={css(`min-width:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; max-height:${v.panelMaxH ?? ""};`, "min-width:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; max-height:{{ panelMaxH }};")}>
              {"\n          "}
              <div data-dc-tpl="85" style={{"display":"flex","flexDirection":"column","gap":"14px","padding":"16px"}}>
                {"\n            "}
                <span data-dc-tpl="86" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                  Design
                </span>
                {"\n            "}
                <div data-dc-tpl="87" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  {"\n              "}
                  <div data-dc-tpl="88" style={css(`width:64px; height:44px; flex:0 0 auto; border:1px solid #2b2b2b; border-radius:8px; background-color:#1a1a1a; background-image:${v.designCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center;`, "width:64px; height:44px; flex:0 0 auto; border:1px solid #2b2b2b; border-radius:8px; background-color:#1a1a1a; background-image:{{ designCss }}; background-size:contain; background-repeat:no-repeat; background-position:center;")} />
                  {"\n              "}
                  <span data-dc-tpl="89" data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12.5px","color":"#c9c5bc","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.designLabel)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="90" style={{"display":"flex","gap":"6px"}}>
                  {"\n              "}
                  <button data-dc-tpl="91" onClick={v.pickFile} style={{"flex":"1","height":"34px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp1">
                    {I(v.uploadLabel)}
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="92" onClick={v.pickShared} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Fra delt mappe
                  </button>
                  {"\n            "}
                </div>
                {"\n\n            "}
                <span data-dc-tpl="93" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"8px","borderTop":"1px solid #1c1c1c"}}>
                  Plassering
                </span>
                {"\n            "}
                <div data-dc-tpl="94" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {"\n              "}
                  {list(v.fits).map(($it1, $i1) => {
                    const v1 = { ...v, "f": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="96" onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.f?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                {list(v.ranges1).map(($it1, $i1) => {
                  const v1 = { ...v, "f": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <label data-dc-tpl="98" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="99" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="100" style={{"fontWeight":"600"}}>
                          {I(v1.f?.label)}
                        </span>
                        <span data-dc-tpl="101" data-no-i18n="1">
                          {I(v1.f?.show)}
                        </span>
                      </span>
                      <input data-dc-tpl="102" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    </label>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                <label data-dc-tpl="103" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","color":"#9d998f"}}>
                  <span data-dc-tpl="104" style={{"fontWeight":"600"}}>
                    Bakgrunn
                  </span>
                  <input data-dc-tpl="105" type="color" value={val(v.bgVal)} onChange={v.onBg} style={{"width":"44px","height":"28px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"6px","background":"transparent","cursor":"pointer"}} />
                </label>
                {"\n\n            "}
                <span data-dc-tpl="106" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"8px","borderTop":"1px solid #1c1c1c"}}>
                  Realisme
                </span>
                {"\n            "}
                {list(v.ranges2).map(($it1, $i1) => {
                  const v1 = { ...v, "f": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <label data-dc-tpl="108" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="109" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="110" style={{"fontWeight":"600"}}>
                          {I(v1.f?.label)}
                        </span>
                        <span data-dc-tpl="111" data-no-i18n="1">
                          {I(v1.f?.show)}
                        </span>
                      </span>
                      <input data-dc-tpl="112" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    </label>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                {v.canOccl ? <>
                  {"\n              "}
                  <button data-dc-tpl="114" onClick={v.toggleOccl} role="switch" aria-checked={v.occl} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","textAlign":"left","cursor":"pointer"}}>
                    <span data-dc-tpl="115">
                      Behold fingre og ting foran skjermen
                    </span>
                    <span data-dc-tpl="116" style={css(`position:relative; flex:0 0 auto; width:34px; height:18px; border-radius:999px; background:${v.occlTrack ?? ""};`, "position:relative; flex:0 0 auto; width:34px; height:18px; border-radius:999px; background:{{ occlTrack }};")}>
                      <span data-dc-tpl="117" style={css(`position:absolute; top:2px; left:${v.occlKnob ?? ""}; width:14px; height:14px; border-radius:50%; background:${v.occlKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ occlKnob }}; width:14px; height:14px; border-radius:50%; background:{{ occlKnobBg }}; transition:left .16s ease;")} />
                    </span>
                  </button>
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                <span data-dc-tpl="118" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"8px","borderTop":"1px solid #1c1c1c"}}>
                  Skjerm
                </span>
                {"\n            "}
                <button data-dc-tpl="119" onClick={v.toggleAdj} style={css(`height:34px; border:1px solid ${v.adjBorder ?? ""}; border-radius:999px; background:${v.adjBg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:34px; border:1px solid {{ adjBorder }}; border-radius:999px; background:{{ adjBg }}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                  {I(v.adjLabel)}
                </button>
                {"\n            "}
                {v.adj ? <>
                  <span data-dc-tpl="121" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                    Dra de fire gule punktene til hjørnene av skjermen. Endringen lagres for dette bildet.
                  </span>
                </> : null}
                {"\n            "}
                <div data-dc-tpl="122" style={{"display":"flex","gap":"6px"}}>
                  {"\n              "}
                  <button data-dc-tpl="123" onClick={v.autoDetect} style={{"flex":"1","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Finn automatisk
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="124" onClick={v.resetCorners} style={{"flex":"1","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Tilbakestill
                  </button>
                  {"\n            "}
                </div>
                {"\n\n            "}
                <span data-dc-tpl="125" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64","paddingTop":"8px","borderTop":"1px solid #1c1c1c"}}>
                  Eksporter
                </span>
                {"\n            "}
                <div data-dc-tpl="126" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {"\n              "}
                  {list(v.fmts).map(($it1, $i1) => {
                    const v1 = { ...v, "f": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="128" onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.f?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <span data-dc-tpl="129" data-no-i18n="1" style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                  {I(v.sizeLabel)}
                </span>
                {"\n            "}
                <button data-dc-tpl="130" onClick={v.doDownload} style={{"height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp1">
                  {I(v.dlLabel)}
                </button>
                {"\n            "}
                <div data-dc-tpl="131" style={{"display":"flex","gap":"6px"}}>
                  {"\n              "}
                  <button data-dc-tpl="132" onClick={v.doCopy} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Kopier bilde
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="133" onClick={v.doSend} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                    Send til …
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <span data-dc-tpl="134" style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                  Piltastene bytter bilde. Dobbeltklikk på en glidebryter for å nullstille den.
                </span>
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
        <div data-dc-tpl="136" style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)","animation":"mkIn .2s ease both"}}>
          {I(v.toast)}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
