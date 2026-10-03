/* Konvertert fra den gamle dc-siden loop-studio.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"17":["←","Media Lab"],"18":["←"],"19":["Media Lab"],"22":["Tilbakestill"],"23":["Ferdig"],"30":["{{ pageTitle }}"],"40":["Disk"],"41":["{{ diskCount }}"],"45":["Ingen lagrede looper ennå. Trykk «Lagre på Disk» i editoren."],"48":["\n                  ","{{ d.name }}","\n                  ","{{ d.meta }}","\n                "],"49":["{{ d.name }}"],"50":["{{ d.meta }}"],"54":["×"],"56":["‹"],"58":["›"],"63":["{{ c.cat }}"],"64":["{{ c.title }}"],"65":["{{ c.desc }}"],"66":["{{ c.btn }}"],"67":["{{ c.btn }}"],"72":["×"],"77":["Knappetekst"],"80":["Basert på"],"87":["‹"],"88":["›"],"89":["Rediger innhold"],"91":["+","Ny mal"],"92":["+"],"93":["Ny mal"],"94":["\n    ","Design by Kristen Utvikling","\n  "],"95":["Design by Kristen Utvikling"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="7" style={{"position":"relative","minHeight":"100dvh","boxSizing":"border-box","overflowX":"clip","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"#000","fontSize":"14px"}}>
      {"\n  "}
      <div data-dc-tpl="8" style={{"position":"absolute","left":"50%","top":"30%","width":"70vw","height":"50vw","maxWidth":"1100px","maxHeight":"760px","transform":"translate(-50%, -50%) rotate(-18deg)","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(255,255,255,0.05) 55%, rgba(255,255,255,0) 100%)","filter":"blur(40px)","pointerEvents":"none"}} />
      {"\n  "}
      <div data-dc-tpl="9" style={{"position":"absolute","right":"-12vw","top":"-10vw","width":"48vw","height":"48vw","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(170,180,200,0.16), rgba(170,180,200,0) 100%)","filter":"blur(30px)","pointerEvents":"none"}} />
      {"\n  "}
      <canvas data-dc-tpl="10" ref={v.meshRef} style={{"position":"absolute","left":"0","right":"0","bottom":"0","width":"100%","height":"62vh","pointerEvents":"none","display":"block"}} />
      {"\n  "}
      <div data-dc-tpl="11" data-ml-star="1" style={{"position":"absolute","left":"18%","top":"22%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","boxShadow":"0 0 10px 3px rgba(255,255,255,0.55)"}} />
      {"\n  "}
      <div data-dc-tpl="12" data-ml-star="1" style={{"position":"absolute","left":"74%","top":"16%","width":"4px","height":"4px","borderRadius":"50%","background":"#fff","boxShadow":"0 0 14px 4px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div data-dc-tpl="13" data-ml-star="1" style={{"position":"absolute","left":"60%","top":"44%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","boxShadow":"0 0 8px 2px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div data-dc-tpl="14" data-ml-star="1" style={{"position":"absolute","left":"9%","top":"58%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","boxShadow":"0 0 8px 2px rgba(255,255,255,0.45)"}} />
      {"\n  "}
      <div data-dc-tpl="15" data-ml-star="1" style={{"position":"absolute","left":"88%","top":"66%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","boxShadow":"0 0 10px 3px rgba(255,255,255,0.5)"}} />
      {"\n\n  "}
      <div data-dc-tpl="16" data-ml-bar="1" style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px"}}>
        {"\n    "}
        <a data-dc-tpl="17" href="media-lab.dc.html" style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
          <span data-dc-tpl="18" style={{"fontSize":"16px","letterSpacing":"0"}}>
            ←
          </span>
          <span data-dc-tpl="19">
            Media Lab
          </span>
        </a>
        {"\n    "}
        {v.editing ? <>
          {"\n      "}
          <div data-dc-tpl="21" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            {"\n        "}
            <button data-dc-tpl="22" onClick={v.resetAll} style={{"height":"40px","padding":"0 16px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp1">
              Tilbakestill
            </button>
            {"\n        "}
            <button data-dc-tpl="23" onClick={v.toggleEdit} style={{"height":"40px","padding":"0 22px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}}>
              Ferdig
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.notEditing ? <>
          {"\n      "}
          <button data-dc-tpl="25" onClick={v.toggleEdit} title="Rediger maler" aria-label="Rediger maler" style={{"width":"40px","height":"40px","padding":"0","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"999px","background":"transparent","color":"#8a867e","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","opacity":"0.7"}} className="scp2">
            {"\n        "}
            <svg data-dc-tpl="26" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path data-dc-tpl="27" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            {"\n      "}
          </button>
          {"\n    "}
        </> : null}
        {"\n  "}
      </div>
      {"\n\n  "}
      <main data-dc-tpl="28" style={{"position":"relative","flex":"1","width":"100%","maxWidth":"1040px","margin":"0 auto","padding":"9vh 28px 64px","display":"flex","flexDirection":"column","alignItems":"center","gap":"56px"}}>
        {"\n    "}
        {v.notEditing ? <>
          {"\n      "}
          <h1 data-dc-tpl="30" data-ml-title="1" style={{"margin":"0","textAlign":"center","fontSize":"clamp(40px, 8.5vw, 104px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
            {I(v.pageTitle)}
          </h1>
          <a href="studio-editor.dc.html?mal=week&demo=1" data-ch-demo-link="1" style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"36px","padding":"0 16px","border":"1px solid rgba(245,184,44,0.6)","borderRadius":"999px","color":"#f5d38f","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.06em","textDecoration":"none"}}>Se demo (lagres ikke)</a>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.editing ? <>
          {"\n      "}
          <input data-dc-tpl="32" value={val(v.pageTitle)} onChange={v.onPageTitle} aria-label="Sidetittel" style={{"width":"100%","maxWidth":"860px","margin":"0","padding":"6px 12px","border":"1px dashed rgba(255,255,255,0.28)","borderRadius":"14px","background":"transparent","color":"#f3f1ec","textAlign":"center","fontFamily":"inherit","fontSize":"clamp(34px, 7vw, 88px)","fontWeight":"600","lineHeight":"1.1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%","outline":"none"}} />
          {"\n    "}
        </> : null}
        {"\n\n    "}
        {v.notEditing ? <>
          {"\n      "}
          <div data-dc-tpl="34" style={{"width":"100%","maxWidth":"860px","display":"flex","alignItems":"stretch","gap":"12px","marginBottom":"-28px"}}>
            {"\n        "}
            <button data-dc-tpl="35" onClick={v.toggleDisk} aria-expanded={v.diskOpenStr} style={css(`flex:0 0 auto; display:flex; align-items:center; gap:10px; height:48px; padding:0 20px; border:1px solid ${v.diskBorder ?? ""}; border-radius:999px; background:${v.diskBg ?? ""}; color:${v.diskColor ?? ""}; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; cursor:pointer; backdrop-filter:blur(14px);`, "flex:0 0 auto; display:flex; align-items:center; gap:10px; height:48px; padding:0 20px; border:1px solid {{ diskBorder }}; border-radius:999px; background:{{ diskBg }}; color:{{ diskColor }}; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; cursor:pointer; backdrop-filter:blur(14px);")} className="scp3">
              {"\n          "}
              <svg data-dc-tpl="36" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path data-dc-tpl="37" d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path data-dc-tpl="38" d="M7 3v5h8V3" />
                <rect data-dc-tpl="39" x="7" y="13" width="10" height="6" rx="1" />
              </svg>
              {"\n          "}
              <span data-dc-tpl="40">
                Disk
              </span>
              {"\n          "}
              <span data-dc-tpl="41" style={css(`min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:${v.diskCountBg ?? ""}; color:${v.diskCountColor ?? ""}; font-size:11px; letter-spacing:0; display:flex; align-items:center; justify-content:center;`, "min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:{{ diskCountBg }}; color:{{ diskCountColor }}; font-size:11px; letter-spacing:0; display:flex; align-items:center; justify-content:center;")}>
                {I(v.diskCount)}
              </span>
              {"\n        "}
            </button>
            {"\n        "}
            <div data-dc-tpl="42" style={css(`position:relative; flex:1 1 auto; min-width:0; max-width:${v.diskRowMax ?? ""}; opacity:${v.diskRowOpacity ?? ""}; overflow:hidden; transition:max-width 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease;`, "position:relative; flex:1 1 auto; min-width:0; max-width:{{ diskRowMax }}; opacity:{{ diskRowOpacity }}; overflow:hidden; transition:max-width 420ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease;")}>
              {"\n          "}
              <div data-dc-tpl="43" ref={v.diskScrollRef} onScroll={v.onDiskScroll} style={css(`display:flex; gap:10px; overflow-x:auto; overflow-y:hidden; padding-bottom:6px; overscroll-behavior-x:contain; -webkit-overflow-scrolling:touch; visibility:${v.diskRowVis ?? ""};`, "display:flex; gap:10px; overflow-x:auto; overflow-y:hidden; padding-bottom:6px; overscroll-behavior-x:contain; -webkit-overflow-scrolling:touch; visibility:{{ diskRowVis }};")}>
                {"\n            "}
                {v.diskEmpty ? <>
                  {"\n              "}
                  <div data-dc-tpl="45" style={{"flex":"0 0 auto","height":"48px","display":"flex","alignItems":"center","padding":"0 18px","border":"1px dashed rgba(255,255,255,0.18)","borderRadius":"999px","color":"#8a867e","fontSize":"12.5px","whiteSpace":"nowrap"}}>
                    Ingen lagrede looper ennå. Trykk «Lagre på Disk» i editoren.
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.disk).map(($it1, $i1) => {
                  const v1 = { ...v, "d": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="47" style={{"position":"relative","flex":"0 0 200px","display":"flex"}}>
                      {"\n                "}
                      <a data-dc-tpl="48" href={v1.d?.href} style={css(`flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:3px; height:48px; padding:0 64px 0 16px; border:1px solid ${v1.d?.border ?? ""}; border-radius:14px; background:rgba(12,12,12,0.7); backdrop-filter:blur(14px); color:#f3f1ec;`, "flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:3px; height:48px; padding:0 64px 0 16px; border:1px solid {{ d.border }}; border-radius:14px; background:rgba(12,12,12,0.7); backdrop-filter:blur(14px); color:#f3f1ec;")} className="scp0">
                        {"\n                  "}
                        <span data-dc-tpl="49" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.04em","textTransform":"uppercase","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.d?.name)}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="50" style={{"fontSize":"11px","color":"#8a867e","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.d?.meta)}
                        </span>
                        {"\n                "}
                      </a>
                      {"\n                "}
                      <button data-dc-tpl="51" onClick={v1.d?.onFav} title={v1.d?.favTitle} aria-label={v1.d?.favTitle} aria-pressed={v1.d?.favAria} style={css(`position:absolute; right:34px; top:50%; transform:translateY(-50%); width:24px; height:24px; padding:0; border:0; border-radius:999px; background:transparent; color:${v1.d?.favColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "position:absolute; right:34px; top:50%; transform:translateY(-50%); width:24px; height:24px; padding:0; border:0; border-radius:999px; background:transparent; color:{{ d.favColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scp4">
                        {"\n                  "}
                        <svg data-dc-tpl="52" width="14" height="14" viewBox="0 0 24 24" fill={v1.d?.favFill} stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                          <path data-dc-tpl="53" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z" />
                        </svg>
                        {"\n                "}
                      </button>
                      {"\n                "}
                      <button data-dc-tpl="54" onClick={v1.d?.onRemove} title="Slett fra Disk" aria-label="Slett fra Disk" style={{"position":"absolute","right":"8px","top":"50%","transform":"translateY(-50%)","width":"24px","height":"24px","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"16px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                        ×
                      </button>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n          "}
              {v.canLeft ? <>
                {"\n            "}
                <button data-dc-tpl="56" onClick={v.scrollLeftBtn} aria-label="Rull til venstre" style={{"position":"absolute","left":"0","top":"0","height":"48px","width":"56px","padding":"0 0 0 6px","border":"0","background":"linear-gradient(90deg, #000 35%, rgba(0,0,0,0))","color":"#f3f1ec","font":"inherit","fontSize":"20px","textAlign":"left","cursor":"pointer"}}>
                  ‹
                </button>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.canRight ? <>
                {"\n            "}
                <button data-dc-tpl="58" onClick={v.scrollRightBtn} aria-label="Rull til høyre" style={{"position":"absolute","right":"0","top":"0","height":"48px","width":"56px","padding":"0 6px 0 0","border":"0","background":"linear-gradient(270deg, #000 35%, rgba(0,0,0,0))","color":"#f3f1ec","font":"inherit","fontSize":"20px","textAlign":"right","cursor":"pointer"}}>
                  ›
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </> : null}
        {"\n\n    "}
        <div data-dc-tpl="59" style={{"width":"100%","maxWidth":"860px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(280px, 1fr))","gap":"18px"}}>
          {"\n      "}
          {list(v.cards).map(($it1, $i1) => {
            const v1 = { ...v, "c": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              {v1.notEditing ? <>
                {"\n          "}
                <a data-dc-tpl="62" href={v1.c?.href} style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"200px","padding":"28px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"rgba(12,12,12,0.55)","backdropFilter":"blur(14px)","color":"#f3f1ec"}} className="scp5">
                  {"\n            "}
                  <div data-dc-tpl="63" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                    {I(v1.c?.cat)}
                  </div>
                  {"\n            "}
                  <div data-dc-tpl="64" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                    {I(v1.c?.title)}
                  </div>
                  {"\n            "}
                  <div data-dc-tpl="65" style={{"fontSize":"14px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
                    {I(v1.c?.desc)}
                  </div>
                  {"\n            "}
                  <div data-dc-tpl="66" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                    <span data-dc-tpl="67" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid #f3f1ec","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#f3f1ec"}}>
                      {I(v1.c?.btn)}
                    </span>
                  </div>
                  {"\n          "}
                </a>
                {"\n        "}
              </> : null}
              {"\n        "}
              {v1.editing ? <>
                {"\n          "}
                <div data-dc-tpl="69" style={{"position":"relative","display":"flex","flexDirection":"column","gap":"10px","minHeight":"200px","padding":"22px","border":"1px dashed rgba(255,255,255,0.28)","borderRadius":"22px","background":"rgba(12,12,12,0.7)","backdropFilter":"blur(14px)"}}>
                  {"\n            "}
                  <div data-dc-tpl="70" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                    {"\n              "}
                    <input data-dc-tpl="71" value={val(v1.c?.cat)} onChange={v1.c?.onCat} placeholder="Kategori" aria-label="Kategori" style={{"flex":"1","minWidth":"0","height":"34px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"10px","background":"rgba(0,0,0,0.5)","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.24em","textTransform":"uppercase","outline":"none"}} />
                    {"\n              "}
                    <button data-dc-tpl="72" onClick={v1.c?.onRemove} title="Fjern mal" aria-label="Fjern mal" style={{"flexShrink":"0","width":"34px","height":"34px","padding":"0","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"18px","lineHeight":"1","cursor":"pointer"}} className="scp6">
                      ×
                    </button>
                    {"\n            "}
                  </div>
                  {"\n            "}
                  <input data-dc-tpl="73" value={val(v1.c?.title)} onChange={v1.c?.onTitle} placeholder="Navn på mal" aria-label="Navn på mal" style={{"height":"44px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"10px","background":"rgba(0,0,0,0.5)","color":"#f3f1ec","font":"inherit","fontSize":"20px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%","outline":"none"}} />
                  {"\n            "}
                  <textarea data-dc-tpl="74" value={val(v1.c?.desc)} onChange={v1.c?.onDesc} placeholder="Beskrivelse" aria-label="Beskrivelse" rows="3" style={{"padding":"10px 12px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"10px","background":"rgba(0,0,0,0.5)","color":"#b3afa6","font":"inherit","fontSize":"14px","lineHeight":"1.55","resize":"vertical","outline":"none"}} />
                  {"\n            "}
                  <div data-dc-tpl="75" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                    {"\n              "}
                    <label data-dc-tpl="76" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                      <span data-dc-tpl="77" style={{"fontSize":"11px","fontWeight":"600","color":"#8a867e"}}>
                        Knappetekst
                      </span>
                      {"\n                "}
                      <input data-dc-tpl="78" value={val(v1.c?.btn)} onChange={v1.c?.onBtn} placeholder="Velg" style={{"height":"38px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"999px","background":"rgba(0,0,0,0.5)","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","outline":"none","minWidth":"0"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <label data-dc-tpl="79" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                      <span data-dc-tpl="80" style={{"fontSize":"11px","fontWeight":"600","color":"#8a867e"}}>
                        Basert på
                      </span>
                      {"\n                "}
                      <select data-dc-tpl="81" value={val(v1.c?.base)} onChange={v1.c?.onBase} style={{"height":"38px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"999px","background":"rgba(0,0,0,0.5)","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","outline":"none","minWidth":"0","cursor":"pointer"}}>
                        {"\n                  "}
                        <option data-dc-tpl="82" value="week">
                          Ukeprogram
                        </option>
                        {"\n                  "}
                        <option data-dc-tpl="83" value="sunday">
                          Søndagsmøte
                        </option>
                        {"\n                  "}
                        <option data-dc-tpl="84" value="youth">
                          Ungdomsmøte
                        </option>
                        {"\n                  "}
                        <option data-dc-tpl="85" value="blank">
                          Tom mal
                        </option>
                        {"\n                "}
                      </select>
                      {"\n              "}
                    </label>
                    {"\n            "}
                  </div>
                  {"\n            "}
                  <div data-dc-tpl="86" style={{"display":"flex","alignItems":"center","gap":"6px","marginTop":"auto","paddingTop":"6px"}}>
                    {"\n              "}
                    <button data-dc-tpl="87" onClick={v1.c?.onUp} disabled={v1.c?.isFirst} title="Flytt til venstre" aria-label="Flytt til venstre" style={css(`width:34px; height:34px; padding:0; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:#b3afa6; font:inherit; font-size:14px; cursor:pointer; opacity:${v1.c?.upOp ?? ""};`, "width:34px; height:34px; padding:0; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:#b3afa6; font:inherit; font-size:14px; cursor:pointer; opacity:{{ c.upOp }};")} className="scp7">
                      ‹
                    </button>
                    {"\n              "}
                    <button data-dc-tpl="88" onClick={v1.c?.onDown} disabled={v1.c?.isLast} title="Flytt til høyre" aria-label="Flytt til høyre" style={css(`width:34px; height:34px; padding:0; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:#b3afa6; font:inherit; font-size:14px; cursor:pointer; opacity:${v1.c?.downOp ?? ""};`, "width:34px; height:34px; padding:0; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:#b3afa6; font:inherit; font-size:14px; cursor:pointer; opacity:{{ c.downOp }};")} className="scp7">
                      ›
                    </button>
                    {"\n              "}
                    <a data-dc-tpl="89" href={v1.c?.href} style={{"marginLeft":"auto","display":"inline-flex","alignItems":"center","height":"34px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","fontSize":"12px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp8">
                      Rediger innhold
                    </a>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </div>
                {"\n        "}
              </> : null}
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n      "}
          {v.editing ? <>
            {"\n        "}
            <button data-dc-tpl="91" onClick={v.addTpl} style={{"minHeight":"200px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"10px","border":"1px dashed rgba(255,255,255,0.22)","borderRadius":"22px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp9">
              <span data-dc-tpl="92" style={{"fontSize":"30px","fontWeight":"300","letterSpacing":"0"}}>
                +
              </span>
              <span data-dc-tpl="93">
                Ny mal
              </span>
            </button>
            {"\n      "}
          </> : null}
          {"\n    "}
        </div>
        {"\n  "}
      </main>
      {"\n\n  "}
      <footer data-dc-tpl="94" style={{"position":"relative","flexShrink":"0","marginTop":"auto","height":"56px","paddingBottom":"env(safe-area-inset-bottom)","display":"flex","alignItems":"center","justifyContent":"center"}}>
        {"\n    "}
        <span data-dc-tpl="95" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"#b3afa6"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
    </div>
    </>
  );
}
