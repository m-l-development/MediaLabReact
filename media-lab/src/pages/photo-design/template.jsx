/* Konvertert fra den gamle dc-siden photo-design.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { I, css, val, list } from '../../shared/dc.jsx';
import LayerName from '../../shared/layer-name.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"21":["\n      ","←","SoMe","\n    "],"22":["←","SoMe"],"23":["←"],"24":["SoMe"],"27":["Photo design"],"28":["Lag bilder for sosiale medier og trykk. Velg format og mal, og juster farger, tekst og motiv."],"30":["1 · Format"],"33":["\n              ","\n              ","{{ f.l }}","{{ f.dim }}","\n            "],"35":["{{ f.l }}","{{ f.dim }}"],"36":["{{ f.l }}"],"37":["{{ f.dim }}"],"41":["Bredde"],"44":["Høyde"],"46":["piksler"],"48":["2 · Mal"],"54":["{{ t.l }}"],"57":["Egne maler"],"60":["{{ c.l }}"],"61":["{{ c.l }}"],"62":["+ Ny kategori"],"64":["Ingen maler i denne kategorien ennå. Åpne et prosjekt og trykk «Lagre som mal» under Stil."],"69":["{{ p.name }}","{{ p.meta }}"],"70":["{{ p.name }}"],"71":["{{ p.meta }}"],"72":["×"],"75":["Mine prosjekter"],"80":["{{ p.name }}","{{ p.meta }}"],"81":["{{ p.name }}"],"82":["{{ p.meta }}"],"83":["×"],"85":["Sikkerhetskopi"],"86":["Last ned sikkerhetskopi"],"87":["Gjenopprett fra fil"],"92":["←","Prosjekter"],"93":["←"],"94":["Prosjekter"],"97":["↶"],"98":["↷"],"100":["−"],"101":["{{ zoomLabel }}"],"102":["{{ zoomLabel }}"],"103":["+"],"107":["{{ o.l }}"],"109":["{{ saved }}"],"111":["Lagre"],"112":["Autolagring"],"113":[],"115":["Autolagring"],"116":["Eksporter"],"121":["{{ f.l }}"],"123":["{{ pdfNote }}"],"124":["Fil klar for trykkeriet. Utfallende slås av og på under Dokument."],"128":["{{ f.l }}"],"129":["{{ f.l }}"],"131":["Gjennomsiktig bakgrunn"],"132":["Gjennomsiktig bakgrunn"],"133":[],"135":["{{ dlLabel }}"],"137":["Kopier bilde"],"138":["Send til …"],"144":["{{ t.l }}"],"146":["Legg til"],"149":["{{ b.l }}"],"153":["Ingen bilder i biblioteket."],"163":["Farge på nye elementer"],"165":["Auto"],"169":["{{ t.l }}"],"170":["{{ t.l }}"],"171":[],"173":["Når koblede farger er på, endres alle lag med samme farge samtidig."],"175":["Bakgrunn og vignett"],"177":["\n                ","\n                  ","\n                  ","Bakgrunnsfarge","\n                  ","{{ fillSummary }}","\n                ","\n                ","{{ fillArrow }}","\n              "],"178":["\n                  ","\n                  ","Bakgrunnsfarge","\n                  ","{{ fillSummary }}","\n                "],"180":["Bakgrunnsfarge"],"181":["{{ fillSummary }}"],"182":["{{ fillArrow }}"],"184":["Type"],"187":["{{ m.label }}"],"194":["Trykk på fargen for å endre den"],"195":[],"196":[],"203":["Gradientfarger"],"207":["▲"],"208":["▼"],"213":["{{ q.pct }}%"],"215":["×"],"217":["Mengde"],"219":["{{ q.wPct }}%"],"223":["Skarp kant til neste"],"226":["+ Legg til farge"],"227":[],"228":[],"233":["⇄ Snu"],"234":["Fordel jevnt"],"237":["Retning","{{ fillAngle }}°"],"238":["Retning"],"239":["{{ fillAngle }}°"],"244":["Overgang"],"246":["{{ fillSoft }} %"],"247":["Standard"],"249":["Skarp kant","Myk, diffus"],"250":["Skarp kant"],"251":["Myk, diffus"],"254":["Skarphet"],"256":["{{ fillSharp }} %"],"257":["0 %"],"259":["Myke overganger","Skarpe kanter"],"260":["Myke overganger"],"261":["Skarpe kanter"],"264":["Antall gjentakelser","{{ fillRep }}"],"265":["Antall gjentakelser"],"266":["{{ fillRep }}"],"269":["{{ fillNote }}"],"271":["Midtstill"],"273":["{{ t.l }}"],"274":["{{ t.l }}"],"275":[],"279":["Vignettfarge"],"283":["{{ f.label }}","{{ f.show }}"],"284":["{{ f.label }}"],"285":["{{ f.show }}"],"288":["Maler"],"293":["+"],"294":["Lagre som mal"],"295":["Maks 5 maler per kategori. Malene finner du på startsiden."],"297":["Sikkerhetskopi"],"299":["Last ned"],"300":["Gjenopprett"],"304":["Avansert modus"],"305":["Avansert modus"],"306":[],"309":["Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon."],"314":["{{ c.l }}"],"322":["{{ c.l }}"],"323":["{{ c.l }}"],"324":["{{ fxCount }}"],"326":["Ingen effekter her ennå."],"333":["★"],"334":["{{ it.name }}"],"336":["Vis flere"],"338":["Importer"],"339":["Eksporter egne"],"341":["Hver effekt blir et eget lag som kan flyttes, skaleres og endres senere. Høyreklikk på egne forhåndsvalg for å slette, dobbeltklikk for å gi nytt navn. Bakgrunn, retusj og fargegradering finner du under Motiv og Farge på et bildelag."],"343":["\n              ","Lag","\n              ","{{ layerCount }}","\n            "],"344":["Lag"],"345":["{{ layerCount }}"],"348":["Ingen lag ennå. Legg til et bilde, en tekst eller en form."],"351":["{{ l.icon }}"],"352":["{{ l.name }}"],"353":["◉"],"358":["×"],"374":["✦"],"376":["×"],"380":["Slipp bildet her"],"382":["{{ busyLabel }}","{{ pctLabel }}"],"383":["{{ busyLabel }}"],"384":["{{ pctLabel }}"],"388":["Dokument"],"390":["Format"],"394":["{{ docDim }}"],"395":["Bakgrunn"],"401":["CMYK"],"404":["{{ k.l }}"],"406":["Gjennomsiktig bakgrunn"],"407":["Gjennomsiktig bakgrunn"],"408":[],"411":["Trykk"],"412":["{{ printMm }} · 300 dpi"],"413":["Utfallende 3 mm (bleed)"],"414":["Utfallende 3 mm (bleed)"],"415":[],"417":["{{ bleedNote }}"],"421":["{{ o.l }}"],"422":["{{ backLabel }}"],"423":["Klikk på et lag i bildet for å redigere det. Dra bilder inn i vinduet, eller lim inn med Ctrl/Cmd + V. Dra et bilde oppå en bildeplass for å bytte det."],"429":["{{ t.l }}"],"434":["{{ b.l }}"],"436":["Dra i bildet for å flytte utsnittet. Dra i kantene for å beskjære rammen."],"438":["{{ t.l }}"],"439":["{{ t.l }}"],"440":[],"458":["{{ t.l }}"],"464":["CMYK"],"467":["{{ k.l }}"],"469":["Store bokstaver"],"470":["Store bokstaver"],"471":[],"474":["Konturfarge"],"477":["{{ t.l }}"],"478":["{{ t.l }}"],"479":[],"483":["Understrekfarge"],"487":["{{ f.label }}","{{ f.show }}"],"488":["{{ f.label }}"],"489":["{{ f.show }}"],"494":["{{ t.l }}"],"500":["CMYK"],"503":["{{ k.l }}"],"506":["{{ t.l }}"],"507":["{{ t.l }}"],"508":[],"512":["Toning til"],"515":["Konturfarge"],"524":["Slå på Avansert modus for å redigere effekten. Den vises og eksporteres som før."],"526":["{{ fxKindName }}"],"531":["{{ t.l }}"],"533":["{{ t.l }}"],"540":["{{ f.label }}"],"546":["{{ f.label }}","{{ f.show }}"],"547":["{{ f.label }}"],"548":["{{ f.show }}"],"552":["{{ b.l }}"],"556":["{{ f.label }}","{{ f.show }}"],"557":["{{ f.label }}"],"558":["{{ f.show }}"],"561":["Blandingsmodus"],"567":["{{ b.l }}"],"569":["Looks"],"572":["{{ k.l }}"],"574":["Justering"],"575":["Nullstill"],"578":["{{ f.label }}","{{ f.show }}"],"579":["{{ f.label }}"],"580":["{{ f.show }}"],"583":["Kurve"],"584":["Nullstill"],"591":["Klikk for å legge til punkt. Dra for å flytte. Dobbeltklikk på et punkt fjerner det."],"593":["Klipp ut motiv med AI"],"595":["Person"],"596":["Objekt"],"597":["Kjører i nettleseren. Første gang lastes modellen ned (MODNet for personer, BiRefNet for objekter)."],"598":["Pensel på masken"],"599":["{{ brushLabel }}"],"602":["{{ t.l }}"],"605":["{{ f.label }}","{{ f.show }}"],"606":["{{ f.label }}"],"607":["{{ f.show }}"],"609":["Hold Alt for å bytte mellom fjern og gjenopprett."],"611":["Inverter"],"612":["Fjern maske"],"614":["{{ toast }}"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="18" onDragOver={v.onDragOver} onDragLeave={v.onDragLeave} onDrop={v.onDrop} style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"13px"}}>
      {"\n  "}
      <input data-dc-tpl="19" ref={v.fileRef} type="file" multiple={true} accept="image/png,image/jpeg,image/webp,image/gif" onChange={v.onFile} style={{"display":"none"}} />
      {"\n\n  "}
      {v.isHome ? <>
        {"\n    "}
        <div data-dc-tpl="21" data-ml-bar="1" style={{"position":"sticky","top":"0","zIndex":"50","padding":"28px 28px 10px","display":"flex"}}>
          {"\n      "}
          <a data-dc-tpl="22" href={v.backHref} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span data-dc-tpl="23" style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span data-dc-tpl="24">
              SoMe
            </span>
          </a>
          {"\n    "}
        </div>
        {"\n    "}
        <main data-dc-tpl="25" style={{"flex":"1","width":"100%","maxWidth":"1200px","margin":"0 auto","padding":"5vh 28px 72px","display":"flex","flexDirection":"column","gap":"36px"}}>
          {"\n      "}
          <div data-dc-tpl="26" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"16px","textAlign":"center"}}>
            {"\n        "}
            <h1 data-dc-tpl="27" data-ml-title="1" style={{"margin":"0","fontSize":"clamp(34px, 7vw, 88px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
              Photo design
            </h1>
            {"\n        "}
            <p data-dc-tpl="28" style={{"margin":"0","maxWidth":"560px","fontSize":"15px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
              Lag bilder for sosiale medier og trykk. Velg format og mal, og juster farger, tekst og motiv.
            </p>
            {"\n      "}
          </div>
          {"\n      "}
          <section data-dc-tpl="29" style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <span data-dc-tpl="30" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              1 · Format
            </span>
            {"\n        "}
            <div data-dc-tpl="31" style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
              {"\n          "}
              {list(v.formats).map(($it1, $i1) => {
                const v1 = { ...v, "f": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="33" onClick={v1.f?.click} style={css(`display:flex; align-items:center; gap:10px; height:48px; padding:0 16px 0 12px; border:1px solid ${v1.f?.border ?? ""}; border-radius:14px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "display:flex; align-items:center; gap:10px; height:48px; padding:0 16px 0 12px; border:1px solid {{ f.border }}; border-radius:14px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                    {"\n              "}
                    <span data-dc-tpl="34" style={css(`width:${v1.f?.iw ?? ""}; height:${v1.f?.ih ?? ""}; border:1.5px solid currentColor; border-radius:3px; opacity:0.8;`, "width:{{ f.iw }}; height:{{ f.ih }}; border:1.5px solid currentColor; border-radius:3px; opacity:0.8;")} />
                    {"\n              "}
                    <span data-dc-tpl="35" style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"1px"}}>
                      <span data-dc-tpl="36">
                        {I(v1.f?.l)}
                      </span>
                      <span data-dc-tpl="37" data-no-i18n="1" style={{"fontSize":"11px","fontWeight":"500","opacity":"0.65"}}>
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
              <div data-dc-tpl="39" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px"}}>
                {"\n            "}
                <label data-dc-tpl="40" style={{"display":"flex","alignItems":"center","gap":"8px","color":"#9d998f"}}>
                  <span data-dc-tpl="41">
                    Bredde
                  </span>
                  <input data-dc-tpl="42" type="number" min="64" max="8000" value={val(v.cw)} onChange={v.onCw} style={{"width":"96px","height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}} />
                </label>
                {"\n            "}
                <label data-dc-tpl="43" style={{"display":"flex","alignItems":"center","gap":"8px","color":"#9d998f"}}>
                  <span data-dc-tpl="44">
                    Høyde
                  </span>
                  <input data-dc-tpl="45" type="number" min="64" max="8000" value={val(v.ch)} onChange={v.onCh} style={{"width":"96px","height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec"}} />
                </label>
                {"\n            "}
                <span data-dc-tpl="46" style={{"color":"#6f6b64"}}>
                  piksler
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </section>
          {"\n      "}
          <section data-dc-tpl="47" style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <span data-dc-tpl="48" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              2 · Mal
            </span>
            {"\n        "}
            <div data-dc-tpl="49" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px","alignItems":"start"}}>
              {"\n          "}
              {list(v.tpls).map(($it1, $i1) => {
                const v1 = { ...v, "t": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="51" onClick={v1.t?.click} style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)","backdropFilter":"blur(12px)","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp1">
                    {"\n              "}
                    <div data-dc-tpl="52" style={{"display":"flex","alignItems":"center","justifyContent":"center","height":"180px","borderRadius":"10px","background":"#141414","overflow":"hidden"}}>
                      <canvas data-dc-tpl="53" ref={v1.t?.ref} width="10" height="10" style={{"maxWidth":"100%","maxHeight":"100%","boxShadow":"0 6px 20px rgba(0,0,0,0.5)"}} />
                    </div>
                    {"\n              "}
                    <span data-dc-tpl="54" style={{"padding":"0 4px 2px","fontSize":"13.5px","fontWeight":"600"}}>
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
          <section data-dc-tpl="55" style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
            {"\n        "}
            <div data-dc-tpl="56" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
              {"\n          "}
              <span data-dc-tpl="57" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Egne maler
              </span>
              {"\n          "}
              <div data-dc-tpl="58" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                {"\n            "}
                {list(v.tplCatChips).map(($it1, $i1) => {
                  const v1 = { ...v, "c": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button data-dc-tpl="60" onClick={v1.c?.click} style={css(`height:30px; padding:0 12px; border:1px solid ${v1.c?.border ?? ""}; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:30px; padding:0 12px; border:1px solid {{ c.border }}; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                      <span data-dc-tpl="61" data-no-i18n={v1.c?.noI}>
                        {I(v1.c?.l)}
                      </span>
                    </button>
                  </React.Fragment>;
                })}
                {"\n            "}
                <button data-dc-tpl="62" onClick={v.newCat} style={{"height":"30px","padding":"0 12px","border":"1px dashed #3a3a3a","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                  + Ny kategori
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            {v.noMyTpls ? <>
              <span data-dc-tpl="64" style={{"fontSize":"13px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                Ingen maler i denne kategorien ennå. Åpne et prosjekt og trykk «Lagre som mal» under Stil.
              </span>
            </> : null}
            {"\n        "}
            <div data-dc-tpl="65" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px"}}>
              {"\n            "}
              {list(v.myTpls).map(($it1, $i1) => {
                const v1 = { ...v, "p": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n              "}
                  <div data-dc-tpl="67" style={{"position":"relative","display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)"}}>
                    {"\n                "}
                    <button data-dc-tpl="68" onClick={v1.p?.open} style={css(`height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:${v1.p?.thumb ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:{{ p.thumb }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} aria-label={v1.p?.name} />
                    {"\n                "}
                    <div data-dc-tpl="69" style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 4px 2px"}}>
                      <span data-dc-tpl="70" data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v1.p?.name)}
                      </span>
                      <span data-dc-tpl="71" data-no-i18n="1" style={{"fontSize":"11px","color":"#8a867e"}}>
                        {I(v1.p?.meta)}
                      </span>
                    </div>
                    {"\n                "}
                    <button data-dc-tpl="72" onClick={v1.p?.del} title="Slett mal" aria-label="Slett mal" style={{"position":"absolute","top":"16px","right":"16px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.72)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp3">
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
            <section data-dc-tpl="74" style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
              {"\n          "}
              <span data-dc-tpl="75" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                Mine prosjekter
              </span>
              {"\n          "}
              <div data-dc-tpl="76" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(180px, 1fr))","gap":"14px"}}>
                {"\n            "}
                {list(v.projects).map(($it1, $i1) => {
                  const v1 = { ...v, "p": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="78" style={{"position":"relative","display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid rgba(255,255,255,0.12)","borderRadius":"16px","background":"rgba(12,12,12,0.6)"}}>
                      {"\n                "}
                      <button data-dc-tpl="79" onClick={v1.p?.open} style={css(`height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:${v1.p?.thumb ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "height:150px; padding:0; border:0; border-radius:10px; background-color:#141414; background-image:{{ p.thumb }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} aria-label={v1.p?.name} />
                      {"\n                "}
                      <div data-dc-tpl="80" style={{"display":"flex","flexDirection":"column","gap":"2px","padding":"0 4px 2px"}}>
                        <span data-dc-tpl="81" data-no-i18n="1" style={{"fontSize":"13px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.p?.name)}
                        </span>
                        <span data-dc-tpl="82" data-no-i18n="1" style={{"fontSize":"11px","color":"#8a867e"}}>
                          {I(v1.p?.meta)}
                        </span>
                      </div>
                      {"\n                "}
                      <button data-dc-tpl="83" onClick={v1.p?.del} title="Slett prosjekt" aria-label="Slett prosjekt" style={{"position":"absolute","top":"16px","right":"16px","width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"rgba(0,0,0,0.72)","color":"#f3f1ec","font":"inherit","fontSize":"14px","cursor":"pointer"}} className="scp3">
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
          <section data-dc-tpl="84" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","paddingTop":"18px","borderTop":"1px solid rgba(255,255,255,0.08)"}}>
            {"\n        "}
            <span data-dc-tpl="85" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              Sikkerhetskopi
            </span>
            {"\n        "}
            <button data-dc-tpl="86" onClick={v.backupDl} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Last ned sikkerhetskopi
            </button>
            {"\n        "}
            <button data-dc-tpl="87" onClick={v.backupPick} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              Gjenopprett fra fil
            </button>
            {"\n        "}
            <input data-dc-tpl="88" ref={v.bkFileRef} type="file" accept=".json,application/json" onChange={v.onBackupFile} style={{"display":"none"}} />
            {"\n      "}
          </section>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isEdit ? <>
        {"\n    "}
        <div data-dc-tpl="90" data-ml-bg="static" style={{"flex":"1","height":"100dvh","minHeight":v.rootMinH,"maxHeight":v.rootMaxH,"display":"flex","flexDirection":"column","overflow":"clip"}}>
          {"\n      "}
          <header data-dc-tpl="91" style={{"position":"sticky","top":"0","zIndex":"40","display":"flex","alignItems":"center","gap":"8px","padding":"10px 14px","borderBottom":"1px solid #1c1c1c","background":"#0b0b0b","flexWrap":"wrap"}}>
            {"\n        "}
            <button data-dc-tpl="92" onClick={v.leave} style={{"display":"inline-flex","alignItems":"center","gap":"6px","height":"34px","padding":"0 14px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
              <span data-dc-tpl="93" style={{"fontSize":"15px"}}>
                ←
              </span>
              <span data-dc-tpl="94">
                Prosjekter
              </span>
            </button>
            {"\n        "}
            <input data-dc-tpl="95" value={val(v.docName)} onChange={v.onDocName} data-no-i18n="1" aria-label="Prosjektnavn" style={{"width":"180px","height":"34px","padding":"0 12px","border":"1px solid transparent","borderRadius":"10px","background":"transparent","color":"#f3f1ec","fontWeight":"600"}} className="scp5 scp6" />
            {"\n        "}
            <div data-dc-tpl="96" style={{"display":"flex","gap":"4px"}}>
              {"\n          "}
              <button data-dc-tpl="97" onClick={v.undo} disabled={v.noUndo} title="Angre (Ctrl+Z)" aria-label="Angre" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:${v.undoOp ?? ""};`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:{{ undoOp }};")}>
                ↶
              </button>
              {"\n          "}
              <button data-dc-tpl="98" onClick={v.redo} disabled={v.noRedo} title="Gjør om (Ctrl+Shift+Z)" aria-label="Gjør om" style={css(`width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:${v.redoOp ?? ""};`, "width:34px; height:34px; border:1px solid #2b2b2b; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:15px; cursor:pointer; opacity:{{ redoOp }};")}>
                ↷
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="99" style={{"display":"flex","alignItems":"center","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
              {"\n          "}
              <button data-dc-tpl="100" onClick={v.zoomOut} aria-label="Zoom ut" style={{"width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                −
              </button>
              {"\n          "}
              <button data-dc-tpl="101" onClick={v.zoomFit} title="Tilpass til vinduet" style={{"minWidth":"52px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                <span data-dc-tpl="102" data-no-i18n="1">
                  {I(v.zoomLabel)}
                </span>
              </button>
              {"\n          "}
              <button data-dc-tpl="103" onClick={v.zoomIn} aria-label="Zoom inn" style={{"width":"28px","height":"28px","border":"0","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp7">
                +
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            {v.hasBack ? <>
              {"\n          "}
              <div data-dc-tpl="105" style={{"display":"flex","gap":"2px","padding":"2px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {list(v.sideOpts).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button data-dc-tpl="107" onClick={v1.o?.click} style={css(`height:28px; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:28px; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                      {I(v1.o?.l)}
                    </button>
                  </React.Fragment>;
                })}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            <span data-dc-tpl="108" style={{"flex":"1"}} />
            {"\n        "}
            <span data-dc-tpl="109" style={css(`font-size:12px; color:${v.savedCol ?? ""}; white-space:nowrap;`, "font-size:12px; color:{{ savedCol }}; white-space:nowrap;")}>
              {I(v.saved)}
            </span>
            {"\n        "}
            {v.showSaveBtn ? <>
              <button data-dc-tpl="111" onClick={v.saveNow} title="Lagre i nettleseren (Ctrl+S)" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp8">
                Lagre
              </button>
            </> : null}
            {"\n        "}
            <button data-dc-tpl="112" onClick={v.toggleAutosave} role="switch" aria-checked={v.autosave} title="Lagre endringer automatisk i nettleseren" style={{"display":"flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 12px 0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap"}}>
              <span data-dc-tpl="113" style={css(`position:relative; width:26px; height:15px; border-radius:999px; background:${v.asTrack ?? ""};`, "position:relative; width:26px; height:15px; border-radius:999px; background:{{ asTrack }};")}>
                <span data-dc-tpl="114" style={css(`position:absolute; top:2px; left:${v.asKnob ?? ""}; width:11px; height:11px; border-radius:50%; background:${v.asKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ asKnob }}; width:11px; height:11px; border-radius:50%; background:{{ asKnobBg }}; transition:left .16s ease;")} />
              </span>
              <span data-dc-tpl="115">
                Autolagring
              </span>
            </button>
            {"\n        "}
            <button data-dc-tpl="116" onClick={v.toggleExp} style={{"height":"34px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scp9">
              Eksporter
            </button>
            {"\n        "}
            {v.expOpen ? <>
              {"\n          "}
              <div data-dc-tpl="118" style={{"position":"absolute","top":"calc(100% + 8px)","right":"14px","zIndex":"40","width":"300px","display":"flex","flexDirection":"column","gap":"12px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0e0e0e","boxShadow":"0 20px 60px rgba(0,0,0,0.6)"}}>
                {"\n            "}
                <div data-dc-tpl="119" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {list(v.expFmts).map(($it1, $i1) => {
                    const v1 = { ...v, "f": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="121" onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.f?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.isPdf ? <>
                  <span data-dc-tpl="123" style={{"fontSize":"12px","lineHeight":"1.5","color":"#c9c5bc"}}>
                    {I(v.pdfNote)}
                  </span>
                  <span data-dc-tpl="124" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                    Fil klar for trykkeriet. Utfallende slås av og på under Dokument.
                  </span>
                </> : null}
                {"\n            "}
                {v.notPdf ? <>
                  <div data-dc-tpl="126" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                    {list(v.expScales).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button data-dc-tpl="128" onClick={v1.f?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ f.bg }}; color:{{ f.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          <span data-dc-tpl="129" data-no-i18n="1">
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
                  <button data-dc-tpl="131" onClick={v.toggleTransp} role="switch" aria-checked={v.expT} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                    <span data-dc-tpl="132">
                      Gjennomsiktig bakgrunn
                    </span>
                    <span data-dc-tpl="133" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.tTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ tTrack }};")}>
                      <span data-dc-tpl="134" style={css(`position:absolute; top:2px; left:${v.tKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.tKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ tKnob }}; width:13px; height:13px; border-radius:50%; background:{{ tKnobBg }};")} />
                    </span>
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button data-dc-tpl="135" onClick={v.doDownload} style={{"height":"40px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp9">
                  {I(v.dlLabel)}
                </button>
                {"\n            "}
                <div data-dc-tpl="136" style={{"display":"flex","gap":"6px"}}>
                  {"\n              "}
                  <button data-dc-tpl="137" onClick={v.doCopy} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                    Kopier bilde
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="138" onClick={v.doSend} style={{"flex":"1","height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
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
          <div data-dc-tpl="139" style={css(`flex:1; min-height:0; display:grid; grid-template-columns:${v.cols ?? ""}; grid-template-rows:${v.rows ?? ""};`, "flex:1; min-height:0; display:grid; grid-template-columns:{{ cols }}; grid-template-rows:{{ rows }};")}>
            {"\n        "}
            <aside data-dc-tpl="140" style={css(`min-width:0; min-height:0; border-right:1px solid #1c1c1c; background:#0b0b0b; display:flex; flex-direction:column; overflow:hidden; order:${v.leftOrder ?? ""};`, "min-width:0; min-height:0; border-right:1px solid #1c1c1c; background:#0b0b0b; display:flex; flex-direction:column; overflow:hidden; order:{{ leftOrder }};")}>
              {"\n          "}
              <div data-dc-tpl="141" style={{"flex":"1 1 auto","minHeight":"0","overflowY":"auto","display":"flex","flexDirection":"column","gap":"12px","padding":"14px"}}>
                {"\n            "}
                <div data-dc-tpl="142" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                  {list(v.lTabs).map(($it1, $i1) => {
                    const v1 = { ...v, "t": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="144" onClick={v1.t?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                        {I(v1.t?.l)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.ltLag ? <>
                  {"\n            "}
                  <span data-dc-tpl="146" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Legg til
                  </span>
                  {"\n            "}
                  <div data-dc-tpl="147" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                    {"\n              "}
                    {list(v.addBtns).map(($it1, $i1) => {
                      const v1 = { ...v, "b": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                "}
                        <button data-dc-tpl="149" onClick={v1.b?.click} style={css(`height:36px; padding:0 10px; border:1px solid ${v1.b?.border ?? ""}; border-radius:10px; background:${v1.b?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;`, "height:36px; padding:0 10px; border:1px solid {{ b.border }}; border-radius:10px; background:{{ b.bg }}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; text-align:left; cursor:pointer;")} className="scp4">
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
                    <div data-dc-tpl="151" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #1c1c1c","borderRadius":"12px","background":"#0e0e0e"}}>
                      {"\n                "}
                      {v.libEmpty ? <>
                        <span data-dc-tpl="153" style={{"fontSize":"12px","color":"#8a867e"}}>
                          Ingen bilder i biblioteket.
                        </span>
                      </> : null}
                      {"\n                "}
                      <div data-dc-tpl="154" style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px"}}>
                        {"\n                  "}
                        {list(v.libItems).map(($it1, $i1) => {
                          const v1 = { ...v, "it": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                    "}
                            <button data-dc-tpl="156" onClick={v1.it?.click} title={v1.it?.name} style={css(`aspect-ratio:1; padding:0; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:${v1.it?.css ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "aspect-ratio:1; padding:0; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:{{ it.css }}; background-size:contain; background-repeat:no-repeat; background-position:center; cursor:pointer;")} className="scp8" />
                            {"\n                  "}
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {list(v.libCollab).map((g, gi) => <div key={'c' + gi} data-ml-collab style={{"display":"flex","flexDirection":"column","gap":"6px","marginTop":"4px","paddingTop":"8px","borderTop":"1px solid #1c1c1c"}}>
                        <span style={{"fontSize":"11px","letterSpacing":"0.04em","textTransform":"uppercase","color":"#8a867e"}}><span>Samarbeidsfiler</span><span>{g.title}</span></span>
                        <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px"}}>
                          {list(g.items).map((it, i) => <button key={i} onClick={it.click} title={it.name} aria-label={it.name} style={{"aspectRatio":"1","padding":"0","border":"1px solid #232323","borderRadius":"8px","backgroundColor":"#1a1a1a","backgroundImage":it.css,"backgroundSize":"contain","backgroundRepeat":"no-repeat","backgroundPosition":"center","cursor":"pointer"}} className="scp8" />)}
                        </div>
                      </div>)}
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </> : null}
                  {"\n            "}
                  {v.shapesOpen ? <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"6px","padding":"10px","border":"1px solid #1c1c1c","borderRadius":"12px","background":"#0e0e0e"}}>
                    {list(v.shapeItems).map((it, i) => <button key={i} onClick={it.click} title={it.name} aria-label={it.name} style={{"aspectRatio":"1","padding":"8px","border":"1px solid #232323","borderRadius":"8px","backgroundColor":"#1a1a1a","backgroundImage":it.css,"backgroundSize":"contain","backgroundOrigin":"content-box","backgroundRepeat":"no-repeat","backgroundPosition":"center","cursor":"pointer"}} className="scp8" />)}
                  </div> : null}
                  {v.logoOpen ? <>
                    {"\n              "}
                    <div data-dc-tpl="158" style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px","padding":"10px","border":"1px solid #1c1c1c","borderRadius":"12px","background":"#0e0e0e"}}>
                      {"\n                "}
                      {list(v.logoItems).map(($it1, $i1) => {
                        const v1 = { ...v, "it": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="160" onClick={v1.it?.click} title={v1.it?.name} aria-label={v1.it?.name} style={css(`aspect-ratio:1; padding:6px; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:${v1.it?.css ?? ""}; background-size:contain; background-origin:content-box; background-repeat:no-repeat; background-position:center; cursor:pointer;`, "aspect-ratio:1; padding:6px; border:1px solid #232323; border-radius:8px; background-color:#1a1a1a; background-image:{{ it.css }}; background-size:contain; background-origin:content-box; background-repeat:no-repeat; background-position:center; cursor:pointer;")} className="scp8" />
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
                  <div data-dc-tpl="162" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    <span data-dc-tpl="163" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Farge på nye elementer
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="164" style={{"display":"flex","flexWrap":"wrap","gap":"5px","alignItems":"center"}}>
                      {"\n                  "}
                      <button data-dc-tpl="165" onClick={v.newColAuto} style={css(`height:24px; padding:0 9px; border:1px solid ${v.ncAutoB ?? ""}; border-radius:999px; background:transparent; color:#c9c5bc; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; padding:0 9px; border:1px solid {{ ncAutoB }}; border-radius:999px; background:transparent; color:#c9c5bc; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                        Auto
                      </button>
                      {"\n                  "}
                      {list(v.newColSw).map(($it1, $i1) => {
                        const v1 = { ...v, "c": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="167" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {list(v.linkTog).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button data-dc-tpl="169" onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                          <span data-dc-tpl="170">
                            {I(v1.t?.l)}
                          </span>
                          <span data-dc-tpl="171" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                            <span data-dc-tpl="172" style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                          </span>
                        </button>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <span data-dc-tpl="173" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      Når koblede farger er på, endres alle lag med samme farge samtidig.
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="174" style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span data-dc-tpl="175" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Bakgrunn og vignett
                    </span>
                    {"\n            "}
                    <div data-dc-tpl="176" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                      {"\n              "}
                      <button data-dc-tpl="177" onClick={v.fillToggleBox} aria-expanded={v.fillOpenBox} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","textAlign":"left"}}>
                        {"\n                "}
                        <span data-dc-tpl="178" style={{"display":"flex","alignItems":"center","gap":"10px","minWidth":"0"}}>
                          {"\n                  "}
                          <span data-dc-tpl="179" data-keep-color="1" style={css(`flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                          {"\n                  "}
                          <span data-dc-tpl="180" style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                            Bakgrunnsfarge
                          </span>
                          {"\n                  "}
                          <span data-dc-tpl="181" style={{"fontSize":"11.5px","color":"#9d998f","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                            {I(v.fillSummary)}
                          </span>
                          {"\n                "}
                        </span>
                        {"\n                "}
                        <span data-dc-tpl="182" style={{"flex":"0 0 auto","fontSize":"13px","color":"#9d998f"}}>
                          {I(v.fillArrow)}
                        </span>
                        {"\n              "}
                      </button>
                      {"\n              "}
                      {v.fillOpenBox ? <>
                        {"\n              "}
                        <span data-dc-tpl="184" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f","paddingTop":"4px"}}>
                          Type
                        </span>
                        {"\n              "}
                        <div data-dc-tpl="185" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(92px, 1fr))","gap":"5px"}}>
                          {"\n                "}
                          {list(v.fillModes).map(($it1, $i1) => {
                            const v1 = { ...v, "m": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              {"\n                  "}
                              <button data-dc-tpl="187" onClick={v1.m?.onClick} style={css(`height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.m?.bg ?? ""}; color:${v1.m?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:{{ m.bg }}; color:{{ m.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
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
                          <div data-dc-tpl="189" data-keep-color="1" style={css(`height:44px; border-radius:8px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "height:44px; border-radius:8px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                          {"\n                "}
                          {v.fillSolidOnly ? <>
                            {"\n                  "}
                            <div data-dc-tpl="191" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                              <label data-dc-tpl="192" data-keep-color="1" title="Farge" style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v.fillSolidC ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ fillSolidC }}; overflow:hidden; cursor:pointer;")}>
                                <input data-dc-tpl="193" type="color" value={val(v.fillSolidC)} onChange={v.onFillSolid} aria-label="Farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                              </label>
                              <span data-dc-tpl="194" style={{"fontSize":"12px","color":"#9d998f"}}>
                                Trykk på fargen for å endre den
                              </span>
                              <button data-dc-tpl="195" onClick={v.fillHarmonyOne} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"marginLeft":"auto","flex":"0 0 auto","width":"28px","height":"28px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpa">
                                <span data-dc-tpl="196" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                  <span data-dc-tpl="197" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                  <span data-dc-tpl="198" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                  <span data-dc-tpl="199" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                  <span data-dc-tpl="200" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                                </span>
                              </button>
                            </div>
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          {v.fillMulti ? <>
                            {"\n                  "}
                            <div data-dc-tpl="202" style={{"display":"flex","flexDirection":"column","gap":"6px","paddingTop":"10px","borderTop":"1px solid #262626"}}>
                              {"\n                    "}
                              <span data-dc-tpl="203" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                                Gradientfarger
                              </span>
                              {"\n                    "}
                              {list(v.fillStopsList).map(($it1, $i1) => {
                                const v1 = { ...v, "q": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  {"\n                      "}
                                  <div data-dc-tpl="205" style={{"display":"grid","gridTemplateColumns":"22px 30px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px"}}>
                                    {"\n                        "}
                                    <div data-dc-tpl="206" style={{"display":"flex","flexDirection":"column","gap":"1px"}}>
                                      {"\n                          "}
                                      <button data-dc-tpl="207" onClick={v1.q?.up} title="Flytt opp i rekkefølgen" aria-label="Flytt fargen opp" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.upOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.upOp }};")}>
                                        ▲
                                      </button>
                                      {"\n                          "}
                                      <button data-dc-tpl="208" onClick={v1.q?.down} title="Flytt ned i rekkefølgen" aria-label="Flytt fargen ned" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.downOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.downOp }};")}>
                                        ▼
                                      </button>
                                      {"\n                        "}
                                    </div>
                                    {"\n                        "}
                                    <label data-dc-tpl="209" data-keep-color="1" title={`Farge ${v1.q?.num ?? ""}`} style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v1.q?.c ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ q.c }}; overflow:hidden; cursor:pointer;")}>
                                      <input data-dc-tpl="210" type="color" value={val(v1.q?.c)} onChange={v1.q?.onColor} aria-label={`Farge ${v1.q?.num ?? ""}`} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                                    </label>
                                    {"\n                        "}
                                    {v1.fillPosOn ? <>
                                      <input data-dc-tpl="212" type="range" min="0" max="100" step="1" value={val(v1.q?.pct)} onChange={v1.q?.onPos} aria-label={`Posisjon for farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                    </> : null}
                                    {"\n                        "}
                                    <span data-dc-tpl="213" style={{"fontSize":"11.5px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                      {I(v1.q?.pct)}%
                                    </span>
                                    {"\n                        "}
                                    {v1.q?.canDel ? <>
                                      <button data-dc-tpl="215" onClick={v1.q?.del} title="Fjern farge" aria-label="Fjern farge" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scpb">
                                        ×
                                      </button>
                                    </> : null}
                                    {"\n                      "}
                                  </div>
                                  {"\n                      "}
                                  <div data-dc-tpl="216" style={{"display":"grid","gridTemplateColumns":"60px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px","margin":"-2px 0 6px 30px"}}>
                                    {"\n                        "}
                                    <span data-dc-tpl="217" style={{"fontSize":"11px","color":"#6f6b64"}}>
                                      Mengde
                                    </span>
                                    {"\n                        "}
                                    <input data-dc-tpl="218" type="range" min="0" max="100" step="1" value={val(v1.q?.wPct)} onChange={v1.q?.onW} aria-label={`Mengde av farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                    {"\n                        "}
                                    <span data-dc-tpl="219" style={{"fontSize":"11px","color":"#6f6b64","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                      {I(v1.q?.wPct)}%
                                    </span>
                                    {"\n                        "}
                                    <span data-dc-tpl="220" />
                                    {"\n                      "}
                                  </div>
                                  {"\n                      "}
                                  {v1.q?.notLast ? <>
                                    {"\n                        "}
                                    <div data-dc-tpl="222" style={{"display":"flex","alignItems":"center","gap":"8px","margin":"-4px 0 8px 30px"}}>
                                      {"\n                          "}
                                      <button data-dc-tpl="223" onClick={v1.q?.toggleHard} title="Skarp eller myk overgang til neste farge" style={css(`height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.q?.hardBg ?? ""}; color:${v1.q?.hardFg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:{{ q.hardBg }}; color:{{ q.hardFg }}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
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
                              <div data-dc-tpl="224" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                                {"\n                      "}
                                {v.fillCanAdd ? <>
                                  <button data-dc-tpl="226" onClick={v.fillAdd} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                    + Legg til farge
                                  </button>
                                </> : null}
                                {"\n                      "}
                                <button data-dc-tpl="227" onClick={v.fillHarmony} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"width":"30px","height":"30px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpa">
                                  <span data-dc-tpl="228" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                    <span data-dc-tpl="229" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                    <span data-dc-tpl="230" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                    <span data-dc-tpl="231" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                    <span data-dc-tpl="232" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                                  </span>
                                </button>
                                {"\n                      "}
                                <button data-dc-tpl="233" onClick={v.fillReverse} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                  ⇄ Snu
                                </button>
                                {"\n                      "}
                                <button data-dc-tpl="234" onClick={v.fillEven} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
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
                            <label data-dc-tpl="236" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span data-dc-tpl="237" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                <span data-dc-tpl="238" style={{"fontWeight":"600"}}>
                                  Retning
                                </span>
                                <span data-dc-tpl="239" style={{"fontVariantNumeric":"tabular-nums"}}>
                                  {I(v.fillAngle)}°
                                </span>
                              </span>
                              {"\n                    "}
                              <input data-dc-tpl="240" type="range" min="0" max="360" step="1" value={val(v.fillAngle)} onChange={v.onFillAngle} aria-label="Retning" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                  "}
                            </label>
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          {v.fillMulti ? <>
                            {"\n                  "}
                            <div data-dc-tpl="242" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span data-dc-tpl="243" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                                <span data-dc-tpl="244" style={{"fontWeight":"600"}}>
                                  Overgang
                                </span>
                                <span data-dc-tpl="245" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                                  <span data-dc-tpl="246" style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillSoft)}{" %"}
                                  </span>
                                  <button data-dc-tpl="247" onClick={v.fillSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                    Standard
                                  </button>
                                </span>
                              </span>
                              {"\n                    "}
                              <input data-dc-tpl="248" type="range" min="0" max="100" step="1" value={val(v.fillSoft)} onChange={v.onFillSoft} aria-label="Overgang" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                    "}
                              <span data-dc-tpl="249" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                                <span data-dc-tpl="250">
                                  Skarp kant
                                </span>
                                <span data-dc-tpl="251">
                                  Myk, diffus
                                </span>
                              </span>
                              {"\n                  "}
                            </div>
                            {"\n                  "}
                            <div data-dc-tpl="252" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                    "}
                              <span data-dc-tpl="253" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                                <span data-dc-tpl="254" style={{"fontWeight":"600"}}>
                                  Skarphet
                                </span>
                                <span data-dc-tpl="255" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                                  <span data-dc-tpl="256" style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillSharp)}{" %"}
                                  </span>
                                  <button data-dc-tpl="257" onClick={v.fillSharp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                    0 %
                                  </button>
                                </span>
                              </span>
                              {"\n                    "}
                              <input data-dc-tpl="258" type="range" min="0" max="100" step="1" value={val(v.fillSharp)} onChange={v.onFillSharp} aria-label="Skarphet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                              {"\n                    "}
                              <span data-dc-tpl="259" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                                <span data-dc-tpl="260">
                                  Myke overganger
                                </span>
                                <span data-dc-tpl="261">
                                  Skarpe kanter
                                </span>
                              </span>
                              {"\n                  "}
                            </div>
                            {"\n                  "}
                            {v.fillRepOn ? <>
                              {"\n                    "}
                              <label data-dc-tpl="263" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                                {"\n                      "}
                                <span data-dc-tpl="264" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                  <span data-dc-tpl="265" style={{"fontWeight":"600"}}>
                                    Antall gjentakelser
                                  </span>
                                  <span data-dc-tpl="266" style={{"fontVariantNumeric":"tabular-nums"}}>
                                    {I(v.fillRep)}
                                  </span>
                                </span>
                                {"\n                      "}
                                <input data-dc-tpl="267" type="range" min="1" max="20" step="1" value={val(v.fillRep)} onChange={v.onFillRep} aria-label="Antall gjentakelser" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                {"\n                    "}
                              </label>
                              {"\n                  "}
                            </> : null}
                            {"\n                "}
                          </> : null}
                          {"\n                "}
                          <div data-dc-tpl="268" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                            <span data-dc-tpl="269" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                              {I(v.fillNote)}
                            </span>
                            {v.fillMoved ? <>
                              <button data-dc-tpl="271" onClick={v.fillCenter} style={{"flex":"0 0 auto","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scpc">
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
                        <button data-dc-tpl="273" onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                          <span data-dc-tpl="274">
                            {I(v1.t?.l)}
                          </span>
                          <span data-dc-tpl="275" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                            <span data-dc-tpl="276" style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                          </span>
                        </button>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    {v.vigOn ? <>
                      <label data-dc-tpl="278" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span data-dc-tpl="279">
                          Vignettfarge
                        </span>
                        <input data-dc-tpl="280" type="color" value={val(v.vigHex)} onChange={v.onVigC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                    </> : null}
                    {"\n                "}
                    {list(v.vigRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <label data-dc-tpl="282" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                          <span data-dc-tpl="283" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="284" style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-dc-tpl="285" data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input data-dc-tpl="286" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <div data-dc-tpl="287" style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span data-dc-tpl="288" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Maler
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="289" style={{"display":"grid","gridTemplateColumns":"minmax(0, 1fr) auto","gap":"6px"}}>
                      {"\n                  "}
                      <select data-dc-tpl="290" value={val(v.tplCatV)} onChange={v.onTplCat} aria-label="Kategori" style={{"height":"32px","minWidth":"0","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                        {list(v.tplCatOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <option data-dc-tpl="292" value={val(v1.o?.v)}>
                              {I(v1.o?.l)}
                            </option>
                          </React.Fragment>;
                        })}
                      </select>
                      {"\n                  "}
                      <button data-dc-tpl="293" onClick={v.newCat} title="Ny kategori" aria-label="Ny kategori" style={{"width":"32px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp4">
                        +
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button data-dc-tpl="294" onClick={v.saveTpl} style={{"height":"34px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp9">
                      Lagre som mal
                    </button>
                    {"\n                "}
                    <span data-dc-tpl="295" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      Maks 5 maler per kategori. Malene finner du på startsiden.
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="296" style={{"height":"1px","background":"#1c1c1c"}} />
                    {"\n                "}
                    <span data-dc-tpl="297" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Sikkerhetskopi
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="298" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      <button data-dc-tpl="299" onClick={v.backupDl} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Last ned
                      </button>
                      <button data-dc-tpl="300" onClick={v.backupPick} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Gjenopprett
                      </button>
                    </div>
                    {"\n                "}
                    <input data-dc-tpl="301" ref={v.bkFileRef} type="file" accept=".json,application/json" onChange={v.onBackupFile} style={{"display":"none"}} />
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.ltFx ? <>
                  {"\n            "}
                  <div data-dc-tpl="303" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n              "}
                    <button data-dc-tpl="304" onClick={v.toggleAdv} role="switch" aria-checked={v.advOn} title="Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon." style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","cursor":"pointer"}}>
                      <span data-dc-tpl="305">
                        Avansert modus
                      </span>
                      <span data-dc-tpl="306" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.advTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ advTrack }};")}>
                        <span data-dc-tpl="307" style={css(`position:absolute; top:2px; left:${v.advKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.advKnobBg ?? ""}; transition:left .16s ease;`, "position:absolute; top:2px; left:{{ advKnob }}; width:13px; height:13px; border-radius:50%; background:{{ advKnobBg }}; transition:left .16s ease;")} />
                      </span>
                    </button>
                    {"\n              "}
                    {v.advOff ? <>
                      <span data-dc-tpl="309" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                        Lås opp avanserte kreative pensler, filmatisk lys, bildemanipulasjon og profesjonell komposisjon.
                      </span>
                    </> : null}
                    {"\n              "}
                    {v.advOn ? <>
                      {"\n                "}
                      <input data-dc-tpl="311" value={val(v.fxQ)} onChange={v.onFxQ} placeholder="Søk i effekter …" aria-label="Søk i effekter" style={{"height":"32px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"12px"}} className="scpd" />
                      {"\n                "}
                      <div data-dc-tpl="312" style={{"display":"flex","flexWrap":"wrap","gap":"4px"}}>
                        {"\n                  "}
                        {list(v.fxCats).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="314" onClick={v1.c?.click} style={css(`height:24px; padding:0 9px; border:1px solid ${v1.c?.border ?? ""}; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; padding:0 9px; border:1px solid {{ c.border }}; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                              {I(v1.c?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n                "}
                      {v.fxVar ? <>
                        {"\n                  "}
                        <div data-dc-tpl="316" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <div data-dc-tpl="317" style={{"display":"flex","flexWrap":"wrap","gap":"5px"}}>
                            {"\n                      "}
                            {list(v.fxPals).map(($it1, $i1) => {
                              const v1 = { ...v, "c": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button data-dc-tpl="319" onClick={v1.c?.click} title={v1.c?.l} aria-label={v1.c?.l} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:2px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.bg ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:2px solid {{ c.border }}; border-radius:50%; background:{{ c.bg }}; cursor:pointer;")} />
                              </React.Fragment>;
                            })}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          <div data-dc-tpl="320" style={{"display":"flex","gap":"4px"}}>
                            {"\n                      "}
                            {list(v.fxStrs).map(($it1, $i1) => {
                              const v1 = { ...v, "c": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button data-dc-tpl="322" onClick={v1.c?.click} style={css(`height:24px; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.c?.bg ?? ""}; color:${v1.c?.fg ?? ""}; font:600 11px/1 inherit; cursor:pointer;`, "height:24px; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:{{ c.bg }}; color:{{ c.fg }}; font:600 11px/1 inherit; cursor:pointer;")}>
                                  <span data-dc-tpl="323" data-no-i18n="1">
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
                      <span data-dc-tpl="324" data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
                        {I(v.fxCount)}
                      </span>
                      {"\n                "}
                      {v.fxEmpty ? <>
                        <span data-dc-tpl="326" style={{"fontSize":"12px","color":"#8a867e"}}>
                          Ingen effekter her ennå.
                        </span>
                      </> : null}
                      {"\n                "}
                      <div data-dc-tpl="327" style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"8px"}}>
                        {"\n                  "}
                        {list(v.fxItems).map(($it1, $i1) => {
                          const v1 = { ...v, "it": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                    "}
                            <div data-dc-tpl="329" style={{"position":"relative","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                              {"\n                      "}
                              <button data-dc-tpl="330" onClick={v1.it?.click} onContextMenu={v1.it?.ctx} onDoubleClick={v1.it?.dbl} title={v1.it?.name} style={{"aspectRatio":"3 / 2","padding":"0","border":"1px solid #232323","borderRadius":"8px","backgroundColor":"#10141b","overflow":"hidden","cursor":"pointer"}} className="scp8">
                                {v1.it?.src ? <>
                                  <img data-dc-tpl="332" src={v1.it?.src} alt="" style={{"display":"block","width":"100%","height":"100%","objectFit":"cover","pointerEvents":"none"}} />
                                </> : null}
                              </button>
                              {"\n                      "}
                              <button data-dc-tpl="333" onClick={v1.it?.fav} aria-label="Favoritt" title="Favoritt" style={css(`position:absolute; top:4px; right:4px; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,0.6); color:${v1.it?.favC ?? ""}; font-size:11px; line-height:20px; cursor:pointer;`, "position:absolute; top:4px; right:4px; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,0.6); color:{{ it.favC }}; font-size:11px; line-height:20px; cursor:pointer;")}>
                                ★
                              </button>
                              {"\n                      "}
                              <span data-dc-tpl="334" data-no-i18n="1" style={{"fontSize":"10.5px","lineHeight":"1.3","color":"#9d998f","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
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
                        <button data-dc-tpl="336" onClick={v.fxShowMore} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Vis flere
                        </button>
                      </> : null}
                      {"\n                "}
                      <div data-dc-tpl="337" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                        {"\n                  "}
                        <button data-dc-tpl="338" onClick={v.fxImport} title="Importer egne forhåndsvalg (JSON)" style={{"height":"30px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Importer
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="339" onClick={v.fxExport} title="Eksporter egne forhåndsvalg (JSON)" style={{"height":"30px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Eksporter egne
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <input data-dc-tpl="340" ref={v.fxFileRef} type="file" accept=".json,application/json" onChange={v.onFxFile} style={{"display":"none"}} />
                      {"\n                "}
                      <span data-dc-tpl="341" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
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
              <div data-dc-tpl="342" style={{"flex":"0 0 auto","maxHeight":"46%","minHeight":"0","display":"flex","flexDirection":"column","borderTop":"1px solid #1c1c1c","background":"#0d0d0d"}}>
                {"\n            "}
                <div data-dc-tpl="343" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","padding":"10px 14px 6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="344" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Lag
                  </span>
                  {"\n              "}
                  <span data-dc-tpl="345" data-no-i18n="1" style={{"fontSize":"11px","color":"#6f6b64"}}>
                    {I(v.layerCount)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="346" style={{"minHeight":"0","overflowY":"auto","display":"flex","flexDirection":"column","gap":"2px","padding":"0 8px 10px"}}>
                  {"\n              "}
                  {v.noLayers ? <>
                    <span data-dc-tpl="348" style={{"padding":"0 6px","fontSize":"12px","lineHeight":"1.5","color":"#8a867e"}}>
                      Ingen lag ennå. Legg til et bilde, en tekst eller en form.
                    </span>
                  </> : null}
                  {"\n              "}
                  {list(v.layers).map(($it1, $i1) => {
                    const v1 = { ...v, "l": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div data-dc-tpl="350" onClick={v1.l?.click} draggable="true" onDragStart={v1.l?.dragStart} onDragOver={v1.l?.dragOver} onDrop={v1.l?.drop} title="Dra for å endre rekkefølge" style={css(`display:flex; align-items:center; gap:4px; height:30px; flex:0 0 auto; padding:0 2px 0 6px; border:1px solid ${v1.l?.border ?? ""}; border-radius:8px; background:${v1.l?.bg ?? ""}; cursor:pointer; opacity:${v1.l?.op ?? ""};`, "display:flex; align-items:center; gap:4px; height:30px; flex:0 0 auto; padding:0 2px 0 6px; border:1px solid {{ l.border }}; border-radius:8px; background:{{ l.bg }}; cursor:pointer; opacity:{{ l.op }};")} className="scpe">
                        {"\n                  "}
                        <span data-dc-tpl="351" style={{"flex":"0 0 auto","width":"18px","height":"18px","display":"flex","alignItems":"center","justifyContent":"center","borderRadius":"5px","background":"#1c1c1c","color":"#9d998f","fontSize":"10px","fontWeight":"700"}}>
                          {I(v1.l?.icon)}
                        </span>
                        {v1.l?.grp ? <span title="Gruppe" aria-label="Gruppe" style={{"flex":"0 0 auto","width":"6px","height":"6px","borderRadius":"50%","background":v1.l?.grpC}} /> : null}
                        {"\n                  "}
                        <LayerName value={v1.l?.name} display={v1.l?.label} onRename={v1.l?.rename} style={{"flex":"1","minWidth":"0","fontSize":"12px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}} />
                        {"\n                  "}
                        <button data-dc-tpl="353" onClick={v1.l?.eye} title={v1.l?.eyeT} aria-label={v1.l?.eyeT} style={css(`width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.l?.eyeC ?? ""}; font:inherit; font-size:12px; cursor:pointer;`, "width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ l.eyeC }}; font:inherit; font-size:12px; cursor:pointer;")} className="scp7">
                          ◉
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="354" onClick={v1.l?.lock} title={v1.l?.lockT} aria-label={v1.l?.lockT} style={css(`width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:${v1.l?.lockC ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "width:22px; height:22px; padding:0; border:0; border-radius:6px; background:transparent; color:{{ l.lockC }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scp7">
                          <svg data-dc-tpl="355" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                            <rect data-dc-tpl="356" x="5" y="11" width="14" height="10" rx="2" />
                            <path data-dc-tpl="357" d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="358" onClick={v1.l?.del} title="Slett lag" aria-label="Slett lag" style={{"width":"22px","height":"22px","padding":"0","border":"0","borderRadius":"6px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"15px","lineHeight":"1","cursor":"pointer"}} className="scpf">
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
            <section data-dc-tpl="359" ref={v.stageRef} onPointerDown={v.stageDown} style={css(`position:relative; min-width:0; min-height:0; overflow:auto; display:grid; place-items:center; padding:30px; background:#060606; order:${v.stageOrder ?? ""};`, "position:relative; min-width:0; min-height:0; overflow:auto; display:grid; place-items:center; padding:30px; background:#060606; order:{{ stageOrder }};")}>
              {"\n          "}
              <div data-dc-tpl="360" ref={v.wrapRef} onPointerDown={v.wrapDown} onPointerMove={v.wrapMove} onPointerLeave={v.wrapLeave} onDoubleClick={v.wrapDbl} style={css(`position:relative; width:${v.cssW ?? ""}; height:${v.cssH ?? ""}; flex:0 0 auto; touch-action:none; cursor:${v.cursor ?? ""}; background-color:#ffffff; background-image:linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%), linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%); background-size:20px 20px; background-position:0 0, 10px 10px; box-shadow:0 20px 70px rgba(0,0,0,0.6);`, "position:relative; width:{{ cssW }}; height:{{ cssH }}; flex:0 0 auto; touch-action:none; cursor:{{ cursor }}; background-color:#ffffff; background-image:linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%), linear-gradient(45deg, #d9d9d9 25%, transparent 25%, transparent 75%, #d9d9d9 75%); background-size:20px 20px; background-position:0 0, 10px 10px; box-shadow:0 20px 70px rgba(0,0,0,0.6);")}>
                {"\n            "}
                <canvas data-dc-tpl="361" ref={v.canvasRef} width="10" height="10" style={{"position":"absolute","inset":"0","width":"100%","height":"100%"}} />
                {"\n            "}
                {v.showSafe ? <>
                  <div data-dc-tpl="363" style={css(`position:absolute; left:${v.safeI ?? ""}; top:${v.safeI ?? ""}; right:${v.safeI ?? ""}; bottom:${v.safeI ?? ""}; border:1px dashed rgba(255,63,164,0.85); pointer-events:none; z-index:3;`, "position:absolute; left:{{ safeI }}; top:{{ safeI }}; right:{{ safeI }}; bottom:{{ safeI }}; border:1px dashed rgba(255,63,164,0.85); pointer-events:none; z-index:3;")} />
                </> : null}
                {"\n            "}
                {list(v.guideLines).map((g, i) => <div key={'gl' + i} style={{"position":"absolute","left":g.left,"top":g.top,"width":g.w,"height":g.h,"background":"#9b1c3c","pointerEvents":"none","zIndex":4}} />)}
                {list(v.guideMarks).map((g, i) => <React.Fragment key={'gm' + i}>
                  <div style={{"position":"absolute","left":g.left,"top":g.top,"width":g.w,"height":g.h,"background":"#9b1c3c","pointerEvents":"none","zIndex":4}} />
                  <span data-no-i18n="1" style={{"position":"absolute","left":g.lx,"top":g.ly,"transform":"translate(-50%, -50%)","padding":"1px 5px","borderRadius":"4px","background":"#9b1c3c","color":"#ffffff","fontSize":"10px","fontWeight":"700","lineHeight":"14px","pointerEvents":"none","zIndex":5,"whiteSpace":"nowrap"}}>{g.label}</span>
                </React.Fragment>)}
                {"\n            "}
                {v.hasBox ? <>
                  {"\n              "}
                  <div data-dc-tpl="369" style={css(`position:absolute; left:${v.box?.left ?? ""}; top:${v.box?.top ?? ""}; width:${v.box?.w ?? ""}; height:${v.box?.h ?? ""}; transform:rotate(${v.box?.rot ?? ""}); outline:1.5px ${v.box?.line ?? ""} ${v.box?.col ?? ""}; pointer-events:none;`, "position:absolute; left:{{ box.left }}; top:{{ box.top }}; width:{{ box.w }}; height:{{ box.h }}; transform:rotate({{ box.rot }}); outline:1.5px {{ box.line }} {{ box.col }}; pointer-events:none;")}>
                    {"\n                "}
                    {list(v.handles).map(($it1, $i1) => {
                      const v1 = { ...v, "h": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="371" onPointerDown={v1.h?.down} aria-label={v1.h?.label} style={css(`position:absolute; left:${v1.h?.left ?? ""}; top:${v1.h?.top ?? ""}; width:${v1.h?.size ?? ""}; height:${v1.h?.size ?? ""}; margin:${v1.h?.margin ?? ""}; padding:0; border:1.5px solid ${v1.box?.col ?? ""}; border-radius:${v1.h?.radius ?? ""}; background:#ffffff; cursor:${v1.h?.cursor ?? ""}; pointer-events:auto; touch-action:none;`, "position:absolute; left:{{ h.left }}; top:{{ h.top }}; width:{{ h.size }}; height:{{ h.size }}; margin:{{ h.margin }}; padding:0; border:1.5px solid {{ box.col }}; border-radius:{{ h.radius }}; background:#ffffff; cursor:{{ h.cursor }}; pointer-events:auto; touch-action:none;")} />
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
                    <div data-dc-tpl="373" style={css(`position:absolute; left:${v1.f?.left ?? ""}; top:${v1.f?.top ?? ""}; width:0; height:0; z-index:4;`, "position:absolute; left:{{ f.left }}; top:{{ f.top }}; width:0; height:0; z-index:4;")}>
                      {"\n                "}
                      <button data-dc-tpl="374" onPointerDown={v1.f?.down} title="Dra for å flytte effekten" aria-label="Flytt effekt" style={css(`position:absolute; left:-14px; top:-14px; width:28px; height:28px; padding:0; border:2px solid #ffffff; border-radius:50%; background:${v1.f?.bg ?? ""}; color:${v1.f?.fg ?? ""}; font-size:13px; line-height:24px; box-shadow:0 1px 6px rgba(0,0,0,0.55); cursor:move; touch-action:none;`, "position:absolute; left:-14px; top:-14px; width:28px; height:28px; padding:0; border:2px solid #ffffff; border-radius:50%; background:{{ f.bg }}; color:{{ f.fg }}; font-size:13px; line-height:24px; box-shadow:0 1px 6px rgba(0,0,0,0.55); cursor:move; touch-action:none;")}>
                        ✦
                      </button>
                      {"\n                "}
                      {v1.f?.on ? <>
                        <button data-dc-tpl="376" onPointerDown={v1.f?.del} title="Fjern effekt" aria-label="Fjern effekt" style={{"position":"absolute","left":"10px","top":"-24px","width":"20px","height":"20px","padding":"0","border":"0","borderRadius":"50%","background":"#e4411f","color":"#ffffff","fontSize":"13px","lineHeight":"20px","boxShadow":"0 1px 4px rgba(0,0,0,0.5)","cursor":"pointer"}}>
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
                  <div data-dc-tpl="378" style={css(`position:absolute; left:${v.brushX ?? ""}; top:${v.brushY ?? ""}; width:${v.brushD ?? ""}; height:${v.brushD ?? ""}; transform:translate(-50%, -50%); border:1.5px solid #ffffff; outline:1px solid rgba(0,0,0,0.6); border-radius:50%; pointer-events:none;`, "position:absolute; left:{{ brushX }}; top:{{ brushY }}; width:{{ brushD }}; height:{{ brushD }}; transform:translate(-50%, -50%); border:1.5px solid #ffffff; outline:1px solid rgba(0,0,0,0.6); border-radius:50%; pointer-events:none;")} />
                </> : null}
                {list(v.multiBoxes).map((b, i) => <div key={'mb' + i} style={{"position":"absolute","left":b.left,"top":b.top,"width":b.w,"height":b.h,"transform":"rotate(" + b.rot + ")","outline":"1px solid rgba(61,139,255,0.7)","pointerEvents":"none"}} />)}
                {v.marqOn ? <div style={{"position":"absolute","left":v.marqL,"top":v.marqT,"width":v.marqW,"height":v.marqH,"border":"1px solid #3d8bff","background":"rgba(61,139,255,0.12)","pointerEvents":"none","zIndex":5}} /> : null}
                {"\n          "}
              </div>
              {"\n          "}
              {v.dragOver ? <>
                <div data-dc-tpl="380" style={{"position":"absolute","inset":"12px","border":"2px dashed #e9e7e2","borderRadius":"14px","background":"rgba(0,0,0,0.6)","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"15px","fontWeight":"600","pointerEvents":"none"}}>
                  Slipp bildet her
                </div>
              </> : null}
              {"\n          "}
              {v.hasBusy ? <>
                <div data-dc-tpl="382" style={{"position":"absolute","left":"50%","bottom":"20px","transform":"translateX(-50%)","display":"flex","alignItems":"center","gap":"10px","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","fontSize":"12.5px","fontWeight":"600"}}>
                  <span data-dc-tpl="383">
                    {I(v.busyLabel)}
                  </span>
                  <span data-dc-tpl="384" data-no-i18n="1" style={{"color":"#9d998f"}}>
                    {I(v.pctLabel)}
                  </span>
                </div>
              </> : null}
              {"\n        "}
            </section>
            {"\n\n        "}
            <aside data-dc-tpl="385" style={css(`min-width:0; min-height:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; order:${v.rightOrder ?? ""};`, "min-width:0; min-height:0; border-left:1px solid #1c1c1c; background:#0b0b0b; overflow-y:auto; order:{{ rightOrder }};")}>
              {"\n          "}
              <div data-dc-tpl="386" style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"14px"}}>
                {"\n            "}
                {v.hasMulti ? <>
                  <span style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    <span data-no-i18n="1">{v.multiCount}</span> <span>lag valgt</span>
                  </span>
                  <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                    {list(v.multiActs).map((b, i) => <button key={i} onClick={b.click} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":b.fg,"font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">{I(b.l)}</button>)}
                  </div>
                  <span style={{"fontSize":"12px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>{I(v.multiHint)}</span>
                  <span style={{"fontSize":"12px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>Ctrl+G grupperer · Ctrl+Shift+G deler opp · Shift+klikk legger til eller fjerner</span>
                </> : null}
                {v.noSel ? <>
                  {"\n              "}
                  <span data-dc-tpl="388" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                    Dokument
                  </span>
                  {"\n              "}
                  <label data-dc-tpl="389" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="390" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Format
                    </span>
                    {"\n                "}
                    <select data-dc-tpl="391" value={val(v.docFmt)} onChange={v.onDocFmt} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                      {list(v.fmtOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option data-dc-tpl="393" value={val(v1.o?.v)}>
                            {I(v1.o?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                    </select>
                  </label>
                  {"\n              "}
                  <span data-dc-tpl="394" data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                    {I(v.docDim)}
                  </span>
                  {"\n              "}
                  <span data-dc-tpl="395" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Bakgrunn
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="396" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                    {"\n                "}
                    <input data-dc-tpl="397" type="color" value={val(v.bgHex)} onChange={v.onBg} aria-label="Bakgrunnsfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                    {"\n                "}
                    {list(v.bgSw).map(($it1, $i1) => {
                      const v1 = { ...v, "c": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button data-dc-tpl="399" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="400" data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                    <span data-dc-tpl="401" style={{"letterSpacing":"0.08em"}}>
                      CMYK
                    </span>
                    {list(v.bgCmyk).map(($it1, $i1) => {
                      const v1 = { ...v, "k": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <label data-dc-tpl="403" style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                          <span data-dc-tpl="404">
                            {I(v1.k?.l)}
                          </span>
                          <input data-dc-tpl="405" type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                        </label>
                      </React.Fragment>;
                    })}
                  </div>
                  {"\n              "}
                  <button data-dc-tpl="406" onClick={v.toggleBgNone} role="switch" aria-checked={v.bgNone} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                    <span data-dc-tpl="407">
                      Gjennomsiktig bakgrunn
                    </span>
                    <span data-dc-tpl="408" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.bnTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ bnTrack }};")}>
                      <span data-dc-tpl="409" style={css(`position:absolute; top:2px; left:${v.bnKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.bnKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ bnKnob }}; width:13px; height:13px; border-radius:50%; background:{{ bnKnobBg }};")} />
                    </span>
                  </button>
                  {"\n              "}
                  <div data-dc-tpl="410" style={{"display":"flex","flexDirection":"column","gap":"8px","marginTop":"6px","paddingTop":"12px","borderTop":"1px solid #1c1c1c"}}>
                    {"\n                "}
                    <span data-dc-tpl="411" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Trykk
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="412" data-no-i18n="1" style={{"fontSize":"12px","color":"#8a867e"}}>
                      {I(v.printMm)}{" · 300 dpi"}
                    </span>
                    {"\n                "}
                    <button data-dc-tpl="413" onClick={v.toggleBleed} role="switch" aria-checked={v.bleedOn} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                      <span data-dc-tpl="414">
                        Utfallende 3 mm (bleed)
                      </span>
                      <span data-dc-tpl="415" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.blTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ blTrack }};")}>
                        <span data-dc-tpl="416" style={css(`position:absolute; top:2px; left:${v.blKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.blKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ blKnob }}; width:13px; height:13px; border-radius:50%; background:{{ blKnobBg }};")} />
                      </span>
                    </button>
                    {"\n                "}
                    <span data-dc-tpl="417" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                      {I(v.bleedNote)}
                    </span>
                    {"\n                "}
                    {v.hasBack ? <>
                      {"\n                  "}
                      <div data-dc-tpl="419" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                        {list(v.sideOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="421" onClick={v1.o?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v1.o?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <button data-dc-tpl="422" onClick={v.toggleBack} style={{"height":"34px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      {I(v.backLabel)}
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <p data-dc-tpl="423" style={{"margin":"8px 0 0","fontSize":"12px","lineHeight":"1.6","color":"#8a867e","textWrap":"pretty"}}>
                    Klikk på et lag i bildet for å redigere det. Dra bilder inn i vinduet, eller lim inn med Ctrl/Cmd + V. Dra et bilde oppå en bildeplass for å bytte det.
                  </p>
                  {"\n            "}
                </> : null}
                {"\n\n            "}
                {v.hasSel ? <>
                  {"\n              "}
                  <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>Lagnavn</span>
                    <input data-dc-tpl="425" value={val(v.selName)} onChange={v.onSelName} data-no-i18n="1" style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","fontWeight":"600"}} className="scpd" />
                  </label>
                  {"\n              "}
                  {v.isImg ? <>
                    {"\n                "}
                    <div data-dc-tpl="427" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                      {list(v.imgTabs).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="429" onClick={v1.t?.click} style={css(`flex:1; height:30px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1; height:30px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
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
                      <div data-dc-tpl="432" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                        {"\n                    "}
                        {list(v.imgActs).map(($it1, $i1) => {
                          const v1 = { ...v, "b": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="434" onClick={v1.b?.click} style={css(`height:34px; border:1px solid ${v1.b?.border ?? ""}; border-radius:10px; background:${v1.b?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:34px; border:1px solid {{ b.border }}; border-radius:10px; background:{{ b.bg }}; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")} className="scp4">
                              {I(v1.b?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      {v.cropOn ? <>
                        <span data-dc-tpl="436" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#f5b82c","textWrap":"pretty"}}>
                          Dra i bildet for å flytte utsnittet. Dra i kantene for å beskjære rammen.
                        </span>
                      </> : null}
                      {"\n                  "}
                      {list(v.tintTog).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="438" onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span data-dc-tpl="439">
                              {I(v1.t?.l)}
                            </span>
                            <span data-dc-tpl="440" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span data-dc-tpl="441" style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.hasTint ? <>
                        <div data-dc-tpl="443" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                          <input data-dc-tpl="444" type="color" value={val(v.tintC)} onChange={v.onTint} aria-label="Fargetone" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                          {list(v.tintSw).map(($it1, $i1) => {
                            const v1 = { ...v, "c": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button data-dc-tpl="446" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                            </React.Fragment>;
                          })}
                        </div>
                      </> : null}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isText ? <>
                      {"\n                  "}
                      <label style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>Tekst</span>
                        <textarea data-dc-tpl="448" ref={v.textRef} value={val(v.tText)} onChange={v.onTText} rows="3" data-no-i18n="1" style={{"padding":"10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#0e0e0e","color":"#f3f1ec","resize":"vertical","lineHeight":"1.4"}} className="scpd" />
                      </label>
                      {"\n                  "}
                      <div data-dc-tpl="449" style={{"display":"grid","gridTemplateColumns":"1fr 92px","gap":"6px"}}>
                        {"\n                    "}
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>Skrift</span>
                        <span style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>Tykkelse</span>
                        <select data-dc-tpl="450" value={val(v.tFont)} onChange={v.onTFont} aria-label="Skrift" style={{"height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                          {list(v.fontOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <option data-dc-tpl="452" value={val(v1.o?.v)}>
                                {I(v1.o?.v)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                    "}
                        <select data-dc-tpl="453" value={val(v.tWeight)} onChange={v.onTWeight} aria-label="Tykkelse" style={{"height":"34px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                          {list(v.weightOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <option data-dc-tpl="455" value={val(v1.o?.v)}>
                                {I(v1.o?.l)}
                              </option>
                            </React.Fragment>;
                          })}
                        </select>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="456" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                        {list(v.alignOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "t": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="458" onClick={v1.t?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v1.t?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="459" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input data-dc-tpl="460" type="color" value={val(v.tColor)} onChange={v.onTColor} aria-label="Tekstfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.tSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="462" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="463" data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                        <span data-dc-tpl="464" style={{"letterSpacing":"0.08em"}}>
                          CMYK
                        </span>
                        {list(v.tCmyk).map(($it1, $i1) => {
                          const v1 = { ...v, "k": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <label data-dc-tpl="466" style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                              <span data-dc-tpl="467">
                                {I(v1.k?.l)}
                              </span>
                              <input data-dc-tpl="468" type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                            </label>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <button data-dc-tpl="469" onClick={v.toggleUpper} role="switch" aria-checked={v.tUpper} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        <span data-dc-tpl="470">
                          Store bokstaver
                        </span>
                        <span data-dc-tpl="471" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v.upTrack ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ upTrack }};")}>
                          <span data-dc-tpl="472" style={css(`position:absolute; top:2px; left:${v.upKnob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v.upKnobBg ?? ""};`, "position:absolute; top:2px; left:{{ upKnob }}; width:13px; height:13px; border-radius:50%; background:{{ upKnobBg }};")} />
                        </span>
                      </button>
                      {"\n                  "}
                      <label data-dc-tpl="473" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span data-dc-tpl="474">
                          Konturfarge
                        </span>
                        <input data-dc-tpl="475" type="color" value={val(v.tStrokeC)} onChange={v.onTStrokeC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                      {"\n                  "}
                      {list(v.barTog).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="477" onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span data-dc-tpl="478">
                              {I(v1.t?.l)}
                            </span>
                            <span data-dc-tpl="479" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span data-dc-tpl="480" style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.tBar ? <>
                        <label data-dc-tpl="482" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          <span data-dc-tpl="483">
                            Understrekfarge
                          </span>
                          <input data-dc-tpl="484" type="color" value={val(v.tBarC)} onChange={v.onTBarC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        </label>
                      </> : null}
                      {"\n                  "}
                      {list(v.barRanges).map(($it1, $i1) => {
                        const v1 = { ...v, "f": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <label data-dc-tpl="486" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                            <span data-dc-tpl="487" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span data-dc-tpl="488" style={{"fontWeight":"600"}}>
                                {I(v1.f?.label)}
                              </span>
                              <span data-dc-tpl="489" data-no-i18n="1">
                                {I(v1.f?.show)}
                              </span>
                            </span>
                            <input data-dc-tpl="490" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isShape ? <>
                      {"\n                  "}
                      <div data-dc-tpl="492" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"4px"}}>
                        {list(v.kindOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "t": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="494" onClick={v1.t?.click} style={css(`height:28px; padding:0 4px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:28px; padding:0 4px; border:1px solid #2b2b2b; border-radius:8px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                              {I(v1.t?.l)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="495" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input data-dc-tpl="496" type="color" value={val(v.sFill)} onChange={v.onSFill} aria-label="Fyllfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.sSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="498" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="499" data-no-i18n="1" title="CMYK-verdier for trykk" style={{"display":"flex","alignItems":"center","gap":"4px","flexWrap":"wrap","fontSize":"10.5px","fontWeight":"700","color":"#8a867e"}}>
                        <span data-dc-tpl="500" style={{"letterSpacing":"0.08em"}}>
                          CMYK
                        </span>
                        {list(v.sCmyk).map(($it1, $i1) => {
                          const v1 = { ...v, "k": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <label data-dc-tpl="502" style={{"display":"flex","alignItems":"center","gap":"2px"}}>
                              <span data-dc-tpl="503">
                                {I(v1.k?.l)}
                              </span>
                              <input data-dc-tpl="504" type="number" min="0" max="100" value={val(v1.k?.v)} onChange={v1.k?.on} style={{"width":"42px","height":"26px","padding":"0 4px","border":"1px solid #2b2b2b","borderRadius":"6px","background":"#0e0e0e","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600"}} />
                            </label>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                  "}
                      {list(v.shapeToggles).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <button data-dc-tpl="506" onClick={v1.t?.click} role="switch" aria-checked={v1.t?.on} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"0","border":"0","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                            <span data-dc-tpl="507">
                              {I(v1.t?.l)}
                            </span>
                            <span data-dc-tpl="508" style={css(`position:relative; width:30px; height:17px; border-radius:999px; background:${v1.t?.track ?? ""};`, "position:relative; width:30px; height:17px; border-radius:999px; background:{{ t.track }};")}>
                              <span data-dc-tpl="509" style={css(`position:absolute; top:2px; left:${v1.t?.knob ?? ""}; width:13px; height:13px; border-radius:50%; background:${v1.t?.knobBg ?? ""};`, "position:absolute; top:2px; left:{{ t.knob }}; width:13px; height:13px; border-radius:50%; background:{{ t.knobBg }};")} />
                            </span>
                          </button>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                  "}
                      {v.sGrad ? <>
                        <label data-dc-tpl="511" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          <span data-dc-tpl="512">
                            Toning til
                          </span>
                          <input data-dc-tpl="513" type="color" value={val(v.sFill2)} onChange={v.onSFill2} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        </label>
                      </> : null}
                      {"\n                  "}
                      <label data-dc-tpl="514" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        <span data-dc-tpl="515">
                          Konturfarge
                        </span>
                        <input data-dc-tpl="516" type="color" value={val(v.sStrokeC)} onChange={v.onSStrokeC} style={{"width":"40px","height":"26px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.isGlow ? <>
                      {"\n                  "}
                      <div data-dc-tpl="518" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                        {"\n                    "}
                        <input data-dc-tpl="519" type="color" value={val(v.gColor)} onChange={v.onGColor} aria-label="Lysfarge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                        {"\n                    "}
                        {list(v.gSw).map(($it1, $i1) => {
                          const v1 = { ...v, "c": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="521" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:24px; height:24px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
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
                        <span data-dc-tpl="524" style={{"fontSize":"11.5px","lineHeight":"1.5","color":"#f5b82c","textWrap":"pretty"}}>
                          Slå på Avansert modus for å redigere effekten. Den vises og eksporteres som før.
                        </span>
                      </> : null}
                      {"\n                  "}
                      {v.fxEdit ? <>
                        {"\n                    "}
                        <span data-dc-tpl="526" data-no-i18n="1" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                          {I(v.fxKindName)}
                        </span>
                        {"\n                    "}
                        {v.fxHasColor ? <>
                          {"\n                      "}
                          <div data-dc-tpl="528" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            {"\n                        "}
                            <div data-dc-tpl="529" style={{"display":"flex","flexWrap":"wrap","gap":"4px"}}>
                              {"\n                          "}
                              {list(v.fxColorTabs).map(($it1, $i1) => {
                                const v1 = { ...v, "t": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  <button data-dc-tpl="531" onClick={v1.t?.click} style={css(`display:flex; align-items:center; gap:6px; padding:5px 10px 5px 6px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:600 12px/1 inherit; cursor:pointer;`, "display:flex; align-items:center; gap:6px; padding:5px 10px 5px 6px; border:1px solid #2b2b2b; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:600 12px/1 inherit; cursor:pointer;")}>
                                    <span data-dc-tpl="532" data-keep-color="1" style={css(`width:14px; height:14px; border-radius:50%; background:${v1.t?.c ?? ""}; border:1px solid #444;`, "width:14px; height:14px; border-radius:50%; background:{{ t.c }}; border:1px solid #444;")} />
                                    <span data-dc-tpl="533" data-no-i18n="1">
                                      {I(v1.t?.l)}
                                    </span>
                                  </button>
                                </React.Fragment>;
                              })}
                              {"\n                        "}
                            </div>
                            {"\n                        "}
                            <div data-dc-tpl="534" style={{"display":"flex","flexWrap":"wrap","gap":"6px","alignItems":"center"}}>
                              {"\n                          "}
                              <input data-dc-tpl="535" type="color" value={val(v.fxColorVal)} onChange={v.fxColorOn} aria-label="Velg farge" style={{"width":"40px","height":"30px","padding":"0","border":"1px solid #2b2b2b","borderRadius":"8px","background":"transparent","cursor":"pointer"}} />
                              {"\n                          "}
                              {list(v.fxColorSw).map(($it1, $i1) => {
                                const v1 = { ...v, "c": $it1, $index: $i1 };
                                return <React.Fragment key={$i1}>
                                  <button data-dc-tpl="537" onClick={v1.c?.click} aria-label={v1.c?.v} data-keep-color="1" style={css(`width:22px; height:22px; padding:0; border:1px solid ${v1.c?.border ?? ""}; border-radius:50%; background:${v1.c?.v ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid {{ c.border }}; border-radius:50%; background:{{ c.v }}; cursor:pointer;")} />
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
                            <label data-dc-tpl="539" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                              <span data-dc-tpl="540" data-no-i18n="1">
                                {I(v1.f?.label)}
                              </span>
                              <select data-dc-tpl="541" value={val(v1.f?.val)} onChange={v1.f?.on} style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                                {list(v1.f?.opts).map(($it2, $i2) => {
                                  const v2 = { ...v1, "o": $it2, $index: $i2 };
                                  return <React.Fragment key={$i2}>
                                    <option data-dc-tpl="543" value={val(v2.o?.v)}>
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
                            <label data-dc-tpl="545" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                              <span data-dc-tpl="546" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                                <span data-dc-tpl="547" data-no-i18n="1" style={{"fontWeight":"600"}}>
                                  {I(v1.f?.label)}
                                </span>
                                <span data-dc-tpl="548" data-no-i18n="1">
                                  {I(v1.f?.show)}
                                </span>
                              </span>
                              <input data-dc-tpl="549" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#f5b82c"}} />
                            </label>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                    "}
                        <div data-dc-tpl="550" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                          {"\n                      "}
                          {list(v.fxActs).map(($it1, $i1) => {
                            const v1 = { ...v, "b": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button data-dc-tpl="552" onClick={v1.b?.click} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                                {I(v1.b?.l)}
                              </button>
                            </React.Fragment>;
                          })}
                          {"\n                    "}
                        </div>
                        {"\n                    "}
                        <div data-dc-tpl="553" style={{"height":"1px","background":"#1c1c1c"}} />
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {list(v.layerRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <label data-dc-tpl="555" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                          <span data-dc-tpl="556" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="557" style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-dc-tpl="558" data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input data-dc-tpl="559" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label data-dc-tpl="560" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      <span data-dc-tpl="561">
                        Blandingsmodus
                      </span>
                      <select data-dc-tpl="562" value={val(v.selBlend)} onChange={v.onBlend} style={{"height":"32px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec"}}>
                        {list(v.blendOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <option data-dc-tpl="564" value={val(v1.o?.v)}>
                              {I(v1.o?.l)}
                            </option>
                          </React.Fragment>;
                        })}
                      </select>
                    </label>
                    {"\n                "}
                    <div data-dc-tpl="565" style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"6px","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      {"\n                  "}
                      {list(v.selActs).map(($it1, $i1) => {
                        const v1 = { ...v, "b": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="567" onClick={v1.b?.click} style={css(`height:32px; border:1px solid #2b2b2b; border-radius:10px; background:#121212; color:${v1.b?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:32px; border:1px solid #2b2b2b; border-radius:10px; background:#121212; color:{{ b.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")} className="scp4">
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
                    <span data-dc-tpl="569" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Looks
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="570" style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"6px"}}>
                      {"\n                  "}
                      {list(v.looks).map(($it1, $i1) => {
                        const v1 = { ...v, "k": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="572" onClick={v1.k?.click} style={css(`height:32px; padding:0 4px; border:1px solid ${v1.k?.border ?? ""}; border-radius:10px; background:${v1.k?.bg ?? ""}; color:${v1.k?.fg ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:32px; padding:0 4px; border:1px solid {{ k.border }}; border-radius:10px; background:{{ k.bg }}; color:{{ k.fg }}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                            {I(v1.k?.l)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="573" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      <span data-dc-tpl="574" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Justering
                      </span>
                      <button data-dc-tpl="575" onClick={v.resetAdj} style={{"height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Nullstill
                      </button>
                    </div>
                    {"\n                "}
                    {list(v.adjRanges).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <label data-dc-tpl="577" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="578" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="579" style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-dc-tpl="580" data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input data-dc-tpl="581" type="range" min={v1.f?.min} max={v1.f?.max} step="1" value={val(v1.f?.val)} onChange={v1.f?.on} onDoubleClick={v1.f?.reset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <div data-dc-tpl="582" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","paddingTop":"6px","borderTop":"1px solid #1c1c1c"}}>
                      <span data-dc-tpl="583" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                        Kurve
                      </span>
                      <button data-dc-tpl="584" onClick={v.resetCurve} style={{"height":"26px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Nullstill
                      </button>
                    </div>
                    {"\n                "}
                    <svg data-dc-tpl="585" ref={v.curveRef} viewBox="0 0 100 100" onPointerDown={v.curveDown} style={{"width":"100%","aspectRatio":"1","border":"1px solid #232323","borderRadius":"10px","background":"#0e0e0e","touchAction":"none","cursor":"crosshair"}}>
                      {"\n                  "}
                      <path data-dc-tpl="586" d="M25 0V100M50 0V100M75 0V100M0 25H100M0 50H100M0 75H100" stroke="#1f1f1f" stroke-width="0.5" />
                      {"\n                  "}
                      <path data-dc-tpl="587" d="M0 100L100 0" stroke="#2b2b2b" stroke-width="0.5" stroke-dasharray="2 2" />
                      {"\n                  "}
                      <path data-dc-tpl="588" d={v.curvePath} fill="none" stroke="#e9e7e2" stroke-width="1.2" />
                      {"\n                  "}
                      {list(v.curvePts).map(($it1, $i1) => {
                        const v1 = { ...v, "p": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <circle data-dc-tpl="590" cx={v1.p?.x} cy={v1.p?.y} r="2.6" fill="#0e0e0e" stroke="#e9e7e2" stroke-width="1.2" />
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </svg>
                    {"\n                "}
                    <span data-dc-tpl="591" style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64"}}>
                      Klikk for å legge til punkt. Dra for å flytte. Dobbeltklikk på et punkt fjerner det.
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n\n              "}
                  {v.secCut ? <>
                    {"\n                "}
                    <span data-dc-tpl="593" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Klipp ut motiv med AI
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="594" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      {"\n                  "}
                      <button data-dc-tpl="595" onClick={v.cutPerson} disabled={v.busyAny} style={css(`height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp9">
                        Person
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="596" onClick={v.cutObject} disabled={v.busyAny} style={css(`height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v.busyOp ?? ""};`, "height:38px; border:0; border-radius:10px; background:#e9e7e2; color:#000000; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ busyOp }};")} className="scp9">
                        Objekt
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <span data-dc-tpl="597" style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64","textWrap":"pretty"}}>
                      Kjører i nettleseren. Første gang lastes modellen ned (MODNet for personer, BiRefNet for objekter).
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="598" style={{"paddingTop":"6px","borderTop":"1px solid #1c1c1c","fontSize":"11px","fontWeight":"700","letterSpacing":"0.18em","textTransform":"uppercase","color":"#6f6b64"}}>
                      Pensel på masken
                    </span>
                    {"\n                "}
                    <button data-dc-tpl="599" onClick={v.toggleBrush} style={css(`height:36px; border:1px solid ${v.brushBorder ?? ""}; border-radius:10px; background:${v.brushBg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:36px; border:1px solid {{ brushBorder }}; border-radius:10px; background:{{ brushBg }}; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v.brushLabel)}
                    </button>
                    {"\n                "}
                    <div data-dc-tpl="600" style={{"display":"flex","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                      {list(v.brushModes).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="602" onClick={v1.t?.click} style={css(`flex:1; height:28px; border:0; border-radius:999px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1; height:28px; border:0; border-radius:999px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
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
                        <label data-dc-tpl="604" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="605" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="606" style={{"fontWeight":"600"}}>
                              {I(v1.f?.label)}
                            </span>
                            <span data-dc-tpl="607" data-no-i18n="1">
                              {I(v1.f?.show)}
                            </span>
                          </span>
                          <input data-dc-tpl="608" type="range" min={v1.f?.min} max={v1.f?.max} step={v1.f?.step} value={val(v1.f?.val)} onChange={v1.f?.on} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <span data-dc-tpl="609" style={{"fontSize":"11px","lineHeight":"1.5","color":"#6f6b64"}}>
                      Hold Alt for å bytte mellom fjern og gjenopprett.
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="610" style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"6px"}}>
                      {"\n                  "}
                      <button data-dc-tpl="611" onClick={v.invertMask} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                        Inverter
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="612" onClick={v.clearMask} style={{"height":"32px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#121212","color":"#ff8f7d","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpg">
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
        <div data-dc-tpl="614" role="status" style={{"position":"fixed","left":"50%","bottom":"24px","transform":"translateX(-50%)","zIndex":"90","maxWidth":"min(560px, calc(100vw - 32px))","padding":"10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","fontSize":"13px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)"}}>
          {I(v.toast)}
        </div>
        {"\n  "}
      </> : null}
    </div>
    </>
  );
}
