/* GENERERT av scripts/dc2jsx.mjs fra media-lab/media-lab.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { css } from '../../shared/dc.jsx';

export default function template(v) {
  return (
    <>
    <div data-ml-theme={v.theme} style={{"position":"relative","minHeight":"100dvh","boxSizing":"border-box","overflow":"hidden","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"var(--ml-fg, #f3f1ec)","background":"var(--ml-bg, #000)","fontSize":"14px","transition":"background-color .3s ease, color .3s ease"}}>
      {"\n  "}
      <div style={{"position":"absolute","left":"50%","top":"30%","width":"70vw","height":"50vw","maxWidth":"1100px","maxHeight":"760px","transform":"translate(-50%, -50%) rotate(-18deg)","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(var(--ml-glow, 255,255,255),0.16), rgba(var(--ml-glow, 255,255,255),0.05) 55%, rgba(var(--ml-glow, 255,255,255),0) 100%)","filter":"blur(40px)","pointerEvents":"none"}} />
      {"\n  "}
      <div style={{"position":"absolute","right":"-12vw","top":"-10vw","width":"48vw","height":"48vw","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(var(--ml-glow2, 170,180,200),0.16), rgba(var(--ml-glow2, 170,180,200),0) 100%)","filter":"blur(30px)","pointerEvents":"none"}} />
      {"\n  "}
      <canvas ref={v.meshRef} style={{"position":"absolute","left":"0","right":"0","bottom":"0","width":"100%","height":"62vh","pointerEvents":"none","display":"block"}} />
      {"\n  "}
      <div style={{"position":"absolute","left":"18%","top":"22%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 10px 3px rgba(255,255,255,0.55)"}} />
      {"\n  "}
      <div style={{"position":"absolute","left":"74%","top":"16%","width":"4px","height":"4px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 14px 4px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div style={{"position":"absolute","left":"60%","top":"44%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 8px 2px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div style={{"position":"absolute","left":"9%","top":"58%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 8px 2px rgba(255,255,255,0.45)"}} />
      {"\n  "}
      <div style={{"position":"absolute","left":"88%","top":"66%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 10px 3px rgba(255,255,255,0.5)"}} />
      {"\n\n  "}
      <div data-no-i18n="1" role="group" aria-label="Språk / Language" style={{"position":"fixed","top":"calc(16px + env(safe-area-inset-top))","right":"18px","zIndex":"60","display":"flex","gap":"2px","padding":"3px","border":"1px solid var(--ml-line-soft, rgba(255,255,255,0.1))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)"}}>
        {"\n    "}
        <button onClick={v.setNo} aria-pressed={v.isNo} title="Norsk" style={css(`height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:${v.noBg ?? ""}; color:${v.noFg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;`, "height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:{{ noBg }}; color:{{ noFg }}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;")} className="scp0">
          NO
        </button>
        {"\n    "}
        <button onClick={v.setEn} aria-pressed={v.isEn} title="English" style={css(`height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:${v.enBg ?? ""}; color:${v.enFg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;`, "height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:{{ enBg }}; color:{{ enFg }}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;")} className="scp0">
          EN
        </button>
        {"\n  "}
      </div>
      {"\n  "}
      <main style={{"position":"relative","flex":"1","width":"100%","maxWidth":"1040px","margin":"0 auto","padding":"14vh 28px 64px","display":"flex","flexDirection":"column","alignItems":"center","gap":"56px"}}>
        {"\n    "}
        <h1 style={{"margin":"0","textAlign":"center","fontSize":"clamp(40px, 8.5vw, 104px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
          Media Lab
        </h1>
        {"\n\n    "}
        {v.atHome ? <>
          {"\n    "}
          <div style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
            {"\n      "}
            <a href="loop-studio.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
              {"\n        "}
              <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                Video
              </div>
              {"\n        "}
              <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Loop Studio
              </div>
              {"\n        "}
              <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Lag en loopende video av ukens program med bilder, musikk og effekter.
              </div>
              {"\n        "}
              <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
              </div>
              {"\n      "}
            </a>
            {"\n\n      "}
            <a href="thumbnail-studio.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
              {"\n        "}
              <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                Bilde
              </div>
              {"\n        "}
              <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Thumbnail Studio
              </div>
              {"\n        "}
              <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Lag miniatyrbilder i 16:9 til YouTube og appen fra faste maler. Last ned i 1080p eller 4K.
              </div>
              {"\n        "}
              <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
              </div>
              {"\n      "}
            </a>
            {"\n\n      "}
            <button onClick={v.openSome} style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
              {"\n        "}
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","color":"var(--ml-label, #9d998f)"}}>
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Sosiale medier
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
              </div>
              {"\n        "}
              <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"none","fontStretch":"118%"}}>
                SoMe
              </div>
              {"\n        "}
              <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Redigeringsprogram for video og bilde til promo, Instagram og Facebook.
              </div>
              {"\n        "}
              <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex","alignItems":"center","gap":"14px"}}>
                <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
                <span style={{"fontSize":"12.5px","color":"var(--ml-dim, #8a867e)"}}>
                  2 verktøy
                </span>
              </div>
              {"\n      "}
            </button>
            {"\n\n      "}
            <button onClick={v.openTools} style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
              {"\n        "}
              <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","color":"var(--ml-label, #9d998f)"}}>
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Mappe
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
              </div>
              {"\n        "}
              <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Tools
              </div>
              {"\n        "}
              <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Mindre verktøy for bilder: isoler motiv og legg bilder inn i ekte skjermer.
              </div>
              {"\n        "}
              <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex","alignItems":"center","gap":"14px"}}>
                <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
                <span style={{"fontSize":"12.5px","color":"var(--ml-dim, #8a867e)"}}>
                  2 verktøy
                </span>
              </div>
              {"\n      "}
            </button>
            {"\n\n    "}
          </div>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.atSome ? <>
          {"\n    "}
          <div style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
            {"\n      "}
            <div style={{"width":"100%","maxWidth":"1000px","display":"flex","alignItems":"center","gap":"14px","flexWrap":"wrap"}}>
              {"\n        "}
              <button onClick={v.closeFolder} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"36px","padding":"0 16px 0 12px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
                Tilbake
              </button>
              {"\n        "}
              <div style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--ml-label, #9d998f)"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
                <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"none"}}>
                  SoMe
                </span>
              </div>
              {"\n      "}
            </div>
            {"\n\n      "}
            <div style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
              {"\n      "}
              <a href="motion-design.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
                {"\n        "}
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Video
                </div>
                {"\n        "}
                <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Motion design
                </div>
                {"\n        "}
                <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger.
                </div>
                {"\n        "}
                <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
              <a href="photo-design.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp3">
                {"\n        "}
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Photo design
                </div>
                {"\n        "}
                <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Rediger bilder med lag, justeringer og maler til promo, Instagram og Facebook.
                </div>
                {"\n        "}
                <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
            </div>
            {"\n    "}
          </div>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.atTools ? <>
          {"\n    "}
          <div style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
            {"\n      "}
            <div style={{"width":"100%","maxWidth":"1000px","display":"flex","alignItems":"center","gap":"14px","flexWrap":"wrap"}}>
              {"\n        "}
              <button onClick={v.closeFolder} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"36px","padding":"0 16px 0 12px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
                Tilbake
              </button>
              {"\n        "}
              <div style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--ml-label, #9d998f)"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
                <span style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase"}}>
                  Tools
                </span>
              </div>
              {"\n      "}
            </div>
            {"\n\n      "}
            <div style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
              {"\n      "}
              <a href="isolate-subject.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
                {"\n        "}
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Isolate Subject
                </div>
                {"\n        "}
                <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Isoler en person, et objekt, en logo eller tekst fra bildet med AI, rett i nettleseren. Gratis, og bildet lastes aldri opp.
                </div>
                {"\n        "}
                <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
              <a href="mockups.dc.html" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp3">
                {"\n        "}
                <div style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Mockups
                </div>
                {"\n        "}
                <div style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Legg et bilde inn i skjermen på en PC, TV, nettbrett eller telefon i ekte fotografier.
                </div>
                {"\n        "}
                <div style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
            </div>
            {"\n    "}
          </div>
          {"\n    "}
        </> : null}
        {"\n  "}
      </main>
      {"\n\n  "}
      <footer style={{"position":"relative","flexShrink":"0","marginTop":"auto","height":"56px","paddingBottom":"env(safe-area-inset-bottom)","display":"flex","alignItems":"center","justifyContent":"center"}}>
        {"\n  "}
        <button onClick={v.toggleTheme} title={v.themeTitle} aria-label={v.themeTitle} style={{"position":"fixed","right":"12px","bottom":"calc(12px + env(safe-area-inset-bottom))","zIndex":"60","width":"32px","height":"32px","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid var(--ml-line-soft, rgba(255,255,255,0.1))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-dim, #8a867e)","cursor":"pointer"}} className="scp4">
          {"\n    "}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
          </svg>
          {"\n  "}
        </button>
        {"\n    "}
        <span style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"var(--ml-muted, #b3afa6)"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
      {"\n  "}
      <a href="admin.dc.html" title="Admin" aria-label="Admin" style={{"position":"fixed","left":"18px","bottom":"calc(18px + env(safe-area-inset-bottom))","zIndex":"60","width":"40px","height":"40px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-muted, #b3afa6)"}} className="scp5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
          <circle cx="12" cy="10.5" r="2.3" />
          <path d="M8.4 16.2c.8-1.6 2.1-2.4 3.6-2.4s2.8.8 3.6 2.4" />
        </svg>
      </a>
    </div>
    </>
  );
}
