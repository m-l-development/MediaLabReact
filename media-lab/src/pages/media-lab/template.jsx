/* Konvertert fra den gamle dc-siden media-lab.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { css } from '../../shared/dc.jsx';
import { canAdmin } from '../../services/data/me.js';
import FolderLinks from './folder-links.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"17":["NO"],"18":["EN"],"20":["Media Lab"],"24":["Video"],"25":["Loop Studio"],"26":["Lag en loopende video av ukens program med bilder, musikk og effekter."],"27":["Åpne"],"28":["Åpne"],"30":["Bilde"],"31":["Thumbnail Studio"],"32":["Lag miniatyrbilder i 16:9 til YouTube og appen fra faste maler. Last ned i 1080p eller 4K."],"33":["Åpne"],"34":["Åpne"],"37":["Sosiale medier"],"40":["SoMe"],"41":["Redigeringsprogram for video og bilde til promo, Instagram og Facebook."],"42":["Åpne","2 verktøy"],"43":["Åpne"],"44":["2 verktøy"],"47":["Mappe"],"50":["Tools"],"51":["Mindre verktøy for bilder: isoler motiv og legg bilder inn i ekte skjermer."],"52":["Åpne","2 verktøy"],"53":["Åpne"],"54":["2 verktøy"],"64":["SoMe"],"67":["Video"],"68":["Motion design"],"69":["Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger."],"70":["Åpne"],"71":["Åpne"],"73":["Bilde"],"74":["Photo design"],"75":["Rediger bilder med lag, justeringer og maler til promo, Instagram og Facebook."],"76":["Åpne"],"77":["Åpne"],"87":["Tools"],"90":["Bilde"],"91":["Isolate Subject"],"92":["Isoler en person, et objekt, en logo eller tekst fra bildet med AI, rett i nettleseren. Gratis, og bildet lastes aldri opp."],"93":["Åpne"],"94":["Åpne"],"96":["Bilde"],"97":["Mockups"],"98":["Legg et bilde inn i skjermen på en PC, TV, nettbrett eller telefon i ekte fotografier."],"99":["Åpne"],"100":["Åpne"],"106":["Design by Kristen Utvikling"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="7" data-ml-theme={v.theme} style={{"position":"relative","minHeight":"100dvh","boxSizing":"border-box","overflow":"hidden","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"var(--ml-fg, #f3f1ec)","background":"var(--ml-bg, #000)","fontSize":"14px","transition":"background-color .3s ease, color .3s ease"}}>
      {"\n  "}
      <div data-dc-tpl="8" style={{"position":"absolute","left":"50%","top":"30%","width":"70vw","height":"50vw","maxWidth":"1100px","maxHeight":"760px","transform":"translate(-50%, -50%) rotate(-18deg)","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(var(--ml-glow, 255,255,255),0.16), rgba(var(--ml-glow, 255,255,255),0.05) 55%, rgba(var(--ml-glow, 255,255,255),0) 100%)","filter":"blur(40px)","pointerEvents":"none"}} />
      {"\n  "}
      <div data-dc-tpl="9" style={{"position":"absolute","right":"-12vw","top":"-10vw","width":"48vw","height":"48vw","borderRadius":"50%","background":"radial-gradient(closest-side, rgba(var(--ml-glow2, 170,180,200),0.16), rgba(var(--ml-glow2, 170,180,200),0) 100%)","filter":"blur(30px)","pointerEvents":"none"}} />
      {"\n  "}
      <canvas data-dc-tpl="10" ref={v.meshRef} style={{"position":"absolute","left":"0","right":"0","bottom":"0","width":"100%","height":"62vh","pointerEvents":"none","display":"block"}} />
      {"\n  "}
      <div data-dc-tpl="11" style={{"position":"absolute","left":"18%","top":"22%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 10px 3px rgba(255,255,255,0.55)"}} />
      {"\n  "}
      <div data-dc-tpl="12" style={{"position":"absolute","left":"74%","top":"16%","width":"4px","height":"4px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 14px 4px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div data-dc-tpl="13" style={{"position":"absolute","left":"60%","top":"44%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 8px 2px rgba(255,255,255,0.5)"}} />
      {"\n  "}
      <div data-dc-tpl="14" style={{"position":"absolute","left":"9%","top":"58%","width":"2px","height":"2px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 8px 2px rgba(255,255,255,0.45)"}} />
      {"\n  "}
      <div data-dc-tpl="15" style={{"position":"absolute","left":"88%","top":"66%","width":"3px","height":"3px","borderRadius":"50%","background":"#fff","opacity":"var(--ml-star, 1)","transition":"opacity .3s","boxShadow":"0 0 10px 3px rgba(255,255,255,0.5)"}} />
      {"\n\n  "}
      <div data-dc-tpl="16" data-no-i18n="1" role="group" aria-label="Språk / Language" style={{"position":"fixed","top":"calc(16px + env(safe-area-inset-top))","right":"18px","zIndex":"60","display":"flex","gap":"2px","padding":"3px","border":"1px solid var(--ml-line-soft, rgba(255,255,255,0.1))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)"}}>
        {"\n    "}
        <button data-dc-tpl="17" onClick={v.setNo} aria-pressed={v.isNo} title="Norsk" style={css(`height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:${v.noBg ?? ""}; color:${v.noFg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;`, "height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:{{ noBg }}; color:{{ noFg }}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;")} className="scp0">
          NO
        </button>
        {"\n    "}
        <button data-dc-tpl="18" onClick={v.setEn} aria-pressed={v.isEn} title="English" style={css(`height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:${v.enBg ?? ""}; color:${v.enFg ?? ""}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;`, "height:24px; min-width:32px; padding:0 9px; border:0; border-radius:999px; background:{{ enBg }}; color:{{ enFg }}; font:inherit; font-size:10.5px; font-weight:600; letter-spacing:0.16em; cursor:pointer;")} className="scp0">
          EN
        </button>
        {"\n  "}
      </div>
      {"\n  "}
      <main data-dc-tpl="19" style={{"position":"relative","flex":"1","width":"100%","maxWidth":"1040px","margin":"0 auto","padding":"14vh 28px 64px","display":"flex","flexDirection":"column","alignItems":"center","gap":"56px"}}>
        {"\n    "}
        <h1 data-dc-tpl="20" style={{"margin":"0","textAlign":"center","fontSize":"clamp(40px, 8.5vw, 104px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
          Media Lab
        </h1>
        {"\n\n    "}
        {v.atHome ? <>
          {"\n    "}
          <div data-dc-tpl="22" style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
            {"\n      "}
            <a data-dc-tpl="23" href="/loopstudio" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
              {"\n        "}
              <div data-dc-tpl="24" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                Video
              </div>
              {"\n        "}
              <div data-dc-tpl="25" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Loop Studio
              </div>
              {"\n        "}
              <div data-dc-tpl="26" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Lag en loopende video av ukens program med bilder, musikk og effekter.
              </div>
              {"\n        "}
              <div data-dc-tpl="27" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                <span data-dc-tpl="28" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
              </div>
              {"\n      "}
            </a>
            {"\n\n      "}
            <a data-dc-tpl="29" href="/thumbnailstudio" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
              {"\n        "}
              <div data-dc-tpl="30" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                Bilde
              </div>
              {"\n        "}
              <div data-dc-tpl="31" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Thumbnail Studio
              </div>
              {"\n        "}
              <div data-dc-tpl="32" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Lag miniatyrbilder i 16:9 til YouTube og appen fra faste maler. Last ned i 1080p eller 4K.
              </div>
              {"\n        "}
              <div data-dc-tpl="33" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                <span data-dc-tpl="34" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
              </div>
              {"\n      "}
            </a>
            {"\n\n      "}
            <button data-dc-tpl="35" onClick={v.openSome} style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
              {"\n        "}
              <div data-dc-tpl="36" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","color":"var(--ml-label, #9d998f)"}}>
                <div data-dc-tpl="37" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Sosiale medier
                </div>
                <svg data-dc-tpl="38" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path data-dc-tpl="39" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
              </div>
              {"\n        "}
              <div data-dc-tpl="40" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"none","fontStretch":"118%"}}>
                SoMe
              </div>
              {"\n        "}
              <div data-dc-tpl="41" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Redigeringsprogram for video og bilde til promo, Instagram og Facebook.
              </div>
              {"\n        "}
              <div data-dc-tpl="42" style={{"marginTop":"auto","paddingTop":"12px","display":"flex","alignItems":"center","gap":"14px"}}>
                <span data-dc-tpl="43" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
                <span data-dc-tpl="44" style={{"fontSize":"12.5px","color":"var(--ml-dim, #8a867e)"}}>
                  2 verktøy
                </span>
              </div>
              {"\n      "}
            </button>
            {"\n\n      "}
            <button data-dc-tpl="45" onClick={v.openTools} style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
              {"\n        "}
              <div data-dc-tpl="46" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","color":"var(--ml-label, #9d998f)"}}>
                <div data-dc-tpl="47" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Mappe
                </div>
                <svg data-dc-tpl="48" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path data-dc-tpl="49" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
              </div>
              {"\n        "}
              <div data-dc-tpl="50" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                Tools
              </div>
              {"\n        "}
              <div data-dc-tpl="51" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                Mindre verktøy for bilder: isoler motiv og legg bilder inn i ekte skjermer.
              </div>
              {"\n        "}
              <div data-dc-tpl="52" style={{"marginTop":"auto","paddingTop":"12px","display":"flex","alignItems":"center","gap":"14px"}}>
                <span data-dc-tpl="53" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                  Åpne
                </span>
                <span data-dc-tpl="54" style={{"fontSize":"12.5px","color":"var(--ml-dim, #8a867e)"}}>
                  2 verktøy
                </span>
              </div>
              {"\n      "}
            </button>
            {"\n\n    "}
          </div>
          <FolderLinks />
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.atSome ? <>
          {"\n    "}
          <div data-dc-tpl="56" style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
            {"\n      "}
            <div data-dc-tpl="57" style={{"width":"100%","maxWidth":"1000px","display":"flex","alignItems":"center","gap":"14px","flexWrap":"wrap"}}>
              {"\n        "}
              <button data-dc-tpl="58" onClick={v.closeFolder} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"36px","padding":"0 16px 0 12px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                <svg data-dc-tpl="59" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path data-dc-tpl="60" d="M15 5l-7 7 7 7" />
                </svg>
                Tilbake
              </button>
              {"\n        "}
              <div data-dc-tpl="61" style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--ml-label, #9d998f)"}}>
                <svg data-dc-tpl="62" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path data-dc-tpl="63" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
                <span data-dc-tpl="64" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"none"}}>
                  SoMe
                </span>
              </div>
              {"\n      "}
            </div>
            {"\n\n      "}
            <div data-dc-tpl="65" style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
              {"\n      "}
              <a data-dc-tpl="66" href="/motiondesign" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
                {"\n        "}
                <div data-dc-tpl="67" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Video
                </div>
                {"\n        "}
                <div data-dc-tpl="68" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Motion design
                </div>
                {"\n        "}
                <div data-dc-tpl="69" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Lag promovideoer og innhold til Instagram og Facebook med klipp, tekst, musikk og overganger.
                </div>
                {"\n        "}
                <div data-dc-tpl="70" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span data-dc-tpl="71" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
              <a data-dc-tpl="72" href="/photodesign" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp3">
                {"\n        "}
                <div data-dc-tpl="73" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div data-dc-tpl="74" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Photo design
                </div>
                {"\n        "}
                <div data-dc-tpl="75" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Rediger bilder med lag, justeringer og maler til promo, Instagram og Facebook.
                </div>
                {"\n        "}
                <div data-dc-tpl="76" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span data-dc-tpl="77" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
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
          <div data-dc-tpl="79" style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
            {"\n      "}
            <div data-dc-tpl="80" style={{"width":"100%","maxWidth":"1000px","display":"flex","alignItems":"center","gap":"14px","flexWrap":"wrap"}}>
              {"\n        "}
              <button data-dc-tpl="81" onClick={v.closeFolder} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"36px","padding":"0 16px 0 12px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-fg, #f3f1ec)","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}} className="scp2">
                <svg data-dc-tpl="82" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path data-dc-tpl="83" d="M15 5l-7 7 7 7" />
                </svg>
                Tilbake
              </button>
              {"\n        "}
              <div data-dc-tpl="84" style={{"display":"flex","alignItems":"center","gap":"10px","color":"var(--ml-label, #9d998f)"}}>
                <svg data-dc-tpl="85" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                  <path data-dc-tpl="86" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
                </svg>
                <span data-dc-tpl="87" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase"}}>
                  Tools
                </span>
              </div>
              {"\n      "}
            </div>
            {"\n\n      "}
            <div data-dc-tpl="88" style={{"width":"100%","maxWidth":"1000px","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(260px, 1fr))","gap":"18px"}}>
              {"\n      "}
              <a data-dc-tpl="89" href="/isolate" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp1">
                {"\n        "}
                <div data-dc-tpl="90" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div data-dc-tpl="91" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Isolate Subject
                </div>
                {"\n        "}
                <div data-dc-tpl="92" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Isoler en person, et objekt, en logo eller tekst fra bildet med AI, rett i nettleseren. Gratis, og bildet lastes aldri opp.
                </div>
                {"\n        "}
                <div data-dc-tpl="93" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span data-dc-tpl="94" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
                    Åpne
                  </span>
                </div>
                {"\n      "}
              </a>
              {"\n\n      "}
              <a data-dc-tpl="95" href="/mockup" style={{"display":"flex","flexDirection":"column","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"22px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-fg, #f3f1ec)"}} className="scp3">
                {"\n        "}
                <div data-dc-tpl="96" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"var(--ml-label, #9d998f)"}}>
                  Bilde
                </div>
                {"\n        "}
                <div data-dc-tpl="97" style={{"fontSize":"24px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%"}}>
                  Mockups
                </div>
                {"\n        "}
                <div data-dc-tpl="98" style={{"fontSize":"14px","lineHeight":"1.6","color":"var(--ml-muted, #b3afa6)","textWrap":"pretty"}}>
                  Legg et bilde inn i skjermen på en PC, TV, nettbrett eller telefon i ekte fotografier.
                </div>
                {"\n        "}
                <div data-dc-tpl="99" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                  <span data-dc-tpl="100" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid var(--ml-fg, #f3f1ec)","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"var(--ml-fg, #f3f1ec)"}}>
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
      <footer data-dc-tpl="101" style={{"position":"relative","flexShrink":"0","marginTop":"auto","height":"56px","paddingBottom":"env(safe-area-inset-bottom)","display":"flex","alignItems":"center","justifyContent":"center"}}>
        {"\n  "}
        <button data-dc-tpl="102" data-ch-dock-reserve="1" onClick={v.toggleTheme} title={v.themeTitle} aria-label={v.themeTitle} style={{"position":"fixed","right":"12px","bottom":"calc(12px + env(safe-area-inset-bottom))","zIndex":"60","width":"32px","height":"32px","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid var(--ml-line-soft, rgba(255,255,255,0.1))","borderRadius":"999px","background":"var(--ml-chip, rgba(0,0,0,0.3))","backdropFilter":"blur(10px)","color":"var(--ml-dim, #8a867e)","cursor":"pointer"}} className="scp4">
          {"\n    "}
          <svg data-dc-tpl="103" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle data-dc-tpl="104" cx="12" cy="12" r="9" />
            <path data-dc-tpl="105" d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
          </svg>
          {"\n  "}
        </button>
        {"\n    "}
        <span data-dc-tpl="106" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"var(--ml-muted, #b3afa6)"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
      {"\n  "}
      {canAdmin(window.CH && window.CH.me) && <a data-dc-tpl="107" href="/admin" title="Admin" aria-label="Admin" style={{"position":"fixed","left":"18px","bottom":"calc(18px + env(safe-area-inset-bottom))","zIndex":"60","width":"40px","height":"40px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid var(--ml-line, rgba(255,255,255,0.16))","borderRadius":"999px","background":"var(--ml-card, rgba(12,12,12,0.55))","backdropFilter":"blur(14px)","color":"var(--ml-muted, #b3afa6)"}} className="scp5">
        <svg data-dc-tpl="108" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path data-dc-tpl="109" d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
          <circle data-dc-tpl="110" cx="12" cy="10.5" r="2.3" />
          <path data-dc-tpl="111" d="M8.4 16.2c.8-1.6 2.1-2.4 3.6-2.4s2.8.8 3.6 2.4" />
        </svg>
      </a>}
    </div>
    </>
  );
}
