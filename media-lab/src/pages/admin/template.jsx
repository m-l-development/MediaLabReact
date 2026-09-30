/* Konvertert fra den gamle dc-siden admin.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"16":["\n      ","←","Media Lab","\n    "],"17":["←","Media Lab"],"18":["←"],"19":["Media Lab"],"23":["Admin"],"24":["{{ authTitle }}"],"25":["{{ authText }}"],"29":["Brukernavn"],"32":["Passord"],"36":["Gjenta passord"],"40":["Oppsettskode"],"43":["{{ err }}"],"44":["{{ submitLabel }}"],"46":["Prøv igjen"],"50":["←","Media Lab"],"51":["←"],"52":["Media Lab"],"53":["Admin"],"56":["{{ meName }}"],"57":["{{ meRole }}"],"59":["{{ meOrg }}"],"60":["Logg ut"],"63":["{{ t.l }}"],"74":["{{ f.l }}"],"76":["{{ uploadLabel }}"],"77":["{{ folderHint }}"],"79":["Opplastet","{{ cloudCount }}"],"80":["Opplastet"],"81":["{{ cloudCount }}"],"83":["Ingen filer ennå. Last opp eller dra filer hit."],"93":["×"],"94":["{{ c.name }}"],"95":["{{ c.meta }}"],"97":["Slipp filene for å laste dem opp"],"100":["Innebygd på siden","Skjulte bilder vises ikke for brukerne."],"101":["Innebygd på siden"],"102":["Skjulte bilder vises ikke for brukerne."],"109":["{{ b.name }}"],"111":["{{ b.tl }}"],"115":["Brukernavn"],"118":["Passord (minst 10 tegn)"],"121":["Rolle"],"127":["Menighet"],"132":["Legg til bruker"],"137":["{{ u.name }}"],"139":["{{ u.org }}"],"140":["·"],"141":["Sist innlogget"],"142":["{{ u.last }}"],"144":["Låst"],"149":["Nytt passord"],"150":["Slett"],"152":["{{ u.roleL }}"],"156":["Navn på menighet"],"158":["Legg til menighet"],"161":["Ingen menigheter ennå."],"164":["{{ o.name }}","{{ o.users }}","brukere"],"165":["{{ o.name }}"],"166":["{{ o.users }}","brukere"],"167":["{{ o.users }}"],"168":["brukere"],"169":["Filer"],"170":["Gi nytt navn"],"171":["Slett"],"175":["{{ f.l }}"],"177":["{{ logTotal }}"],"178":["Oppdater"],"179":["Tøm loggen"],"182":["Ingen oppføringer."],"185":["\n                  ","{{ l.type }}","\n                  ","{{ l.at }}","\n                  ","{{ l.msg }}","\n                  ","{{ l.who }}","\n                "],"186":["{{ l.type }}"],"187":["{{ l.at }}"],"188":["{{ l.msg }}"],"189":["{{ l.who }}"],"190":["{{ l.detail }}"],"194":["Oppsett"],"196":["{{ c.l }}","{{ c.v }}"],"197":["{{ c.l }}"],"198":["{{ c.v }}"],"200":["Lagring i skyen"],"202":["{{ s.l }}","{{ s.v }}"],"203":["{{ s.l }}"],"204":["{{ s.v }}"],"205":["Oppdater"],"208":["Bytt passord"],"210":["Nåværende passord"],"213":["Nytt passord (minst 10 tegn)"],"215":["Lagre nytt passord"],"216":["Du logges ut automatisk etter 12 timer. Etter fem feil passordforsøk låses kontoen i 15 minutter."],"218":["{{ toast }}"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="13" style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <input data-dc-tpl="14" ref={v.fileRef} type="file" multiple={true} accept={v.accept} onChange={v.onFile} style={{"display":"none"}} />
      {"\n\n  "}
      {v.isAuth ? <>
        {"\n    "}
        <div data-dc-tpl="16" style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex"}}>
          {"\n      "}
          <a data-dc-tpl="17" href={v.homeHref} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span data-dc-tpl="18" style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span data-dc-tpl="19">
              Media Lab
            </span>
          </a>
          {"\n    "}
        </div>
        {"\n    "}
        <main data-dc-tpl="20" style={{"flex":"1","display":"flex","alignItems":"center","justifyContent":"center","padding":"32px 20px 80px"}}>
          {"\n      "}
          <div data-dc-tpl="21" style={{"width":"100%","maxWidth":"420px","display":"flex","flexDirection":"column","gap":"18px","padding":"32px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"22px","background":"rgba(10,10,10,0.72)","backdropFilter":"blur(16px)"}}>
            {"\n        "}
            <div data-dc-tpl="22" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
              {"\n          "}
              <span data-dc-tpl="23" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Admin
              </span>
              {"\n          "}
              <h1 data-dc-tpl="24" style={{"margin":"0","fontSize":"28px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                {I(v.authTitle)}
              </h1>
              {"\n          "}
              <p data-dc-tpl="25" style={{"margin":"0","fontSize":"13.5px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
                {I(v.authText)}
              </p>
              {"\n        "}
            </div>
            {"\n        "}
            {v.showForm ? <>
              {"\n          "}
              <form data-dc-tpl="27" onSubmit={v.submitAuth} style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <label data-dc-tpl="28" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="29" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Brukernavn
                  </span>
                  <input data-dc-tpl="30" value={val(v.fName)} onChange={v.onFName} autocomplete="username" autocapitalize="none" spellcheck="false" required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label data-dc-tpl="31" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="32" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Passord
                  </span>
                  <input data-dc-tpl="33" type="password" value={val(v.fPw)} onChange={v.onFPw} autocomplete={v.pwAuto} required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                {v.isSetup ? <>
                  {"\n              "}
                  <label data-dc-tpl="35" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="36" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Gjenta passord
                    </span>
                    <input data-dc-tpl="37" type="password" value={val(v.fPw2)} onChange={v.onFPw2} autocomplete="new-password" required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                  </label>
                  {"\n              "}
                  {v.needCode ? <>
                    {"\n                "}
                    <label data-dc-tpl="39" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="40" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Oppsettskode
                      </span>
                      <input data-dc-tpl="41" type="password" value={val(v.fCode)} onChange={v.onFCode} autocomplete="off" style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                    </label>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasErr ? <>
                  <span data-dc-tpl="43" role="alert" style={{"fontSize":"13px","lineHeight":"1.5","color":"#ff8f7d"}}>
                    {I(v.err)}
                  </span>
                </> : null}
                {"\n            "}
                <button data-dc-tpl="44" type="submit" disabled={v.busy} style={css(`height:46px; margin-top:4px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:46px; margin-top:4px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; opacity:{{ busyOp }};")} className="scp2">
                  {I(v.submitLabel)}
                </button>
                {"\n          "}
              </form>
              {"\n        "}
            </> : null}
            {"\n        "}
            {v.showRetry ? <>
              {"\n          "}
              <button data-dc-tpl="46" onClick={v.boot} style={{"height":"42px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                Prøv igjen
              </button>
              {"\n        "}
            </> : null}
            {"\n      "}
          </div>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isPanel ? <>
        {"\n    "}
        <div data-dc-tpl="48" data-ml-bg="static" style={{"flex":"1","minHeight":"100dvh","display":"flex","flexDirection":"column"}}>
          {"\n      "}
          <header data-dc-tpl="49" style={{"position":"sticky","top":"0","zIndex":"50","background":"rgba(7,7,7,0.92)","backdropFilter":"blur(10px)","display":"flex","alignItems":"center","gap":"12px","padding":"14px 20px","borderBottom":"1px solid #1c1c1c","flexWrap":"wrap"}}>
            {"\n        "}
            <a data-dc-tpl="50" href={v.homeHref} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"36px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"12.5px","fontWeight":"600"}} className="scp3">
              <span data-dc-tpl="51" style={{"fontSize":"15px"}}>
                ←
              </span>
              <span data-dc-tpl="52">
                Media Lab
              </span>
            </a>
            {"\n        "}
            <span data-dc-tpl="53" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
              Admin
            </span>
            {"\n        "}
            <span data-dc-tpl="54" style={{"flex":"1"}} />
            {"\n        "}
            <div data-dc-tpl="55" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
              {"\n          "}
              <span data-dc-tpl="56" data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600"}}>
                {I(v.meName)}
              </span>
              {"\n          "}
              <span data-dc-tpl="57" style={css(`height:22px; padding:0 9px; display:inline-flex; align-items:center; border-radius:999px; background:${v.roleBg ?? ""}; color:#000000; font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;`, "height:22px; padding:0 9px; display:inline-flex; align-items:center; border-radius:999px; background:{{ roleBg }}; color:#000000; font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;")}>
                {I(v.meRole)}
              </span>
              {"\n          "}
              {v.hasOrg ? <>
                <span data-dc-tpl="59" data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                  {I(v.meOrg)}
                </span>
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <button data-dc-tpl="60" onClick={v.logout} style={{"height":"36px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Logg ut
            </button>
            {"\n      "}
          </header>
          {"\n      "}
          <nav data-dc-tpl="61" style={{"display":"flex","gap":"4px","padding":"10px 20px","borderBottom":"1px solid #1c1c1c","overflowX":"auto"}}>
            {"\n        "}
            {list(v.tabs).map(($it1, $i1) => {
              const v1 = { ...v, "t": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <button data-dc-tpl="63" onClick={v1.t?.click} style={css(`flex:0 0 auto; height:34px; padding:0 16px; border:1px solid ${v1.t?.border ?? ""}; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:0 0 auto; height:34px; padding:0 16px; border:1px solid {{ t.border }}; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                  {I(v1.t?.l)}
                </button>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </nav>
          {"\n      "}
          <main data-dc-tpl="64" style={{"flex":"1","width":"100%","maxWidth":"1200px","margin":"0 auto","padding":"24px 20px 60px","display":"flex","flexDirection":"column","gap":"20px"}}>
            {"\n\n        "}
            {v.tabFiles ? <>
              {"\n          "}
              <div data-dc-tpl="66" onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"display":"flex","flexDirection":"column","gap":"18px"}}>
                {"\n            "}
                <div data-dc-tpl="67" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px"}}>
                  {"\n              "}
                  {v.isDev ? <>
                    {"\n                "}
                    <select data-dc-tpl="69" value={val(v.scope)} onChange={v.onScope} aria-label="Menighet" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","fontWeight":"600","cursor":"pointer"}}>
                      {"\n                  "}
                      {list(v.scopeOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option data-dc-tpl="71" value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </select>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <div data-dc-tpl="72" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                    {"\n                "}
                    {list(v.folders).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="74" onClick={v1.f?.click} style={css(`height:34px; padding:0 14px; border:1px solid ${v1.f?.border ?? ""}; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:34px; padding:0 14px; border:1px solid {{ f.border }}; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                          {I(v1.f?.l)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span data-dc-tpl="75" style={{"flex":"1"}} />
                  {"\n              "}
                  <button data-dc-tpl="76" onClick={v.pickFiles} disabled={v.busy} style={css(`height:38px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:38px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp2">
                    {I(v.uploadLabel)}
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <span data-dc-tpl="77" style={{"fontSize":"12px","lineHeight":"1.5","color":"#8a867e"}}>
                  {I(v.folderHint)}
                </span>
                {"\n            "}
                <div data-dc-tpl="78" style={css(`position:relative; display:flex; flex-direction:column; gap:10px; padding:16px; border:1px ${v.dropStyle ?? ""} ${v.dropBorder ?? ""}; border-radius:16px; background:#0b0b0b;`, "position:relative; display:flex; flex-direction:column; gap:10px; padding:16px; border:1px {{ dropStyle }} {{ dropBorder }}; border-radius:16px; background:#0b0b0b;")}>
                  {"\n              "}
                  <div data-dc-tpl="79" style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
                    <span data-dc-tpl="80" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Opplastet
                    </span>
                    <span data-dc-tpl="81" data-no-i18n="1" style={{"fontSize":"12px","color":"#6f6b64"}}>
                      {I(v.cloudCount)}
                    </span>
                  </div>
                  {"\n              "}
                  {v.cloudEmpty ? <>
                    <span data-dc-tpl="83" style={{"fontSize":"13px","color":"#8a867e"}}>
                      Ingen filer ennå. Last opp eller dra filer hit.
                    </span>
                  </> : null}
                  {"\n              "}
                  <div data-dc-tpl="84" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"12px"}}>
                    {"\n                "}
                    {list(v.cloud).map(($it1, $i1) => {
                      const v1 = { ...v, "c": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div data-dc-tpl="86" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <div data-dc-tpl="87" style={{"position":"relative","aspectRatio":"4 / 3","border":"1px solid #232323","borderRadius":"10px","background":"#141414","overflow":"hidden","display":"flex","alignItems":"center","justifyContent":"center"}}>
                            {"\n                      "}
                            {v1.c?.isImg ? <>
                              <img data-dc-tpl="89" src={v1.c?.url} alt="" loading="lazy" style={{"width":"100%","height":"100%","objectFit":"contain"}} />
                            </> : null}
                            {"\n                      "}
                            {v1.c?.isAudio ? <>
                              <audio data-dc-tpl="91" src={v1.c?.url} controls={true} preload="none" style={{"width":"92%"}} />
                            </> : null}
                            {"\n                      "}
                            {v1.c?.canDel ? <>
                              <button data-dc-tpl="93" onClick={v1.c?.del} title="Slett fil" aria-label="Slett fil" style={{"position":"absolute","top":"6px","right":"6px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.75)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp5">
                                ×
                              </button>
                            </> : null}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          <span data-dc-tpl="94" data-no-i18n="1" style={{"fontSize":"12px","color":"#c9c5bc","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v1.c?.name)}
                          </span>
                          {"\n                    "}
                          <span data-dc-tpl="95" data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
                            {I(v1.c?.meta)}
                          </span>
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.dragOver ? <>
                    <div data-dc-tpl="97" style={{"position":"absolute","inset":"0","borderRadius":"16px","background":"rgba(0,0,0,0.75)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600","pointerEvents":"none"}}>
                      Slipp filene for å laste dem opp
                    </div>
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.hasBuiltin ? <>
                  {"\n              "}
                  <div data-dc-tpl="99" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                    {"\n                "}
                    <div data-dc-tpl="100" style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
                      <span data-dc-tpl="101" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Innebygd på siden
                      </span>
                      <span data-dc-tpl="102" style={{"fontSize":"12px","color":"#6f6b64"}}>
                        Skjulte bilder vises ikke for brukerne.
                      </span>
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="103" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"12px"}}>
                      {"\n                  "}
                      {list(v.builtin).map(($it1, $i1) => {
                        const v1 = { ...v, "b": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div data-dc-tpl="105" style={css(`display:flex; flex-direction:column; gap:6px; opacity:${v1.b?.op ?? ""};`, "display:flex; flex-direction:column; gap:6px; opacity:{{ b.op }};")}>
                            {"\n                      "}
                            <div data-dc-tpl="106" style={{"aspectRatio":"4 / 3","border":"1px solid #232323","borderRadius":"10px","background":"#141414","overflow":"hidden"}}>
                              <img data-dc-tpl="107" src={v1.b?.src} alt="" loading="lazy" style={{"width":"100%","height":"100%","objectFit":"contain"}} />
                            </div>
                            {"\n                      "}
                            <div data-dc-tpl="108" style={{"display":"flex","alignItems":"center","gap":"6px"}}>
                              {"\n                        "}
                              <span data-dc-tpl="109" data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12px","color":"#c9c5bc","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                                {I(v1.b?.name)}
                              </span>
                              {"\n                        "}
                              {v1.canWrite ? <>
                                <button data-dc-tpl="111" onClick={v1.b?.toggle} style={{"flex":"0 0 auto","height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                                  {I(v1.b?.tl)}
                                </button>
                              </> : null}
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
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabUsers ? <>
              {"\n          "}
              <form data-dc-tpl="113" onSubmit={v.addUser} style={{"display":"flex","flexWrap":"wrap","alignItems":"flex-end","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <label data-dc-tpl="114" style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="115" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Brukernavn
                  </span>
                  <input data-dc-tpl="116" value={val(v.uName)} onChange={v.onUName} autocomplete="off" autocapitalize="none" spellcheck="false" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label data-dc-tpl="117" style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="118" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Passord (minst 10 tegn)
                  </span>
                  <input data-dc-tpl="119" type="password" value={val(v.uPw)} onChange={v.onUPw} autocomplete="new-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label data-dc-tpl="120" style={{"flex":"0 1 150px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="121" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Rolle
                  </span>
                  <select data-dc-tpl="122" value={val(v.uRole)} onChange={v.onURole} style={{"height":"40px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}}>
                    {list(v.roleOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "o": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option data-dc-tpl="124" value={val(v1.o?.v)}>
                          {I(v1.o?.l)}
                        </option>
                      </React.Fragment>;
                    })}
                  </select>
                </label>
                {"\n            "}
                {v.showOrgPick ? <>
                  {"\n              "}
                  <label data-dc-tpl="126" style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="127" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Menighet
                    </span>
                    <select data-dc-tpl="128" value={val(v.uOrg)} onChange={v.onUOrg} style={{"height":"40px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}}>
                      <option data-dc-tpl="129" value="">
                        Velg menighet
                      </option>
                      {list(v.orgOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option data-dc-tpl="131" value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                    </select>
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button data-dc-tpl="132" type="submit" disabled={v.busy} style={css(`height:40px; padding:0 20px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:40px; padding:0 20px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp2">
                  Legg til bruker
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <div data-dc-tpl="133" style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {list(v.users).map(($it1, $i1) => {
                  const v1 = { ...v, "u": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="135" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"12px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <div data-dc-tpl="136" style={{"flex":"1 1 200px","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                        {"\n                  "}
                        <span data-dc-tpl="137" data-no-i18n="1" style={{"fontSize":"13.5px","fontWeight":"600"}}>
                          {I(v1.u?.name)}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="138" style={{"display":"flex","flexWrap":"wrap","gap":"6px","fontSize":"11.5px","color":"#8a867e"}}>
                          <span data-dc-tpl="139" data-no-i18n="1">
                            {I(v1.u?.org)}
                          </span>
                          <span data-dc-tpl="140">
                            ·
                          </span>
                          <span data-dc-tpl="141">
                            Sist innlogget
                          </span>
                          <span data-dc-tpl="142" data-no-i18n="1">
                            {I(v1.u?.last)}
                          </span>
                          {v1.u?.locked ? <>
                            <span data-dc-tpl="144" style={{"color":"#f5b82c"}}>
                              Låst
                            </span>
                          </> : null}
                        </span>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {v1.u?.canManage ? <>
                        {"\n                  "}
                        <select data-dc-tpl="146" value={val(v1.u?.role)} onChange={v1.u?.setRole} aria-label="Rolle" style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"12px","fontWeight":"600"}}>
                          {list(v1.u?.roles).map(($it2, $i2) => {
                            const v2 = { ...v1, "o": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              <option data-dc-tpl="148" value={val(v2.o?.v)}>
                                {I(v2.o?.l)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                  "}
                        <button data-dc-tpl="149" onClick={v1.u?.reset} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                          Nytt passord
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="150" onClick={v1.u?.del} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                          Slett
                        </button>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      {v1.u?.fixed ? <>
                        <span data-dc-tpl="152" style={css(`height:24px; padding:0 10px; display:inline-flex; align-items:center; border-radius:999px; background:${v1.u?.roleBg ?? ""}; color:#000000; font-size:11px; font-weight:700; text-transform:uppercase;`, "height:24px; padding:0 10px; display:inline-flex; align-items:center; border-radius:999px; background:{{ u.roleBg }}; color:#000000; font-size:11px; font-weight:700; text-transform:uppercase;")}>
                          {I(v1.u?.roleL)}
                        </span>
                      </> : null}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabOrgs ? <>
              {"\n          "}
              <form data-dc-tpl="154" onSubmit={v.addOrg} style={{"display":"flex","flexWrap":"wrap","alignItems":"flex-end","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <label data-dc-tpl="155" style={{"flex":"1 1 260px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="156" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Navn på menighet
                  </span>
                  <input data-dc-tpl="157" value={val(v.oName)} onChange={v.onOName} autocomplete="off" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <button data-dc-tpl="158" type="submit" disabled={v.busy} style={{"height":"40px","padding":"0 20px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                  Legg til menighet
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <div data-dc-tpl="159" style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {v.orgsEmpty ? <>
                  <span data-dc-tpl="161" style={{"padding":"16px","fontSize":"13px","color":"#8a867e"}}>
                    Ingen menigheter ennå.
                  </span>
                </> : null}
                {"\n            "}
                {list(v.orgs).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="163" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"12px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <div data-dc-tpl="164" style={{"flex":"1 1 200px","display":"flex","flexDirection":"column","gap":"3px"}}>
                        <span data-dc-tpl="165" data-no-i18n="1" style={{"fontSize":"13.5px","fontWeight":"600"}}>
                          {I(v1.o?.name)}
                        </span>
                        <span data-dc-tpl="166" style={{"display":"flex","gap":"5px","fontSize":"11.5px","color":"#8a867e"}}>
                          <span data-dc-tpl="167" data-no-i18n="1">
                            {I(v1.o?.users)}
                          </span>
                          <span data-dc-tpl="168">
                            brukere
                          </span>
                        </span>
                      </div>
                      {"\n                "}
                      <button data-dc-tpl="169" onClick={v1.o?.files} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                        Filer
                      </button>
                      {"\n                "}
                      <button data-dc-tpl="170" onClick={v1.o?.rename} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                        Gi nytt navn
                      </button>
                      {"\n                "}
                      <button data-dc-tpl="171" onClick={v1.o?.del} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                        Slett
                      </button>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabLogs ? <>
              {"\n          "}
              <div data-dc-tpl="173" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"6px"}}>
                {"\n            "}
                {list(v.logFilters).map(($it1, $i1) => {
                  const v1 = { ...v, "f": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button data-dc-tpl="175" onClick={v1.f?.click} style={css(`height:32px; padding:0 14px; border:1px solid ${v1.f?.border ?? ""}; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:32px; padding:0 14px; border:1px solid {{ f.border }}; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                      {I(v1.f?.l)}
                    </button>
                  </React.Fragment>;
                })}
                {"\n            "}
                <span data-dc-tpl="176" style={{"flex":"1"}} />
                {"\n            "}
                <span data-dc-tpl="177" data-no-i18n="1" style={{"fontSize":"12px","color":"#6f6b64"}}>
                  {I(v.logTotal)}
                </span>
                {"\n            "}
                <button data-dc-tpl="178" onClick={v.loadLogs} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                  Oppdater
                </button>
                {"\n            "}
                <button data-dc-tpl="179" onClick={v.clearLogs} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                  Tøm loggen
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="180" style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {v.logsEmpty ? <>
                  <span data-dc-tpl="182" style={{"padding":"16px","fontSize":"13px","color":"#8a867e"}}>
                    Ingen oppføringer.
                  </span>
                </> : null}
                {"\n            "}
                {list(v.logs).map(($it1, $i1) => {
                  const v1 = { ...v, "l": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <details data-dc-tpl="184" style={{"padding":"10px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <summary data-dc-tpl="185" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","cursor":"pointer","listStyle":"none"}}>
                        {"\n                  "}
                        <span data-dc-tpl="186" style={css(`flex:0 0 auto; height:20px; padding:0 8px; display:inline-flex; align-items:center; border-radius:999px; background:${v1.l?.col ?? ""}; color:#000000; font-size:10.5px; font-weight:700; text-transform:uppercase;`, "flex:0 0 auto; height:20px; padding:0 8px; display:inline-flex; align-items:center; border-radius:999px; background:{{ l.col }}; color:#000000; font-size:10.5px; font-weight:700; text-transform:uppercase;")}>
                          {I(v1.l?.type)}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="187" data-no-i18n="1" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#8a867e","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.l?.at)}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="188" data-no-i18n="1" style={{"flex":"1 1 240px","minWidth":"0","fontSize":"12.5px","color":"#e9e7e2","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.l?.msg)}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="189" data-no-i18n="1" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#6f6b64"}}>
                          {I(v1.l?.who)}
                        </span>
                        {"\n                "}
                      </summary>
                      {"\n                "}
                      <pre data-dc-tpl="190" data-no-i18n="1" style={{"margin":"10px 0 4px","padding":"10px 12px","borderRadius":"8px","background":"#050505","color":"#b3afa6","fontSize":"11.5px","lineHeight":"1.5","whiteSpace":"pre-wrap","wordBreak":"break-word"}}>
                        {I(v1.l?.detail)}
                      </pre>
                      {"\n              "}
                    </details>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabSys ? <>
              {"\n          "}
              <div data-dc-tpl="192" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"16px"}}>
                {"\n            "}
                <div data-dc-tpl="193" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                  {"\n              "}
                  <span data-dc-tpl="194" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Oppsett
                  </span>
                  {"\n              "}
                  {list(v.sysChecks).map(($it1, $i1) => {
                    const v1 = { ...v, "c": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <div data-dc-tpl="196" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"13px"}}>
                        <span data-dc-tpl="197">
                          {I(v1.c?.l)}
                        </span>
                        <span data-dc-tpl="198" style={css(`font-weight:700; color:${v1.c?.col ?? ""};`, "font-weight:700; color:{{ c.col }};")}>
                          {I(v1.c?.v)}
                        </span>
                      </div>
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="199" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                  {"\n              "}
                  <span data-dc-tpl="200" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Lagring i skyen
                  </span>
                  {"\n              "}
                  {list(v.sysStore).map(($it1, $i1) => {
                    const v1 = { ...v, "s": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <div data-dc-tpl="202" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"13px"}}>
                        <span data-dc-tpl="203" data-no-i18n="1">
                          {I(v1.s?.l)}
                        </span>
                        <span data-dc-tpl="204" data-no-i18n="1" style={{"color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.s?.v)}
                        </span>
                      </div>
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <button data-dc-tpl="205" onClick={v.loadSys} style={{"alignSelf":"flex-start","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                Oppdater
              </button>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabAcct ? <>
              {"\n          "}
              <form data-dc-tpl="207" onSubmit={v.changePw} style={{"width":"100%","maxWidth":"420px","display":"flex","flexDirection":"column","gap":"12px","padding":"20px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <span data-dc-tpl="208" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                  Bytt passord
                </span>
                {"\n            "}
                <label data-dc-tpl="209" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="210" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Nåværende passord
                  </span>
                  <input data-dc-tpl="211" type="password" value={val(v.aOld)} onChange={v.onAOld} autocomplete="current-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label data-dc-tpl="212" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span data-dc-tpl="213" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Nytt passord (minst 10 tegn)
                  </span>
                  <input data-dc-tpl="214" type="password" value={val(v.aNew)} onChange={v.onANew} autocomplete="new-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <button data-dc-tpl="215" type="submit" disabled={v.busy} style={{"height":"42px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                  Lagre nytt passord
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <p data-dc-tpl="216" style={{"margin":"0","maxWidth":"560px","fontSize":"12.5px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                Du logges ut automatisk etter 12 timer. Etter fem feil passordforsøk låses kontoen i 15 minutter.
              </p>
              {"\n        "}
            </> : null}
            {"\n      "}
          </main>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.hasToast ? <>
        {"\n    "}
        <div data-dc-tpl="218" role="status" style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)"}}>
          {I(v.toast)}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
