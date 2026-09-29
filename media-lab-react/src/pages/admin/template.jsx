/* GENERERT av scripts/dc2jsx.mjs fra media-lab/admin.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';

export default function template(v) {
  return (
    <>
    <div style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <input ref={v.fileRef} type="file" multiple={true} accept={v.accept} onChange={v.onFile} style={{"display":"none"}} />
      {"\n\n  "}
      {v.isAuth ? <>
        {"\n    "}
        <div style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex"}}>
          {"\n      "}
          <a href={v.homeHref} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span>
              Media Lab
            </span>
          </a>
          {"\n    "}
        </div>
        {"\n    "}
        <main style={{"flex":"1","display":"flex","alignItems":"center","justifyContent":"center","padding":"32px 20px 80px"}}>
          {"\n      "}
          <div style={{"width":"100%","maxWidth":"420px","display":"flex","flexDirection":"column","gap":"18px","padding":"32px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"22px","background":"rgba(10,10,10,0.72)","backdropFilter":"blur(16px)"}}>
            {"\n        "}
            <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
              {"\n          "}
              <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Admin
              </span>
              {"\n          "}
              <h1 style={{"margin":"0","fontSize":"28px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                {I(v.authTitle)}
              </h1>
              {"\n          "}
              <p style={{"margin":"0","fontSize":"13.5px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
                {I(v.authText)}
              </p>
              {"\n        "}
            </div>
            {"\n        "}
            {v.showForm ? <>
              {"\n          "}
              <form onSubmit={v.submitAuth} style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Brukernavn
                  </span>
                  <input value={val(v.fName)} onChange={v.onFName} autocomplete="username" autocapitalize="none" spellcheck="false" required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Passord
                  </span>
                  <input type="password" value={val(v.fPw)} onChange={v.onFPw} autocomplete={v.pwAuto} required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                {v.isSetup ? <>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Gjenta passord
                    </span>
                    <input type="password" value={val(v.fPw2)} onChange={v.onFPw2} autocomplete="new-password" required={true} style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                  </label>
                  {"\n              "}
                  {v.needCode ? <>
                    {"\n                "}
                    <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Oppsettskode
                      </span>
                      <input type="password" value={val(v.fCode)} onChange={v.onFCode} autocomplete="off" style={{"height":"44px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                    </label>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasErr ? <>
                  <span role="alert" style={{"fontSize":"13px","lineHeight":"1.5","color":"#ff8f7d"}}>
                    {I(v.err)}
                  </span>
                </> : null}
                {"\n            "}
                <button type="submit" disabled={v.busy} style={css(`height:46px; margin-top:4px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; opacity:${v.busyOp ?? ""};`)} className="scp2">
                  {I(v.submitLabel)}
                </button>
                {"\n          "}
              </form>
              {"\n        "}
            </> : null}
            {"\n        "}
            {v.showRetry ? <>
              {"\n          "}
              <button onClick={v.boot} style={{"height":"42px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp3">
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
        <div data-ml-bg="static" style={{"flex":"1","minHeight":"100dvh","display":"flex","flexDirection":"column"}}>
          {"\n      "}
          <header style={{"position":"sticky","top":"0","zIndex":"50","background":"rgba(7,7,7,0.92)","backdropFilter":"blur(10px)","display":"flex","alignItems":"center","gap":"12px","padding":"14px 20px","borderBottom":"1px solid #1c1c1c","flexWrap":"wrap"}}>
            {"\n        "}
            <a href={v.homeHref} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"36px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"12.5px","fontWeight":"600"}} className="scp3">
              <span style={{"fontSize":"15px"}}>
                ←
              </span>
              <span>
                Media Lab
              </span>
            </a>
            {"\n        "}
            <span style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
              Admin
            </span>
            {"\n        "}
            <span style={{"flex":"1"}} />
            {"\n        "}
            <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
              {"\n          "}
              <span data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600"}}>
                {I(v.meName)}
              </span>
              {"\n          "}
              <span style={css(`height:22px; padding:0 9px; display:inline-flex; align-items:center; border-radius:999px; background:${v.roleBg ?? ""}; color:#000000; font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;`)}>
                {I(v.meRole)}
              </span>
              {"\n          "}
              {v.hasOrg ? <>
                <span data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                  {I(v.meOrg)}
                </span>
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <button onClick={v.logout} style={{"height":"36px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Logg ut
            </button>
            {"\n      "}
          </header>
          {"\n      "}
          <nav style={{"display":"flex","gap":"4px","padding":"10px 20px","borderBottom":"1px solid #1c1c1c","overflowX":"auto"}}>
            {"\n        "}
            {list(v.tabs).map(($it1, $i1) => {
              const v1 = { ...v, "t": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <button onClick={v1.t?.click} style={css(`flex:0 0 auto; height:34px; padding:0 16px; border:1px solid ${v1.t?.border ?? ""}; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                  {I(v1.t?.l)}
                </button>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </nav>
          {"\n      "}
          <main style={{"flex":"1","width":"100%","maxWidth":"1200px","margin":"0 auto","padding":"24px 20px 60px","display":"flex","flexDirection":"column","gap":"20px"}}>
            {"\n\n        "}
            {v.tabFiles ? <>
              {"\n          "}
              <div onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"display":"flex","flexDirection":"column","gap":"18px"}}>
                {"\n            "}
                <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px"}}>
                  {"\n              "}
                  {v.isDev ? <>
                    {"\n                "}
                    <select value={val(v.scope)} onChange={v.onScope} aria-label="Menighet" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","fontWeight":"600","cursor":"pointer"}}>
                      {"\n                  "}
                      {list(v.scopeOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </select>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <div style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                    {"\n                "}
                    {list(v.folders).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button onClick={v1.f?.click} style={css(`height:34px; padding:0 14px; border:1px solid ${v1.f?.border ?? ""}; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`)}>
                          {I(v1.f?.l)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span style={{"flex":"1"}} />
                  {"\n              "}
                  <button onClick={v.pickFiles} disabled={v.busy} style={css(`height:38px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`)} className="scp2">
                    {I(v.uploadLabel)}
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <span style={{"fontSize":"12px","lineHeight":"1.5","color":"#8a867e"}}>
                  {I(v.folderHint)}
                </span>
                {"\n            "}
                <div style={css(`position:relative; display:flex; flex-direction:column; gap:10px; padding:16px; border:1px ${v.dropStyle ?? ""} ${v.dropBorder ?? ""}; border-radius:16px; background:#0b0b0b;`)}>
                  {"\n              "}
                  <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
                    <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Opplastet
                    </span>
                    <span data-no-i18n="1" style={{"fontSize":"12px","color":"#6f6b64"}}>
                      {I(v.cloudCount)}
                    </span>
                  </div>
                  {"\n              "}
                  {v.cloudEmpty ? <>
                    <span style={{"fontSize":"13px","color":"#8a867e"}}>
                      Ingen filer ennå. Last opp eller dra filer hit.
                    </span>
                  </> : null}
                  {"\n              "}
                  <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"12px"}}>
                    {"\n                "}
                    {list(v.cloud).map(($it1, $i1) => {
                      const v1 = { ...v, "c": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <div style={{"position":"relative","aspectRatio":"4 / 3","border":"1px solid #232323","borderRadius":"10px","background":"#141414","overflow":"hidden","display":"flex","alignItems":"center","justifyContent":"center"}}>
                            {"\n                      "}
                            {v1.c?.isImg ? <>
                              <img src={v1.c?.url} alt="" loading="lazy" style={{"width":"100%","height":"100%","objectFit":"contain"}} />
                            </> : null}
                            {"\n                      "}
                            {v1.c?.isAudio ? <>
                              <audio src={v1.c?.url} controls={true} preload="none" style={{"width":"92%"}} />
                            </> : null}
                            {"\n                      "}
                            {v1.c?.canDel ? <>
                              <button onClick={v1.c?.del} title="Slett fil" aria-label="Slett fil" style={{"position":"absolute","top":"6px","right":"6px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.75)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp5">
                                ×
                              </button>
                            </> : null}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"fontSize":"12px","color":"#c9c5bc","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v1.c?.name)}
                          </span>
                          {"\n                    "}
                          <span data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
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
                    <div style={{"position":"absolute","inset":"0","borderRadius":"16px","background":"rgba(0,0,0,0.75)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600","pointerEvents":"none"}}>
                      Slipp filene for å laste dem opp
                    </div>
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.hasBuiltin ? <>
                  {"\n              "}
                  <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                    {"\n                "}
                    <div style={{"display":"flex","alignItems":"baseline","justifyContent":"space-between","gap":"10px"}}>
                      <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Innebygd på siden
                      </span>
                      <span style={{"fontSize":"12px","color":"#6f6b64"}}>
                        Skjulte bilder vises ikke for brukerne.
                      </span>
                    </div>
                    {"\n                "}
                    <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"12px"}}>
                      {"\n                  "}
                      {list(v.builtin).map(($it1, $i1) => {
                        const v1 = { ...v, "b": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div style={css(`display:flex; flex-direction:column; gap:6px; opacity:${v1.b?.op ?? ""};`)}>
                            {"\n                      "}
                            <div style={{"aspectRatio":"4 / 3","border":"1px solid #232323","borderRadius":"10px","background":"#141414","overflow":"hidden"}}>
                              <img src={v1.b?.src} alt="" loading="lazy" style={{"width":"100%","height":"100%","objectFit":"contain"}} />
                            </div>
                            {"\n                      "}
                            <div style={{"display":"flex","alignItems":"center","gap":"6px"}}>
                              {"\n                        "}
                              <span data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12px","color":"#c9c5bc","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                                {I(v1.b?.name)}
                              </span>
                              {"\n                        "}
                              {v1.canWrite ? <>
                                <button onClick={v1.b?.toggle} style={{"flex":"0 0 auto","height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp6">
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
              <form onSubmit={v.addUser} style={{"display":"flex","flexWrap":"wrap","alignItems":"flex-end","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <label style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Brukernavn
                  </span>
                  <input value={val(v.uName)} onChange={v.onUName} autocomplete="off" autocapitalize="none" spellcheck="false" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Passord (minst 10 tegn)
                  </span>
                  <input type="password" value={val(v.uPw)} onChange={v.onUPw} autocomplete="new-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label style={{"flex":"0 1 150px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Rolle
                  </span>
                  <select value={val(v.uRole)} onChange={v.onURole} style={{"height":"40px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}}>
                    {list(v.roleOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "o": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option value={val(v1.o?.v)}>
                          {I(v1.o?.l)}
                        </option>
                      </React.Fragment>;
                    })}
                  </select>
                </label>
                {"\n            "}
                {v.showOrgPick ? <>
                  {"\n              "}
                  <label style={{"flex":"1 1 180px","display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Menighet
                    </span>
                    <select value={val(v.uOrg)} onChange={v.onUOrg} style={{"height":"40px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}}>
                      <option value="">
                        Velg menighet
                      </option>
                      {list(v.orgOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                    </select>
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button type="submit" disabled={v.busy} style={css(`height:40px; padding:0 20px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`)} className="scp2">
                  Legg til bruker
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {list(v.users).map(($it1, $i1) => {
                  const v1 = { ...v, "u": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"12px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <div style={{"flex":"1 1 200px","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"fontSize":"13.5px","fontWeight":"600"}}>
                          {I(v1.u?.name)}
                        </span>
                        {"\n                  "}
                        <span style={{"display":"flex","flexWrap":"wrap","gap":"6px","fontSize":"11.5px","color":"#8a867e"}}>
                          <span data-no-i18n="1">
                            {I(v1.u?.org)}
                          </span>
                          <span>
                            ·
                          </span>
                          <span>
                            Sist innlogget
                          </span>
                          <span data-no-i18n="1">
                            {I(v1.u?.last)}
                          </span>
                          {v1.u?.locked ? <>
                            <span style={{"color":"#f5b82c"}}>
                              Låst
                            </span>
                          </> : null}
                        </span>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {v1.u?.canManage ? <>
                        {"\n                  "}
                        <select value={val(v1.u?.role)} onChange={v1.u?.setRole} aria-label="Rolle" style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"12px","fontWeight":"600"}}>
                          {list(v1.u?.roles).map(($it2, $i2) => {
                            const v2 = { ...v1, "o": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              <option value={val(v2.o?.v)}>
                                {I(v2.o?.l)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                  "}
                        <button onClick={v1.u?.reset} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                          Nytt passord
                        </button>
                        {"\n                  "}
                        <button onClick={v1.u?.del} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                          Slett
                        </button>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      {v1.u?.fixed ? <>
                        <span style={css(`height:24px; padding:0 10px; display:inline-flex; align-items:center; border-radius:999px; background:${v1.u?.roleBg ?? ""}; color:#000000; font-size:11px; font-weight:700; text-transform:uppercase;`)}>
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
              <form onSubmit={v.addOrg} style={{"display":"flex","flexWrap":"wrap","alignItems":"flex-end","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <label style={{"flex":"1 1 260px","display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Navn på menighet
                  </span>
                  <input value={val(v.oName)} onChange={v.onOName} autocomplete="off" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <button type="submit" disabled={v.busy} style={{"height":"40px","padding":"0 20px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                  Legg til menighet
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {v.orgsEmpty ? <>
                  <span style={{"padding":"16px","fontSize":"13px","color":"#8a867e"}}>
                    Ingen menigheter ennå.
                  </span>
                </> : null}
                {"\n            "}
                {list(v.orgs).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"12px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <div style={{"flex":"1 1 200px","display":"flex","flexDirection":"column","gap":"3px"}}>
                        <span data-no-i18n="1" style={{"fontSize":"13.5px","fontWeight":"600"}}>
                          {I(v1.o?.name)}
                        </span>
                        <span style={{"display":"flex","gap":"5px","fontSize":"11.5px","color":"#8a867e"}}>
                          <span data-no-i18n="1">
                            {I(v1.o?.users)}
                          </span>
                          <span>
                            brukere
                          </span>
                        </span>
                      </div>
                      {"\n                "}
                      <button onClick={v1.o?.files} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                        Filer
                      </button>
                      {"\n                "}
                      <button onClick={v1.o?.rename} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                        Gi nytt navn
                      </button>
                      {"\n                "}
                      <button onClick={v1.o?.del} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
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
              <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"6px"}}>
                {"\n            "}
                {list(v.logFilters).map(($it1, $i1) => {
                  const v1 = { ...v, "f": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button onClick={v1.f?.click} style={css(`height:32px; padding:0 14px; border:1px solid ${v1.f?.border ?? ""}; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`)}>
                      {I(v1.f?.l)}
                    </button>
                  </React.Fragment>;
                })}
                {"\n            "}
                <span style={{"flex":"1"}} />
                {"\n            "}
                <span data-no-i18n="1" style={{"fontSize":"12px","color":"#6f6b64"}}>
                  {I(v.logTotal)}
                </span>
                {"\n            "}
                <button onClick={v.loadLogs} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                  Oppdater
                </button>
                {"\n            "}
                <button onClick={v.clearLogs} style={{"height":"32px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                  Tøm loggen
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div style={{"display":"flex","flexDirection":"column","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b","overflow":"hidden"}}>
                {"\n            "}
                {v.logsEmpty ? <>
                  <span style={{"padding":"16px","fontSize":"13px","color":"#8a867e"}}>
                    Ingen oppføringer.
                  </span>
                </> : null}
                {"\n            "}
                {list(v.logs).map(($it1, $i1) => {
                  const v1 = { ...v, "l": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <details style={{"padding":"10px 16px","borderBottom":"1px solid #181818"}}>
                      {"\n                "}
                      <summary style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","cursor":"pointer","listStyle":"none"}}>
                        {"\n                  "}
                        <span style={css(`flex:0 0 auto; height:20px; padding:0 8px; display:inline-flex; align-items:center; border-radius:999px; background:${v1.l?.col ?? ""}; color:#000000; font-size:10.5px; font-weight:700; text-transform:uppercase;`)}>
                          {I(v1.l?.type)}
                        </span>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#8a867e","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.l?.at)}
                        </span>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"flex":"1 1 240px","minWidth":"0","fontSize":"12.5px","color":"#e9e7e2","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.l?.msg)}
                        </span>
                        {"\n                  "}
                        <span data-no-i18n="1" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#6f6b64"}}>
                          {I(v1.l?.who)}
                        </span>
                        {"\n                "}
                      </summary>
                      {"\n                "}
                      <pre data-no-i18n="1" style={{"margin":"10px 0 4px","padding":"10px 12px","borderRadius":"8px","background":"#050505","color":"#b3afa6","fontSize":"11.5px","lineHeight":"1.5","whiteSpace":"pre-wrap","wordBreak":"break-word"}}>
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
              <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"16px"}}>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Oppsett
                  </span>
                  {"\n              "}
                  {list(v.sysChecks).map(($it1, $i1) => {
                    const v1 = { ...v, "c": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"13px"}}>
                        <span>
                          {I(v1.c?.l)}
                        </span>
                        <span style={css(`font-weight:700; color:${v1.c?.col ?? ""};`)}>
                          {I(v1.c?.v)}
                        </span>
                      </div>
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <div style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                  {"\n              "}
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Lagring i skyen
                  </span>
                  {"\n              "}
                  {list(v.sysStore).map(($it1, $i1) => {
                    const v1 = { ...v, "s": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"13px"}}>
                        <span data-no-i18n="1">
                          {I(v1.s?.l)}
                        </span>
                        <span data-no-i18n="1" style={{"color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
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
              <button onClick={v.loadSys} style={{"alignSelf":"flex-start","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp3">
                Oppdater
              </button>
              {"\n        "}
            </> : null}
            {"\n\n        "}
            {v.tabAcct ? <>
              {"\n          "}
              <form onSubmit={v.changePw} style={{"width":"100%","maxWidth":"420px","display":"flex","flexDirection":"column","gap":"12px","padding":"20px","border":"1px solid #1c1c1c","borderRadius":"16px","background":"#0b0b0b"}}>
                {"\n            "}
                <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                  Bytt passord
                </span>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Nåværende passord
                  </span>
                  <input type="password" value={val(v.aOld)} onChange={v.onAOld} autocomplete="current-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Nytt passord (minst 10 tegn)
                  </span>
                  <input type="password" value={val(v.aNew)} onChange={v.onANew} autocomplete="new-password" style={{"height":"40px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","outline":"none"}} className="scp1" />
                </label>
                {"\n            "}
                <button type="submit" disabled={v.busy} style={{"height":"42px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp2">
                  Lagre nytt passord
                </button>
                {"\n          "}
              </form>
              {"\n          "}
              <p style={{"margin":"0","maxWidth":"560px","fontSize":"12.5px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
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
        <div role="status" style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)"}}>
          {I(v.toast)}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
