/* GENERERT av scripts/dc2jsx.mjs fra legacy-dc/thumbnail-studio.dc.html – ikke rediger for hånd før siden er ferdig sammenlignet. */
import React from 'react';
import { I, css, val, chk, list } from '../../shared/dc.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"17":["←","Media Lab"],"18":["←"],"19":["Media Lab"],"20":["{{ editCatsLabel }}"],"22":["←","Kategorier"],"23":["←"],"24":["Kategorier"],"27":["←","{{ catName }}"],"28":["←"],"29":["{{ catName }}"],"31":["Grunnoppsett"],"35":["Ikke lagret"],"37":[],"39":["Autolagring"],"41":["{{ autoAtLabel }}"],"43":["↶"],"44":["↷"],"50":["Visning"],"54":["Visning av redigering"],"60":["{{ o.name }}","{{ o.desc }}"],"61":["{{ o.name }}"],"62":["{{ o.desc }}"],"63":["{{ saveLabel }}"],"64":["Eksporter"],"66":["LASTER …"],"69":["Thumbnail Studio"],"70":["Miniatyrbilder til YouTube og appen i 16:9. Velg en kategori, bytt person og navn, og last ned i 1080p eller 4K."],"74":["\n              ","{{ c.count }}","\n              ","{{ c.name }}","\n              ","{{ c.desc }}","\n              ","Åpne","\n            "],"75":["{{ c.count }}"],"76":["{{ c.name }}"],"77":["{{ c.desc }}"],"78":["Åpne"],"79":["Åpne"],"84":["×"],"87":["Grunnoppsett"],"92":["\n          ","+","\n          ","Ny kategori","\n        "],"93":["+"],"94":["Ny kategori"],"96":["Sikkerhetskopi","Malene lagres bare i denne nettleseren. Last ned en fil for å ta vare på dem, eller for å flytte dem til en annen maskin."],"97":["Sikkerhetskopi"],"98":["Malene lagres bare i denne nettleseren. Last ned en fil for å ta vare på dem, eller for å flytte dem til en annen maskin."],"100":["{{ backupLabel }}"],"101":["Gjenopprett fra fil"],"105":["{{ catCount }}"],"106":["{{ catName }}"],"107":["{{ catDesc }}"],"112":["Rediger grunnoppsett"],"114":["Tilbakestill til standard"],"115":["{{ baseSub }}"],"117":["1","Trykk «Ny mal» og velg et oppsett."],"118":["1"],"119":["Trykk «Ny mal» og velg et oppsett."],"120":["2","Bytt person, navn og tema i panelet til høyre."],"121":["2"],"122":["Bytt person, navn og tema i panelet til høyre."],"123":["3","Lagre malen, og last ned i 1080p eller 4K."],"124":["3"],"125":["Lagre malen, og last ned i 1080p eller 4K."],"127":["\n            ","+","\n            ","Ny mal","\n            ","{{ newSub }}","\n          "],"128":["+"],"129":["Ny mal"],"130":["{{ newSub }}"],"136":["{{ t.name }}","{{ t.date }}"],"137":["{{ t.name }}"],"138":["{{ t.date }}"],"140":["Rediger"],"141":["Dupliser"],"142":["Slett"],"144":["Kategorien har 5 maler, som er maks. Slett eller overskriv en for å lagre en ny."],"152":["{{ t.label }}"],"161":["Bytt oppsett"],"162":["Legg til"],"165":["{{ b.label }}"],"169":["{{ o.label }}"],"174":["{{ g.title }}"],"177":["{{ o.label }}"],"179":["Farge på nye elementer"],"189":["{{ o.label }}"],"191":["{{ o.label }}"],"193":["Farge"],"201":["Lag","Øverst i listen ligger øverst i bildet. ↺ flytter laget tilbake til grunnoppsettet. Dra et lag eller en knapp fra «Legg til» over et annet lag for å koble dem sammen."],"202":["Lag"],"203":["Øverst i listen ligger øverst i bildet. ↺ flytter laget tilbake til grunnoppsettet. Dra et lag eller en knapp fra «Legg til» over et annet lag for å koble dem sammen."],"208":["↳"],"210":["Understrek"],"211":["Koblet"],"217":["{{ r.tag }}"],"218":["{{ r.label }}"],"224":["Koblet"],"241":["\n            ","Bunn","\n            ","Bakgrunn og vignett","\n          "],"242":["Bunn"],"243":["Bakgrunn og vignett"],"247":["\n            ","Enkel visning på mobil","\n            ","Her kan du bytte person, navn, tema og bakgrunn, og laste ned. Vil du flytte eller endre enkeltlag, åpner du malen på en PC.","\n          "],"248":["Enkel visning på mobil"],"249":["Her kan du bytte person, navn, tema og bakgrunn, og laste ned. Vil du flytte eller endre enkeltlag, åpner du malen på en PC."],"251":["\n            ","Du redigerer grunnoppsettet","\n            ","Det du lagrer her, blir startpunktet for alle nye maler i kategorien: farger, bakgrunn, fonter og plassering. Maler du allerede har lagret, endres ikke.","\n          "],"252":["Du redigerer grunnoppsettet"],"253":["Det du lagrer her, blir startpunktet for alle nye maler i kategorien: farger, bakgrunn, fonter og plassering. Maler du allerede har lagret, endres ikke."],"275":["Leser bildet …"],"280":["{{ zoomLabel }}"],"288":["Standard zoom"],"290":["\n          ","Klikk: velg et lag","\n          ","Dobbeltklikk på et bilde: beskjær","\n          ","Shift-klikk: velg flere lag, og flytt eller skaler dem sammen","\n          ","Dra: flytt (hold Alt for å slå av hjelpelinjer)","\n          ","Hjørner: endre størrelse (Shift endrer forholdet)","\n          ","Piltaster: finjuster (Shift = 10 px)","\n          ","Delete: slett · ⌘D: dupliser · ⌘Z: angre","\n          ","Slipp et bilde her for å legge det til","\n        "],"291":["Klikk: velg et lag"],"292":["Dobbeltklikk på et bilde: beskjær"],"293":["Shift-klikk: velg flere lag, og flytt eller skaler dem sammen"],"294":["Dra: flytt (hold Alt for å slå av hjelpelinjer)"],"295":["Hjørner: endre størrelse (Shift endrer forholdet)"],"296":["Piltaster: finjuster (Shift = 10 px)"],"297":["Delete: slett · ⌘D: dupliser · ⌘Z: angre"],"298":["Slipp et bilde her for å legge det til"],"302":["{{ panelTitle }}"],"304":["Ferdig"],"307":["{{ c.label }}"],"311":["{{ c.label }}"],"315":["{{ c.unit }}"],"319":["{{ c.label }}"],"322":["Profil"],"333":["{{ c.label }}"],"336":["{{ o.label }}"],"340":["{{ c.label }}"],"343":["{{ c.label }}"],"347":["{{ t.label }}"],"350":["Enter gir nytt punkt. Tab gir underpunkt, Shift+Tab går tilbake. Vanlig tekst og lister kan blandes."],"353":["{{ c.label }}"],"361":["{{ n.label }}"],"366":["{{ b.label }}"],"368":["{{ c.text }}"],"371":["{{ c.label }}"],"377":["{{ c.pickLabel }}"],"379":["Fjern bildet"],"382":["Valgfritt: fjern bakgrunnen med AI. Kjører i nettleseren, og originalen tas vare på."],"384":["Person"],"385":["Objekt"],"388":["{{ c.aiLabel }}"],"392":["Bruk originalbildet"],"396":["\n          ","Egen visning","\n          ","Dra fanene til den kolonnen du vil. Slipp en fane oppå en annen for å legge dem etter hverandre, og dra dem for å endre rekkefølgen. Tomme kolonner blir ikke vist.","\n        "],"397":["Egen visning"],"398":["Dra fanene til den kolonnen du vil. Slipp en fane oppå en annen for å legge dem etter hverandre, og dra dem for å endre rekkefølgen. Tomme kolonner blir ikke vist."],"400":["Start fra:"],"402":["{{ p.label }}"],"406":["{{ c.title }}"],"409":["⋮⋮","{{ it.name }}"],"410":["⋮⋮"],"411":["{{ it.name }}"],"413":["←"],"414":["↑"],"415":["↓"],"416":["→"],"418":["Slipp en fane her"],"422":["Vis som faner"],"424":["Tilbakestill til grunnoppsett"],"426":["Avbryt"],"427":["Bruk visningen"],"432":["{{ m.label }}","{{ m.sc }}"],"433":["{{ m.label }}"],"434":["{{ m.sc }}"],"441":["Ny mal"],"442":["Velg hvordan den nye malen skal starte."],"444":["Bytt oppsett"],"445":["Velg et nytt oppsett. Personbilde, navn, tema og egne bilder blir med over. Du kan angre etterpå."],"451":["Velg farge"],"452":["{{ palCurName }}"],"460":["{{ p.name }}"],"461":["✓"],"469":["Lager skisse …"],"470":["\n                ","{{ o.name }}","\n                ","{{ o.desc }}","\n              "],"471":["{{ o.name }}"],"472":["{{ o.desc }}"],"480":["Lager skisse …"],"481":["\n                ","{{ o.name }}","\n                ","{{ o.desc }}","\n              "],"482":["{{ o.name }}"],"483":["{{ o.desc }}"],"485":["Avbryt"],"489":["Eksporter thumbnail"],"491":["Oppløsning"],"494":["{{ o.label }}"],"496":["Format"],"499":["{{ o.label }}"],"503":["Gjennomsiktig bakgrunn","Bakgrunn og vignett tas bort. Bare lagene blir med."],"504":["Gjennomsiktig bakgrunn"],"505":["Bakgrunn og vignett tas bort. Bare lagene blir med."],"507":["Hva passer best?"],"508":["YouTube","JPG i 1080p. Liten fil, og alltid under grensen på 2 MB."],"509":["YouTube"],"510":["JPG i 1080p. Liten fil, og alltid under grensen på 2 MB."],"511":["Appen og nettsiden","PNG i 1080p. Skarpest tekst og logoer."],"512":["Appen og nettsiden"],"513":["PNG i 1080p. Skarpest tekst og logoer."],"514":["Gjennomsiktig bakgrunn","Bare PNG. Bruk det når bildet skal ligge oppå en video eller et annet bilde."],"515":["Gjennomsiktig bakgrunn"],"516":["Bare PNG. Bruk det når bildet skal ligge oppå en video eller et annet bilde."],"517":["Storskjerm og trykk","PNG i 4K. Størst fil og mest detaljer."],"518":["Storskjerm og trykk"],"519":["PNG i 4K. Størst fil og mest detaljer."],"521":["{{ sizeText }}"],"524":["Filen er over 2 MB. Det er for stort for YouTube, men fungerer fint i appen."],"526":["{{ fixLabel }}"],"528":["Avbryt"],"529":["Kopier"],"530":["Send til …"],"531":["{{ expBtn }}"],"535":["Lagre mal"],"537":["Navn"],"539":["{{ saveNote }}"],"542":["{{ b.label }}"],"545":["Kategorien er full (5 maler). Overskriv en av disse:"],"547":["{{ o.label }}"],"550":["\n        ","Beskjær bildet","\n        ","Dra i kantene eller hjørnene. Dra inne i rammen for å flytte den.","\n      "],"551":["Beskjær bildet"],"552":["Dra i kantene eller hjørnene. Dra inne i rammen for å flytte den."],"573":["Fjern tomme kanter"],"574":["Vis hele bildet"],"576":["Avbryt"],"577":["Bruk"],"579":["{{ msg }}"],"582":["\n    ","Design by Kristen Utvikling","\n  "],"583":["Design by Kristen Utvikling"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="14" style={{"position":"relative","minHeight":"100dvh","display":"flex","flexDirection":"column","fontFamily":"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif","color":"#f3f1ec","background":"transparent","fontSize":"14px"}}>
      {"\n  "}
      <div data-dc-tpl="15" style={{"position":"sticky","top":"0","zIndex":"50","padding":"22px 28px 10px","display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","flexWrap":"wrap"}}>
        {"\n    "}
        {v.isHome ? <>
          {"\n      "}
          <a data-dc-tpl="17" href="media-lab.dc.html" style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"rgba(0,0,0,0.55)","backdropFilter":"blur(12px)","WebkitBackdropFilter":"blur(12px)","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#f3f1ec"}} className="scp0">
            <span data-dc-tpl="18" style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span data-dc-tpl="19">
              Media Lab
            </span>
          </a>
          {"\n      "}
          <button data-dc-tpl="20" onClick={v.toggleEditCats} style={css(`height:40px; padding:0 20px; border:1px solid ${v.editCatsBorder ?? ""}; border-radius:999px; background:${v.editCatsBg ?? ""}; color:${v.editCatsColor ?? ""}; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer;`, "height:40px; padding:0 20px; border:1px solid {{ editCatsBorder }}; border-radius:999px; background:{{ editCatsBg }}; color:{{ editCatsColor }}; font:inherit; font-size:12.5px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer;")}>
            {I(v.editCatsLabel)}
          </button>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.isCat ? <>
          {"\n      "}
          <button data-dc-tpl="22" onClick={v.goHome} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
            <span data-dc-tpl="23" style={{"fontSize":"16px","letterSpacing":"0"}}>
              ←
            </span>
            <span data-dc-tpl="24">
              Kategorier
            </span>
          </button>
          {"\n    "}
        </> : null}
        {"\n    "}
        {v.isEdit ? <>
          {"\n      "}
          <div data-dc-tpl="26" style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap","minWidth":"0","flex":"1 1 360px"}}>
            {"\n        "}
            <button data-dc-tpl="27" onClick={v.leaveEdit} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.1em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
              <span data-dc-tpl="28" style={{"fontSize":"16px","letterSpacing":"0"}}>
                ←
              </span>
              <span data-dc-tpl="29" data-no-i18n="1">
                {I(v.catName)}
              </span>
            </button>
            {"\n        "}
            {v.baseEdit ? <>
              <span data-dc-tpl="31" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","color":"#e9e7e2"}}>
                Grunnoppsett
              </span>
            </> : null}
            {"\n        "}
            {v.notBaseEdit ? <>
              <input data-dc-tpl="33" value={val(v.tplName)} onChange={v.onTplName} placeholder="Navn på malen" aria-label="Navn på malen" style={{"flex":"1 1 200px","minWidth":"0","maxWidth":"340px","height":"40px","padding":"0 14px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"999px","background":"rgba(12,12,12,0.7)","color":"#f3f1ec","font":"inherit","fontSize":"14px","fontWeight":"600","outline":"none"}} />
            </> : null}
            {"\n        "}
            {v.dirty ? <>
              <span data-dc-tpl="35" style={{"fontSize":"12px","color":"#9d998f"}}>
                Ikke lagret
              </span>
            </> : null}
            {"\n        "}
            <button data-dc-tpl="36" onClick={v.toggleAuto} role="switch" aria-checked={v.autoAria} title="Slå autolagring av eller på" style={css(`display:inline-flex; align-items:center; gap:9px; height:34px; padding:0 12px 0 6px; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:${v.autoTextColor ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "display:inline-flex; align-items:center; gap:9px; height:34px; padding:0 12px 0 6px; border:1px solid rgba(255,255,255,0.14); border-radius:999px; background:transparent; color:{{ autoTextColor }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")} className="scp2">
              {"\n          "}
              <span data-dc-tpl="37" data-keep-color="1" style={css(`position:relative; width:34px; height:20px; border-radius:999px; background:${v.autoTrack ?? ""}; transition:background 180ms ease;`, "position:relative; width:34px; height:20px; border-radius:999px; background:{{ autoTrack }}; transition:background 180ms ease;")}>
                <span data-dc-tpl="38" style={css(`position:absolute; top:2px; left:${v.autoKnobX ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.autoKnob ?? ""}; transition:left 180ms ease;`, "position:absolute; top:2px; left:{{ autoKnobX }}; width:16px; height:16px; border-radius:999px; background:{{ autoKnob }}; transition:left 180ms ease;")} />
              </span>
              {"\n          "}
              <span data-dc-tpl="39">
                Autolagring
              </span>
              {"\n          "}
              {v.hasAutoAt ? <>
                <span data-dc-tpl="41" style={{"fontWeight":"400","color":"#8a867e"}}>
                  {I(v.autoAtLabel)}
                </span>
              </> : null}
              {"\n        "}
            </button>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="42" style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
            {"\n        "}
            <button data-dc-tpl="43" onClick={v.undo} disabled={v.noUndo} title="Angre (⌘Z)" aria-label="Angre" style={css(`width:40px; height:40px; padding:0; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:16px; cursor:pointer; opacity:${v.undoOp ?? ""};`, "width:40px; height:40px; padding:0; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:16px; cursor:pointer; opacity:{{ undoOp }};")}>
              ↶
            </button>
            {"\n        "}
            <button data-dc-tpl="44" onClick={v.redo} disabled={v.noRedo} title="Gjør om (⇧⌘Z)" aria-label="Gjør om" style={css(`width:40px; height:40px; padding:0; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:16px; cursor:pointer; opacity:${v.redoOp ?? ""};`, "width:40px; height:40px; padding:0; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:16px; cursor:pointer; opacity:{{ redoOp }};")}>
              ↷
            </button>
            {"\n        "}
            <div data-dc-tpl="45" style={{"position":"relative"}}>
              {"\n          "}
              <button data-dc-tpl="46" onClick={v.toggleViewMenu} title="Visning" aria-label="Visning" aria-haspopup="menu" aria-expanded={v.viewMenu} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"40px","padding":"0 14px","border":"1px solid rgba(255,255,255,0.18)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp3">
                {"\n            "}
                <svg data-dc-tpl="47" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect data-dc-tpl="48" x="3" y="4" width="18" height="16" rx="2" />
                  <path data-dc-tpl="49" d="M9 4v16M15 4v16" />
                </svg>
                {"\n            "}
                <span data-dc-tpl="50">
                  Visning
                </span>
                {"\n          "}
              </button>
              {"\n          "}
              {v.viewMenu ? <>
                {"\n            "}
                <div data-dc-tpl="52" onClick={v.closeViewMenu} style={{"position":"fixed","inset":"0","zIndex":"40"}} />
                {"\n            "}
                <div data-dc-tpl="53" role="menu" aria-label="Visning" style={{"position":"absolute","left":"0","top":"48px","zIndex":"41","width":"290px","maxWidth":"calc(100vw - 24px)","display":"flex","flexDirection":"column","gap":"4px","padding":"8px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"14px","background":"#0c0c0c","boxShadow":"0 16px 40px rgba(0,0,0,0.5)"}}>
                  {"\n              "}
                  <span data-dc-tpl="54" style={{"padding":"4px 6px 6px","fontSize":"11px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","color":"#8a867e"}}>
                    Visning av redigering
                  </span>
                  {"\n              "}
                  {list(v.viewOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="56" role="menuitemradio" aria-checked={v1.o?.sel} onClick={v1.o?.onClick} style={css(`display:flex; align-items:center; gap:12px; min-height:52px; padding:6px 8px; border:1px solid ${v1.o?.border ?? ""}; border-radius:10px; background:${v1.o?.bg ?? ""}; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:12px; min-height:52px; padding:6px 8px; border:1px solid {{ o.border }}; border-radius:10px; background:{{ o.bg }}; color:#f3f1ec; font:inherit; text-align:left; cursor:pointer;")} className="scp4">
                        {"\n                  "}
                        <span data-dc-tpl="57" data-keep-color="1" style={{"flex":"0 0 auto","display":"flex","gap":"2px","width":"48px","height":"30px","padding":"3px","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"5px"}}>
                          {"\n                    "}
                          {list(v1.o?.boxes).map(($it2, $i2) => {
                            const v2 = { ...v1, "x": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              <span data-dc-tpl="59" style={css(`flex:${v2.x?.f ?? ""}; border-radius:2px; background:${v2.x?.bg ?? ""};`, "flex:{{ x.f }}; border-radius:2px; background:{{ x.bg }};")} />
                            </React.Fragment>;
                          })}
                          {"\n                  "}
                        </span>
                        {"\n                  "}
                        <span data-dc-tpl="60" style={{"display":"flex","flexDirection":"column","gap":"2px","minWidth":"0"}}>
                          <span data-dc-tpl="61" style={{"fontSize":"13px","fontWeight":"700"}}>
                            {I(v1.o?.name)}
                          </span>
                          <span data-dc-tpl="62" style={{"fontSize":"11.5px","lineHeight":"1.35","color":"#9d998f","textWrap":"pretty"}}>
                            {I(v1.o?.desc)}
                          </span>
                        </span>
                        {"\n                "}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <button data-dc-tpl="63" onClick={v.openSave} style={{"height":"40px","padding":"0 20px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp5">
              {I(v.saveLabel)}
            </button>
            {"\n        "}
            <button data-dc-tpl="64" onClick={v.openExp} style={{"height":"40px","padding":"0 22px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}}>
              Eksporter
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </> : null}
        {"\n  "}
      </div>
      {"\n\n  "}
      {v.loading ? <>
        {"\n    "}
        <div data-dc-tpl="66" style={{"flex":"1","display":"flex","alignItems":"center","justifyContent":"center","color":"#6f6b64","fontSize":"11px","fontWeight":"600","letterSpacing":"0.3em"}}>
          LASTER …
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isHome ? <>
        {"\n    "}
        <main data-dc-tpl="68" style={{"flex":"1","width":"100%","maxWidth":"1040px","margin":"0 auto","padding":"8vh 28px 64px","display":"flex","flexDirection":"column","alignItems":"center","gap":"18px"}}>
          {"\n      "}
          <h1 data-dc-tpl="69" style={{"margin":"0","textAlign":"center","fontSize":"clamp(36px, 7.5vw, 96px)","fontWeight":"600","lineHeight":"1","letterSpacing":"0.08em","textTransform":"uppercase","fontStretch":"125%"}}>
            Thumbnail Studio
          </h1>
          {"\n      "}
          <p data-dc-tpl="70" style={{"margin":"0 0 30px","maxWidth":"560px","textAlign":"center","fontSize":"14px","lineHeight":"1.6","color":"#9d998f","textWrap":"pretty"}}>
            Miniatyrbilder til YouTube og appen i 16:9. Velg en kategori, bytt person og navn, og last ned i 1080p eller 4K.
          </p>
          {"\n      "}
          <div data-dc-tpl="71" style={{"width":"100%","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(270px, 1fr))","gap":"18px"}}>
            {"\n        "}
            {list(v.catCards).map(($it1, $i1) => {
              const v1 = { ...v, "c": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                {v1.notEditCats ? <>
                  {"\n            "}
                  <button data-dc-tpl="74" onClick={v1.c?.open} style={{"containerType":"inline-size","minWidth":"0","display":"flex","flexDirection":"column","alignItems":"stretch","gap":"12px","minHeight":"220px","padding":"28px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"rgba(12,12,12,0.55)","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp6">
                    {"\n              "}
                    <span data-dc-tpl="75" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
                      {I(v1.c?.count)}
                    </span>
                    {"\n              "}
                    <span data-dc-tpl="76" style={{"minWidth":"0","fontSize":"clamp(14px, 7cqi, 24px)","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","fontStretch":"118%","overflowWrap":"anywhere","hyphens":"auto"}} lang="no">
                      {I(v1.c?.name)}
                    </span>
                    {"\n              "}
                    <span data-dc-tpl="77" style={{"fontSize":"14px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
                      {I(v1.c?.desc)}
                    </span>
                    {"\n              "}
                    <span data-dc-tpl="78" style={{"marginTop":"auto","paddingTop":"12px","display":"flex"}}>
                      <span data-dc-tpl="79" style={{"display":"inline-flex","alignItems":"center","height":"40px","padding":"0 24px","border":"1px solid #f3f1ec","borderRadius":"999px","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase"}}>
                        Åpne
                      </span>
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </> : null}
                {"\n          "}
                {v1.editCats ? <>
                  {"\n            "}
                  <div data-dc-tpl="81" style={{"display":"flex","flexDirection":"column","gap":"10px","minHeight":"220px","padding":"22px","border":"1px dashed rgba(255,255,255,0.28)","borderRadius":"22px","background":"rgba(12,12,12,0.7)"}}>
                    {"\n              "}
                    <div data-dc-tpl="82" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                      {"\n                "}
                      <input data-dc-tpl="83" value={val(v1.c?.name)} onChange={v1.c?.onName} placeholder="Navn på kategori" aria-label="Navn på kategori" style={{"flex":"1","minWidth":"0","height":"42px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"10px","background":"rgba(0,0,0,0.5)","color":"#f3f1ec","font":"inherit","fontSize":"18px","fontWeight":"600","letterSpacing":"0.04em","textTransform":"uppercase","outline":"none"}} />
                      {"\n                "}
                      <button data-dc-tpl="84" onClick={v1.c?.onDel} title="Slett kategori" aria-label="Slett kategori" style={{"flexShrink":"0","width":"34px","height":"34px","padding":"0","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"18px","lineHeight":"1","cursor":"pointer"}} className="scp7">
                        ×
                      </button>
                      {"\n              "}
                    </div>
                    {"\n              "}
                    <textarea data-dc-tpl="85" value={val(v1.c?.desc)} onChange={v1.c?.onDesc} placeholder="Beskrivelse" aria-label="Beskrivelse" rows="3" style={{"padding":"10px 12px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"10px","background":"rgba(0,0,0,0.5)","color":"#b3afa6","font":"inherit","fontSize":"14px","lineHeight":"1.55","resize":"vertical","outline":"none"}} />
                    {"\n              "}
                    <label data-dc-tpl="86" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                "}
                      <span data-dc-tpl="87" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Grunnoppsett
                      </span>
                      {"\n                "}
                      <select data-dc-tpl="88" value={val(v1.c?.base)} onChange={v1.c?.onBase} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px"}}>
                        {"\n                  "}
                        {list(v1.baseOpts).map(($it2, $i2) => {
                          const v2 = { ...v1, "o": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            <option data-dc-tpl="90" value={val(v2.o?.v)}>
                              {I(v2.o?.label)}
                            </option>
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </select>
                      {"\n              "}
                    </label>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </> : null}
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n        "}
            {v.editCats ? <>
              <button data-dc-tpl="92" onClick={v.addCat} style={{"display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"8px","minHeight":"220px","padding":"28px","border":"1px dashed rgba(255,255,255,0.22)","borderRadius":"22px","background":"transparent","color":"#9d998f","font":"inherit","cursor":"pointer"}} className="scp8">
                {"\n          "}
                <span data-dc-tpl="93" style={{"fontSize":"28px","lineHeight":"1"}}>
                  +
                </span>
                {"\n          "}
                <span data-dc-tpl="94" style={{"fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase"}}>
                  Ny kategori
                </span>
                {"\n        "}
              </button>
            </> : null}
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="95" style={{"width":"100%","marginTop":"30px","paddingTop":"22px","borderTop":"1px solid #1f1f1f","display":"flex","flexWrap":"wrap","alignItems":"center","justifyContent":"space-between","gap":"14px"}}>
            {"\n        "}
            <span data-dc-tpl="96" style={{"display":"flex","flexDirection":"column","gap":"4px","maxWidth":"540px"}}>
              <span data-dc-tpl="97" style={{"fontSize":"13px","fontWeight":"700"}}>
                Sikkerhetskopi
              </span>
              <span data-dc-tpl="98" style={{"fontSize":"12.5px","lineHeight":"1.5","color":"#9d998f","textWrap":"pretty"}}>
                Malene lagres bare i denne nettleseren. Last ned en fil for å ta vare på dem, eller for å flytte dem til en annen maskin.
              </span>
            </span>
            {"\n        "}
            <div data-dc-tpl="99" style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
              {"\n          "}
              <button data-dc-tpl="100" onClick={v.doBackup} style={{"height":"38px","padding":"0 16px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
                {I(v.backupLabel)}
              </button>
              {"\n          "}
              <button data-dc-tpl="101" onClick={v.pickRestore} style={{"height":"38px","padding":"0 16px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
                Gjenopprett fra fil
              </button>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isCat ? <>
        {"\n    "}
        <main data-dc-tpl="103" style={{"flex":"1","width":"100%","maxWidth":"1180px","margin":"0 auto","padding":"6vh 28px 64px","display":"flex","flexDirection":"column","gap":"28px"}}>
          {"\n      "}
          <div data-dc-tpl="104" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
            {"\n        "}
            <span data-dc-tpl="105" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.3em","textTransform":"uppercase","color":"#9d998f"}}>
              {I(v.catCount)}
            </span>
            {"\n        "}
            <h1 data-dc-tpl="106" style={{"margin":"0","fontSize":"clamp(30px, 5vw, 60px)","fontWeight":"600","lineHeight":"1.05","letterSpacing":"0.06em","textTransform":"uppercase","fontStretch":"122%"}}>
              {I(v.catName)}
            </h1>
            {"\n        "}
            <p data-dc-tpl="107" style={{"margin":"0","maxWidth":"620px","fontSize":"14px","lineHeight":"1.6","color":"#b3afa6","textWrap":"pretty"}}>
              {I(v.catDesc)}
            </p>
            {"\n        "}
            <div data-dc-tpl="108" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"8px","paddingTop":"6px"}}>
              {"\n          "}
              <button data-dc-tpl="109" onClick={v.editBase} style={{"display":"inline-flex","alignItems":"center","gap":"10px","height":"38px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","cursor":"pointer"}} className="scp1">
                {"\n            "}
                <svg data-dc-tpl="110" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path data-dc-tpl="111" d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                </svg>
                {"\n            "}
                <span data-dc-tpl="112">
                  Rediger grunnoppsett
                </span>
                {"\n          "}
              </button>
              {"\n          "}
              {v.hasCustomBase ? <>
                <button data-dc-tpl="114" onClick={v.resetBase} style={{"height":"38px","padding":"0 16px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","textDecoration":"underline","textUnderlineOffset":"3px","cursor":"pointer"}} className="scp9">
                  Tilbakestill til standard
                </button>
              </> : null}
              {"\n          "}
              <span data-dc-tpl="115" style={{"fontSize":"12px","color":"#6f6b64"}}>
                {I(v.baseSub)}
              </span>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="116" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(220px, 1fr))","gap":"14px 22px","padding":"16px 18px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"14px"}}>
            {"\n        "}
            <div data-dc-tpl="117" style={{"display":"flex","alignItems":"flex-start","gap":"10px","minWidth":"0"}}>
              <span data-dc-tpl="118" style={{"flex":"0 0 24px","height":"24px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","fontSize":"11.5px","fontWeight":"700"}}>
                1
              </span>
              <span data-dc-tpl="119" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                Trykk «Ny mal» og velg et oppsett.
              </span>
            </div>
            {"\n        "}
            <div data-dc-tpl="120" style={{"display":"flex","alignItems":"flex-start","gap":"10px","minWidth":"0"}}>
              <span data-dc-tpl="121" style={{"flex":"0 0 24px","height":"24px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","fontSize":"11.5px","fontWeight":"700"}}>
                2
              </span>
              <span data-dc-tpl="122" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                Bytt person, navn og tema i panelet til høyre.
              </span>
            </div>
            {"\n        "}
            <div data-dc-tpl="123" style={{"display":"flex","alignItems":"flex-start","gap":"10px","minWidth":"0"}}>
              <span data-dc-tpl="124" style={{"flex":"0 0 24px","height":"24px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","fontSize":"11.5px","fontWeight":"700"}}>
                3
              </span>
              <span data-dc-tpl="125" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                Lagre malen, og last ned i 1080p eller 4K.
              </span>
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="126" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(300px, 1fr))","gap":"18px"}}>
            {"\n          "}
            <button data-dc-tpl="127" onClick={v.newFromBase} style={{"display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"10px","minHeight":"240px","padding":"28px","border":"1px dashed rgba(255,255,255,0.3)","borderRadius":"18px","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer"}} className="scpa">
              {"\n            "}
              <span data-dc-tpl="128" style={{"fontSize":"34px","fontWeight":"300","lineHeight":"1"}}>
                +
              </span>
              {"\n            "}
              <span data-dc-tpl="129" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase"}}>
                Ny mal
              </span>
              {"\n            "}
              <span data-dc-tpl="130" style={{"fontSize":"12px","color":"#9d998f"}}>
                {I(v.newSub)}
              </span>
              {"\n          "}
            </button>
            {"\n        "}
            {list(v.tplCards).map(($it1, $i1) => {
              const v1 = { ...v, "t": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <div data-dc-tpl="132" style={{"display":"flex","flexDirection":"column","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"18px","background":"rgba(12,12,12,0.55)","overflow":"hidden"}}>
                  {"\n            "}
                  <button data-dc-tpl="133" onClick={v1.t?.open} data-keep-color="1" style={{"position":"relative","width":"100%","aspectRatio":"16 / 9","padding":"0","border":"0","background":"#111","cursor":"pointer"}}>
                    {"\n              "}
                    <img data-dc-tpl="134" src={v1.t?.thumb} alt="" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"cover","display":"block"}} />
                    {"\n            "}
                  </button>
                  {"\n            "}
                  <div data-dc-tpl="135" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"12px 12px 12px 16px"}}>
                    {"\n              "}
                    <span data-dc-tpl="136" style={{"minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
                      <span data-dc-tpl="137" data-no-i18n="1" style={{"fontSize":"14px","fontWeight":"700","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v1.t?.name)}
                      </span>
                      <span data-dc-tpl="138" style={{"fontSize":"12px","color":"#9d998f"}}>
                        {I(v1.t?.date)}
                      </span>
                    </span>
                    {"\n              "}
                    <div data-dc-tpl="139" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                      {"\n                "}
                      <button data-dc-tpl="140" onClick={v1.t?.open} style={{"height":"32px","padding":"0 14px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12px","fontWeight":"700","cursor":"pointer"}}>
                        Rediger
                      </button>
                      {"\n                "}
                      <button data-dc-tpl="141" onClick={v1.t?.dup} disabled={v1.t?.dupDis} style={css(`height:32px; padding:0 14px; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer; opacity:${v1.t?.dupOp ?? ""};`, "height:32px; padding:0 14px; border:1px solid rgba(255,255,255,0.18); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; cursor:pointer; opacity:{{ t.dupOp }};")} className="scp1">
                        Dupliser
                      </button>
                      {"\n                "}
                      <button data-dc-tpl="142" onClick={v1.t?.del} style={{"height":"32px","padding":"0 14px","marginLeft":"auto","border":"1px solid rgba(255,120,120,0.45)","borderRadius":"999px","background":"transparent","color":"#ff8f8f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpb">
                        Slett
                      </button>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </div>
                  {"\n          "}
                </div>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n      "}
          </div>
          {"\n      "}
          {v.catFull ? <>
            <span data-dc-tpl="144" style={{"fontSize":"13px","color":"#9d998f"}}>
              Kategorien har 5 maler, som er maks. Slett eller overskriv en for å lagre en ny.
            </span>
          </> : null}
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.isEdit ? <>
        {"\n    "}
        <main data-dc-tpl="146" data-ml-bg="static" style={{"flex":"1","width":"100%","maxWidth":"1680px","margin":"0 auto","padding":"18px 20px 40px","display":"flex","flexWrap":"wrap","alignItems":"stretch","gap":"18px"}}>
          {"\n      "}
          {list(v.layCols).map(($it1, $i1) => {
            const v1 = { ...v, "col": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n      "}
              <div data-dc-tpl="148" style={css(`flex:${v1.col?.flex ?? ""}; min-width:${v1.col?.min ?? ""}; display:flex; flex-direction:column; gap:14px;`, "flex:{{ col.flex }}; min-width:{{ col.min }}; display:flex; flex-direction:column; gap:14px;")}>
                {"\n        "}
                {v1.col?.hasTabs ? <>
                  {"\n          "}
                  <div data-dc-tpl="150" role="tablist" style={{"order":"-1","display":"flex","gap":"4px","padding":"3px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"12px","background":"rgba(12,12,12,0.55)"}}>
                    {"\n            "}
                    {list(v1.col?.tabs).map(($it2, $i2) => {
                      const v2 = { ...v1, "t": $it2, $index: $i2 };
                      return <React.Fragment key={$i2}>
                        {"\n              "}
                        <button data-dc-tpl="152" role="tab" aria-selected={v2.t?.sel} onClick={v2.t?.onClick} style={css(`flex:1; min-width:0; height:32px; padding:0 6px; border:0; border-radius:9px; background:${v2.t?.bg ?? ""}; color:${v2.t?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;`, "flex:1; min-width:0; height:32px; padding:0 6px; border:0; border-radius:9px; background:{{ t.bg }}; color:{{ t.color }}; font:inherit; font-size:12.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;")}>
                          {I(v2.t?.label)}
                        </button>
                        {"\n            "}
                      </React.Fragment>;
                    })}
                    {"\n          "}
                  </div>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v1.col?.showAdd ? <>
                  {"\n        "}
                  <div data-dc-tpl="154" style={css(`order:${v1.col?.oAdd ?? ""}; display:flex; flex-direction:column; gap:14px; padding:16px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);`, "order:{{ col.oAdd }}; display:flex; flex-direction:column; gap:14px; padding:16px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);")}>
                    {"\n        "}
                    <button data-dc-tpl="155" onClick={v1.openLayouts} style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","height":"40px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"12px","background":"rgba(255,255,255,0.06)","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scpc">
                      {"\n          "}
                      <svg data-dc-tpl="156" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect data-dc-tpl="157" x="3" y="3" width="7" height="7" rx="1" />
                        <rect data-dc-tpl="158" x="14" y="3" width="7" height="7" rx="1" />
                        <rect data-dc-tpl="159" x="3" y="14" width="7" height="7" rx="1" />
                        <rect data-dc-tpl="160" x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                      {"\n          "}
                      <span data-dc-tpl="161">
                        Bytt oppsett
                      </span>
                      {"\n        "}
                    </button>
                    {"\n        "}
                    <span data-dc-tpl="162" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Legg til
                    </span>
                    {"\n        "}
                    <div data-dc-tpl="163" style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"6px"}}>
                      {"\n          "}
                      {list(v1.addBtns).map(($it2, $i2) => {
                        const v2 = { ...v1, "b": $it2, $index: $i2 };
                        return <React.Fragment key={$i2}>
                          {"\n            "}
                          <button data-dc-tpl="165" onClick={v2.b?.onClick} draggable="true" onDragStart={v2.b?.onDragStart} onDragEnd={v2.b?.onDragEnd} title="Klikk for å legge til, eller dra over et lag for å koble det til" style={{"height":"36px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.18)","borderRadius":"10px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scpd">
                            {I(v2.b?.label)}
                          </button>
                          {"\n          "}
                        </React.Fragment>;
                      })}
                      {"\n        "}
                    </div>
                    {"\n        "}
                    {v1.logoOpen ? <>
                      {"\n          "}
                      <div data-dc-tpl="167" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"8px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#000"}}>
                        {"\n            "}
                        {list(v1.logoOpts).map(($it2, $i2) => {
                          const v2 = { ...v1, "o": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            {"\n              "}
                            <button data-dc-tpl="169" onClick={v2.o?.onClick} style={{"minHeight":"34px","padding":"6px 10px","border":"0","borderRadius":"8px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","textAlign":"left","cursor":"pointer"}} className="scpe">
                              {I(v2.o?.label)}
                            </button>
                            {"\n            "}
                          </React.Fragment>;
                        })}
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </> : null}
                    {"\n        "}
                    {v1.libOpen ? <>
                      {"\n          "}
                      <div data-dc-tpl="171" style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"10px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#000"}}>
                        {"\n            "}
                        {list(v1.libGroups).map(($it2, $i2) => {
                          const v2 = { ...v1, "g": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            {"\n              "}
                            <div data-dc-tpl="173" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                              {"\n                "}
                              <span data-dc-tpl="174" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","color":"#8a867e"}}>
                                {I(v2.g?.title)}
                              </span>
                              {"\n                "}
                              <div data-dc-tpl="175" style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"6px"}}>
                                {"\n                  "}
                                {list(v2.g?.items).map(($it3, $i3) => {
                                  const v3 = { ...v2, "o": $it3, $index: $i3 };
                                  return <React.Fragment key={$i3}>
                                    {"\n                    "}
                                    <button data-dc-tpl="177" onClick={v3.o?.onClick} style={{"minHeight":"34px","padding":"6px 8px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"8px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","lineHeight":"1.25","textAlign":"left","cursor":"pointer"}} className="scpe">
                                      {I(v3.o?.label)}
                                    </button>
                                    {"\n                  "}
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
                        <div data-dc-tpl="178" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n              "}
                          <span data-dc-tpl="179" style={{"fontSize":"11px","fontWeight":"600","color":"#8a867e"}}>
                            Farge på nye elementer
                          </span>
                          {"\n              "}
                          <div data-dc-tpl="180" data-keep-color="1" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                            {"\n                "}
                            {list(v1.addSw).map(($it2, $i2) => {
                              const v2 = { ...v1, "s": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <button data-dc-tpl="182" onClick={v2.s?.onClick} title={v2.s?.bg} aria-label={v2.s?.bg} style={css(`width:22px; height:22px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:${v2.s?.bg ?? ""}; box-shadow:${v2.s?.ring ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:{{ s.bg }}; box-shadow:{{ s.ring }}; cursor:pointer;")} />
                              </React.Fragment>;
                            })}
                            {"\n                "}
                            <label data-dc-tpl="183" title="Egen farge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:${v1.addRingCustom ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:{{ addRingCustom }}; overflow:hidden; cursor:pointer;")}>
                              <input data-dc-tpl="184" type="color" value={val(v1.addHex)} onChange={v1.onAddPick} aria-label="Egen farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","border":"0","padding":"0","cursor":"pointer"}} />
                            </label>
                            {"\n              "}
                          </div>
                          {"\n            "}
                        </div>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </> : null}
                    {"\n        "}
                    {v1.shapeOpen ? <>
                      {"\n          "}
                      <div data-dc-tpl="186" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"10px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#000"}}>
                        {"\n            "}
                        <div data-dc-tpl="187" style={{"display":"grid","gridTemplateColumns":"repeat(2, minmax(0, 1fr))","gap":"6px"}}>
                          {"\n              "}
                          {list(v1.shapeOpts).map(($it2, $i2) => {
                            const v2 = { ...v1, "o": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              {"\n                "}
                              <button data-dc-tpl="189" onClick={v2.o?.onClick} style={{"display":"flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"8px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpe">
                                <span data-dc-tpl="190" data-keep-color="1" style={css(`flex:0 0 auto; width:${v2.o?.iw ?? ""}; height:${v2.o?.ih ?? ""}; border-radius:${v2.o?.ir ?? ""}; background:${v2.o?.color ?? ""};`, "flex:0 0 auto; width:{{ o.iw }}; height:{{ o.ih }}; border-radius:{{ o.ir }}; background:{{ o.color }};")} />
                                <span data-dc-tpl="191">
                                  {I(v2.o?.label)}
                                </span>
                              </button>
                              {"\n              "}
                            </React.Fragment>;
                          })}
                          {"\n            "}
                        </div>
                        {"\n            "}
                        <div data-dc-tpl="192" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n              "}
                          <span data-dc-tpl="193" style={{"fontSize":"11px","fontWeight":"600","color":"#8a867e"}}>
                            Farge
                          </span>
                          {"\n              "}
                          <div data-dc-tpl="194" data-keep-color="1" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                            {"\n                "}
                            {list(v1.addSw).map(($it2, $i2) => {
                              const v2 = { ...v1, "s": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <button data-dc-tpl="196" onClick={v2.s?.onClick} title={v2.s?.bg} aria-label={v2.s?.bg} style={css(`width:22px; height:22px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:${v2.s?.bg ?? ""}; box-shadow:${v2.s?.ring ?? ""}; cursor:pointer;`, "width:22px; height:22px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:{{ s.bg }}; box-shadow:{{ s.ring }}; cursor:pointer;")} />
                              </React.Fragment>;
                            })}
                            {"\n                "}
                            <label data-dc-tpl="197" title="Egen farge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:${v1.addRingCustom ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:{{ addRingCustom }}; overflow:hidden; cursor:pointer;")}>
                              <input data-dc-tpl="198" type="color" value={val(v1.addHex)} onChange={v1.onAddPick} aria-label="Egen farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","border":"0","padding":"0","cursor":"pointer"}} />
                            </label>
                            {"\n              "}
                          </div>
                          {"\n            "}
                        </div>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </> : null}
                    {"\n        "}
                  </div>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v1.col?.showLayers ? <>
                  {"\n        "}
                  <div data-dc-tpl="200" style={css(`order:${v1.col?.oLayers ?? ""}; display:flex; flex-direction:column; gap:14px; padding:16px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);`, "order:{{ col.oLayers }}; display:flex; flex-direction:column; gap:14px; padding:16px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);")}>
                    {"\n        "}
                    <span data-dc-tpl="201" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span data-dc-tpl="202" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Lag
                      </span>
                      <span data-dc-tpl="203" style={{"fontSize":"11.5px","lineHeight":"1.45","color":"#6f6b64","textWrap":"pretty"}}>
                        Øverst i listen ligger øverst i bildet. ↺ flytter laget tilbake til grunnoppsettet. Dra et lag eller en knapp fra «Legg til» over et annet lag for å koble dem sammen.
                      </span>
                    </span>
                    {"\n        "}
                    <div data-dc-tpl="204" style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                      {"\n          "}
                      {list(v1.layerRows).map(($it2, $i2) => {
                        const v2 = { ...v1, "r": $it2, $index: $i2 };
                        return <React.Fragment key={$i2}>
                          {"\n            "}
                          {v2.r?.isChild ? <>
                            {"\n              "}
                            <div data-dc-tpl="207" onClick={v2.r?.onClick} style={css(`display:flex; align-items:center; gap:6px; min-height:32px; margin-left:18px; padding:3px 4px 3px 8px; border:1px solid ${v2.r?.border ?? ""}; border-radius:10px; background:${v2.r?.bg ?? ""}; cursor:pointer; opacity:${v2.r?.op ?? ""};`, "display:flex; align-items:center; gap:6px; min-height:32px; margin-left:18px; padding:3px 4px 3px 8px; border:1px solid {{ r.border }}; border-radius:10px; background:{{ r.bg }}; cursor:pointer; opacity:{{ r.op }};")} className="scp4">
                              {"\n                "}
                              <span data-dc-tpl="208" style={{"flex":"0 0 auto","fontSize":"12px","color":"#6f6b64"}}>
                                ↳
                              </span>
                              {"\n                "}
                              <span data-dc-tpl="209" data-keep-color="1" style={css(`flex:0 0 18px; height:4px; border-radius:2px; background:${v2.r?.swatch ?? ""};`, "flex:0 0 18px; height:4px; border-radius:2px; background:{{ r.swatch }};")} />
                              {"\n                "}
                              <span data-dc-tpl="210" style={{"flex":"1","minWidth":"0","fontSize":"12px","fontWeight":"600","color":"#b3afa6","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                                Understrek
                              </span>
                              {"\n                "}
                              <span data-dc-tpl="211" title="Følger teksten når den flyttes" style={{"flex":"0 0 auto","fontSize":"9.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","color":"#6f6b64"}}>
                                Koblet
                              </span>
                              {"\n                "}
                              <button data-dc-tpl="212" onClick={v2.r?.onDel} title="Fjern understrek" aria-label="Fjern understrek" style={{"flex":"0 0 26px","width":"26px","height":"26px","padding":"0","border":"0","borderRadius":"8px","background":"transparent","color":"#b3afa6","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpf">
                                {"\n                  "}
                                <svg data-dc-tpl="213" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                                  <path data-dc-tpl="214" d="M6 6l12 12M18 6L6 18" />
                                </svg>
                                {"\n                "}
                              </button>
                              {"\n              "}
                            </div>
                            {"\n            "}
                          </> : null}
                          {"\n            "}
                          {v2.r?.isMain ? <>
                            {"\n            "}
                            <div data-dc-tpl="216" onClick={v2.r?.onClick} draggable="true" onDragStart={v2.r?.onDragStart} onDragEnd={v2.r?.onDragEnd} onDragOver={v2.r?.onDragOver} onDragLeave={v2.r?.onDragLeave} onDrop={v2.r?.onDrop} style={css(`display:flex; align-items:center; gap:4px; min-height:36px; margin-left:${v2.r?.indent ?? ""}; padding:4px 4px 4px 8px; border:1px solid ${v2.r?.border ?? ""}; border-radius:10px; background:${v2.r?.bg ?? ""}; cursor:pointer; opacity:${v2.r?.op ?? ""};`, "display:flex; align-items:center; gap:4px; min-height:36px; margin-left:{{ r.indent }}; padding:4px 4px 4px 8px; border:1px solid {{ r.border }}; border-radius:10px; background:{{ r.bg }}; cursor:pointer; opacity:{{ r.op }};")} className="scp4">
                              {"\n              "}
                              <span data-dc-tpl="217" style={{"flex":"0 0 36px","fontSize":"9.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","color":"#8a867e"}}>
                                {I(v2.r?.tag)}
                              </span>
                              {"\n              "}
                              <span data-dc-tpl="218" data-no-i18n="1" style={{"flex":"1","minWidth":"0","fontSize":"12.5px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                                {I(v2.r?.label)}
                              </span>
                              {"\n              "}
                              {v2.r?.isLinked ? <>
                                <button data-dc-tpl="220" onClick={v2.r?.onUnlink} title="Koble fra laget" aria-label="Koble fra laget" style={{"flex":"0 0 auto","display":"inline-flex","alignItems":"center","gap":"4px","height":"22px","padding":"0 7px","border":"1px solid rgba(77,163,255,0.5)","borderRadius":"999px","background":"transparent","color":"#8cc4ff","font":"inherit","fontSize":"9.5px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase","cursor":"pointer"}} className="scpg">
                                  <svg data-dc-tpl="221" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                    <path data-dc-tpl="222" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
                                    <path data-dc-tpl="223" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
                                  </svg>
                                  <span data-dc-tpl="224">
                                    Koblet
                                  </span>
                                </button>
                              </> : null}
                              {"\n              "}
                              {v2.r?.hasBase ? <>
                                <button data-dc-tpl="226" onClick={v2.r?.onReset} disabled={v2.r?.resetDis} title={v2.r?.resetTitle} aria-label={v2.r?.resetTitle} style={css(`flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:${v2.r?.resetColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:{{ r.resetColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scph">
                                  {"\n                "}
                                  <svg data-dc-tpl="227" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path data-dc-tpl="228" d="M3 12a9 9 0 1 0 3-6.7" />
                                    <path data-dc-tpl="229" d="M3 4v5h5" />
                                  </svg>
                                  {"\n              "}
                                </button>
                              </> : null}
                              {"\n              "}
                              <button data-dc-tpl="230" onClick={v2.r?.onEye} title={v2.r?.eyeTitle} aria-label={v2.r?.eyeTitle} style={css(`flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:${v2.r?.eyeColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:{{ r.eyeColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scph">
                                {"\n                "}
                                <svg data-dc-tpl="231" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <path data-dc-tpl="232" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                  <circle data-dc-tpl="233" cx="12" cy="12" r="3" />
                                </svg>
                                {"\n              "}
                              </button>
                              {"\n              "}
                              <button data-dc-tpl="234" onClick={v2.r?.onLock} title={v2.r?.lockTitle} aria-label={v2.r?.lockTitle} style={css(`flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:${v2.r?.lockColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex:0 0 26px; width:26px; height:26px; padding:0; border:0; border-radius:8px; background:transparent; color:{{ r.lockColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scph">
                                {"\n                "}
                                <svg data-dc-tpl="235" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <rect data-dc-tpl="236" x="4" y="11" width="16" height="10" rx="2" />
                                  <path data-dc-tpl="237" d="M8 11V7a4 4 0 0 1 8 0v4" />
                                </svg>
                                {"\n              "}
                              </button>
                              {"\n              "}
                              <button data-dc-tpl="238" onClick={v2.r?.onDel} title="Fjern laget" aria-label="Fjern laget" style={{"flex":"0 0 26px","width":"26px","height":"26px","padding":"0","border":"0","borderRadius":"8px","background":"transparent","color":"#8a867e","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpi">
                                {"\n                "}
                                <svg data-dc-tpl="239" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                                  <path data-dc-tpl="240" d="M6 6l12 12M18 6L6 18" />
                                </svg>
                                {"\n              "}
                              </button>
                              {"\n            "}
                            </div>
                            {"\n            "}
                          </> : null}
                          {"\n          "}
                        </React.Fragment>;
                      })}
                      {"\n          "}
                      <div data-dc-tpl="241" onClick={v1.selBg} style={css(`display:flex; align-items:center; gap:8px; min-height:36px; padding:4px 10px; border:1px solid ${v1.bgRowBorder ?? ""}; border-radius:10px; background:${v1.bgRowBg ?? ""}; cursor:pointer;`, "display:flex; align-items:center; gap:8px; min-height:36px; padding:4px 10px; border:1px solid {{ bgRowBorder }}; border-radius:10px; background:{{ bgRowBg }}; cursor:pointer;")} className="scp4">
                        {"\n            "}
                        <span data-dc-tpl="242" style={{"flex":"0 0 42px","fontSize":"10px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","color":"#8a867e"}}>
                          Bunn
                        </span>
                        {"\n            "}
                        <span data-dc-tpl="243" style={{"flex":"1","fontSize":"12.5px","fontWeight":"600"}}>
                          Bakgrunn og vignett
                        </span>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </div>
                    {"\n        "}
                  </div>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v1.col?.showCanvas ? <>
                  {"\n      "}
                  <section data-dc-tpl="245" style={css(`order:${v1.col?.oCanvas ?? ""}; min-width:0; display:flex; flex-direction:column; gap:10px;`, "order:{{ col.oCanvas }}; min-width:0; display:flex; flex-direction:column; gap:10px;")}>
                    {"\n        "}
                    {v1.narrow ? <>
                      {"\n          "}
                      <div data-dc-tpl="247" style={{"display":"flex","flexDirection":"column","gap":"4px","padding":"12px 16px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"12px","background":"rgba(255,255,255,0.04)"}}>
                        {"\n            "}
                        <span data-dc-tpl="248" style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                          Enkel visning på mobil
                        </span>
                        {"\n            "}
                        <span data-dc-tpl="249" style={{"fontSize":"12.5px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                          Her kan du bytte person, navn, tema og bakgrunn, og laste ned. Vil du flytte eller endre enkeltlag, åpner du malen på en PC.
                        </span>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </> : null}
                    {"\n        "}
                    {v1.baseEdit ? <>
                      {"\n          "}
                      <div data-dc-tpl="251" style={{"display":"flex","flexDirection":"column","gap":"4px","padding":"12px 16px","border":"1px solid rgba(245,184,0,0.45)","borderRadius":"12px","background":"rgba(245,184,0,0.08)"}}>
                        {"\n            "}
                        <span data-dc-tpl="252" style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                          Du redigerer grunnoppsettet
                        </span>
                        {"\n            "}
                        <span data-dc-tpl="253" style={{"fontSize":"12.5px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                          Det du lagrer her, blir startpunktet for alle nye maler i kategorien: farger, bakgrunn, fonter og plassering. Maler du allerede har lagret, endres ikke.
                        </span>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </> : null}
                    {"\n        "}
                    <div data-dc-tpl="254" style={{"position":"relative","width":"100%"}}>
                      {"\n        "}
                      <div data-dc-tpl="255" ref={v1.zoomRef} data-keep-color="1" style={css(`position:relative; width:100%; aspect-ratio:16 / 9; overflow:${v1.zoomOv ?? ""}; border-radius:8px; background:#111; box-shadow:0 0 0 1px rgba(255,255,255,0.14);`, "position:relative; width:100%; aspect-ratio:16 / 9; overflow:{{ zoomOv }}; border-radius:8px; background:#111; box-shadow:0 0 0 1px rgba(255,255,255,0.14);")}>
                        {"\n        "}
                        <div data-dc-tpl="256" data-keep-color="1" onDragOver={v1.onDragOver} onDrop={v1.onDrop} style={css(`position:relative; width:${v1.zoomW ?? ""}; aspect-ratio:16 / 9; border-radius:8px; background:#111;`, "position:relative; width:{{ zoomW }}; aspect-ratio:16 / 9; border-radius:8px; background:#111;")}>
                          {"\n          "}
                          <canvas data-dc-tpl="257" ref={v1.canvasRef} width="1920" height="1080" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","display":"block","borderRadius":"8px"}} />
                          {"\n          "}
                          <div data-dc-tpl="258" ref={v1.ovRef} onPointerDown={v1.onDown} onDoubleClick={v1.onDbl} onContextMenu={v1.onCtx} style={{"position":"absolute","inset":"0","touchAction":"none","userSelect":"none"}}>
                            {"\n            "}
                            {list(v1.guideV).map(($it2, $i2) => {
                              const v2 = { ...v1, "g": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <div data-dc-tpl="260" style={css(`position:absolute; left:${v2.g?.pos ?? ""}; top:0; bottom:0; width:1px; margin-left:-0.5px; background:#ff3fa4; pointer-events:none;`, "position:absolute; left:{{ g.pos }}; top:0; bottom:0; width:1px; margin-left:-0.5px; background:#ff3fa4; pointer-events:none;")} />
                              </React.Fragment>;
                            })}
                            {"\n            "}
                            {list(v1.guideH).map(($it2, $i2) => {
                              const v2 = { ...v1, "g": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <div data-dc-tpl="262" style={css(`position:absolute; top:${v2.g?.pos ?? ""}; left:0; right:0; height:1px; margin-top:-0.5px; background:#ff3fa4; pointer-events:none;`, "position:absolute; top:{{ g.pos }}; left:0; right:0; height:1px; margin-top:-0.5px; background:#ff3fa4; pointer-events:none;")} />
                              </React.Fragment>;
                            })}
                            {"\n            "}
                            {list(v1.groupBoxes).map(($it2, $i2) => {
                              const v2 = { ...v1, "b": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <div data-dc-tpl="264" style={css(`position:absolute; left:${v2.b?.l ?? ""}; top:${v2.b?.t ?? ""}; width:${v2.b?.w ?? ""}; height:${v2.b?.h ?? ""}; transform:rotate(${v2.b?.r ?? ""}); outline:1px solid rgba(77,163,255,0.8); pointer-events:none;`, "position:absolute; left:{{ b.l }}; top:{{ b.t }}; width:{{ b.w }}; height:{{ b.h }}; transform:rotate({{ b.r }}); outline:1px solid rgba(77,163,255,0.8); pointer-events:none;")} />
                              </React.Fragment>;
                            })}
                            {"\n            "}
                            {v1.isGroup ? <>
                              <div data-dc-tpl="266" style={css(`position:absolute; left:${v1.gbL ?? ""}; top:${v1.gbT ?? ""}; width:${v1.gbW ?? ""}; height:${v1.gbH ?? ""}; outline:2px dashed #4da3ff; outline-offset:4px; pointer-events:none;`, "position:absolute; left:{{ gbL }}; top:{{ gbT }}; width:{{ gbW }}; height:{{ gbH }}; outline:2px dashed #4da3ff; outline-offset:4px; pointer-events:none;")} />
                            </> : null}
                            {"\n            "}
                            {v1.hasSel ? <>
                              {"\n              "}
                              <div data-dc-tpl="268" style={css(`position:absolute; left:${v1.selL ?? ""}; top:${v1.selT ?? ""}; width:${v1.selW ?? ""}; height:${v1.selH ?? ""}; transform:rotate(${v1.selR ?? ""}); outline:2px solid #4da3ff; outline-offset:0; pointer-events:none;`, "position:absolute; left:{{ selL }}; top:{{ selT }}; width:{{ selW }}; height:{{ selH }}; transform:rotate({{ selR }}); outline:2px solid #4da3ff; outline-offset:0; pointer-events:none;")}>
                                {"\n                "}
                                {v1.selMovable ? <>
                                  {"\n                  "}
                                  <div data-dc-tpl="270" data-h="tl" onPointerDown={v1.onHandle} style={{"position":"absolute","left":"-8px","top":"-8px","width":"16px","height":"16px","borderRadius":"4px","background":"#ffffff","border":"2px solid #4da3ff","pointerEvents":"auto","cursor":"nwse-resize"}} />
                                  {"\n                  "}
                                  <div data-dc-tpl="271" data-h="tr" onPointerDown={v1.onHandle} style={{"position":"absolute","right":"-8px","top":"-8px","width":"16px","height":"16px","borderRadius":"4px","background":"#ffffff","border":"2px solid #4da3ff","pointerEvents":"auto","cursor":"nesw-resize"}} />
                                  {"\n                  "}
                                  <div data-dc-tpl="272" data-h="bl" onPointerDown={v1.onHandle} style={{"position":"absolute","left":"-8px","bottom":"-8px","width":"16px","height":"16px","borderRadius":"4px","background":"#ffffff","border":"2px solid #4da3ff","pointerEvents":"auto","cursor":"nesw-resize"}} />
                                  {"\n                  "}
                                  <div data-dc-tpl="273" data-h="br" onPointerDown={v1.onHandle} style={{"position":"absolute","right":"-8px","bottom":"-8px","width":"16px","height":"16px","borderRadius":"4px","background":"#ffffff","border":"2px solid #4da3ff","pointerEvents":"auto","cursor":"nwse-resize"}} />
                                  {"\n                "}
                                </> : null}
                                {"\n              "}
                              </div>
                              {"\n            "}
                            </> : null}
                            {"\n          "}
                          </div>
                          {"\n          "}
                          {v1.busyImg ? <>
                            {"\n            "}
                            <div data-dc-tpl="275" style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","borderRadius":"8px","background":"rgba(0,0,0,0.5)","fontSize":"14px","fontWeight":"600","pointerEvents":"none"}}>
                              Leser bildet …
                            </div>
                            {"\n          "}
                          </> : null}
                          {"\n        "}
                        </div>
                        {"\n        "}
                      </div>
                      {"\n          "}
                      <div data-dc-tpl="276" data-keep-color="1" style={{"position":"absolute","top":"10px","right":"10px","zIndex":"3","display":"flex","alignItems":"center","gap":"2px","padding":"3px","borderRadius":"999px","background":"rgba(0,0,0,0.72)","boxShadow":"0 0 0 1px rgba(255,255,255,0.18)","backdropFilter":"blur(6px)"}}>
                        {"\n            "}
                        <button data-dc-tpl="277" onClick={v1.zoomOut} disabled={v1.zoomOutDis} title="Zoom ut" aria-label="Zoom ut" style={css(`width:30px; height:30px; padding:0; border:0; border-radius:999px; background:transparent; color:#ffffff; opacity:${v1.zoomOutOp ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "width:30px; height:30px; padding:0; border:0; border-radius:999px; background:transparent; color:#ffffff; opacity:{{ zoomOutOp }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scpj">
                          <svg data-dc-tpl="278" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                            <path data-dc-tpl="279" d="M5 12h14" />
                          </svg>
                        </button>
                        {"\n            "}
                        <span data-dc-tpl="280" style={{"minWidth":"48px","textAlign":"center","fontSize":"12px","fontWeight":"700","color":"#ffffff","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.zoomLabel)}
                        </span>
                        {"\n            "}
                        <button data-dc-tpl="281" onClick={v1.zoomIn} disabled={v1.zoomInDis} title="Zoom inn" aria-label="Zoom inn" style={css(`width:30px; height:30px; padding:0; border:0; border-radius:999px; background:transparent; color:#ffffff; opacity:${v1.zoomInOp ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "width:30px; height:30px; padding:0; border:0; border-radius:999px; background:transparent; color:#ffffff; opacity:{{ zoomInOp }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scpj">
                          <svg data-dc-tpl="282" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                            <path data-dc-tpl="283" d="M5 12h14M12 5v14" />
                          </svg>
                        </button>
                        {"\n          "}
                      </div>
                      {"\n        "}
                    </div>
                    {"\n        "}
                    <div data-dc-tpl="284" style={{"display":"flex","justifyContent":"flex-end","gap":"8px"}}>
                      {"\n          "}
                      <button data-dc-tpl="285" onClick={v1.zoomReset} disabled={v1.zoomResetDis} title="Tilbake til standard zoom (100 %)" style={css(`display:inline-flex; align-items:center; gap:7px; height:30px; padding:0 12px; border:1px solid rgba(255,255,255,0.16); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; opacity:${v1.zoomResetOp ?? ""}; cursor:pointer;`, "display:inline-flex; align-items:center; gap:7px; height:30px; padding:0 12px; border:1px solid rgba(255,255,255,0.16); border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; font-weight:600; opacity:{{ zoomResetOp }}; cursor:pointer;")} className="scpe">
                        <svg data-dc-tpl="286" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path data-dc-tpl="287" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                        </svg>
                        <span data-dc-tpl="288">
                          Standard zoom
                        </span>
                      </button>
                      {"\n        "}
                    </div>
                    {"\n        "}
                    {v1.notNarrow ? <>
                      <div data-dc-tpl="290" style={{"display":"flex","flexWrap":"wrap","gap":"6px","padding":"0 2px"}}>
                        {"\n          "}
                        <span data-dc-tpl="291" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Klikk: velg et lag
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="292" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Dobbeltklikk på et bilde: beskjær
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="293" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Shift-klikk: velg flere lag, og flytt eller skaler dem sammen
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="294" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Dra: flytt (hold Alt for å slå av hjelpelinjer)
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="295" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Hjørner: endre størrelse (Shift endrer forholdet)
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="296" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Piltaster: finjuster (Shift = 10 px)
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="297" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Delete: slett · ⌘D: dupliser · ⌘Z: angre
                        </span>
                        {"\n          "}
                        <span data-dc-tpl="298" style={{"display":"inline-flex","alignItems":"center","minHeight":"26px","padding":"3px 10px","border":"1px solid rgba(255,255,255,0.1)","borderRadius":"999px","fontSize":"11.5px","lineHeight":"1.4","color":"#9d998f"}}>
                          Slipp et bilde her for å legge det til
                        </span>
                        {"\n        "}
                      </div>
                    </> : null}
                    {"\n      "}
                  </section>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v1.col?.showProps ? <>
                  {"\n      "}
                  <aside data-dc-tpl="300" style={css(`order:${v1.col?.oProps ?? ""}; min-width:0; max-height:calc(100dvh - 110px); overflow:auto; position:sticky; top:12px; display:flex; flex-direction:column; gap:12px; padding:18px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);`, "order:{{ col.oProps }}; min-width:0; max-height:calc(100dvh - 110px); overflow:auto; position:sticky; top:12px; display:flex; flex-direction:column; gap:12px; padding:18px; border:1px solid rgba(255,255,255,0.12); border-radius:18px; background:rgba(12,12,12,0.55);")}>
                    {"\n        "}
                    <div data-dc-tpl="301" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                      {"\n          "}
                      <span data-dc-tpl="302" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                        {I(v1.panelTitle)}
                      </span>
                      {"\n          "}
                      {v1.showDone ? <>
                        {"\n            "}
                        <button data-dc-tpl="304" onClick={v1.selBg} style={{"height":"28px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.18)","borderRadius":"999px","background":"transparent","color":"#b3afa6","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                          Ferdig
                        </button>
                        {"\n          "}
                      </> : null}
                      {"\n        "}
                    </div>
                    {"\n        "}
                    {list(v1.ctrls).map(($it2, $i2) => {
                      const v2 = { ...v1, "c": $it2, $index: $i2 };
                      return <React.Fragment key={$i2}>
                        {"\n          "}
                        {v2.c?.isH ? <>
                          <div data-dc-tpl="307" style={{"marginTop":"6px","paddingTop":"14px","borderTop":"1px solid #262626","fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                            {I(v2.c?.label)}
                          </div>
                        </> : null}
                        {"\n          "}
                        {v2.c?.isSlider ? <>
                          {"\n            "}
                          <div data-dc-tpl="309" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                            {"\n              "}
                            <span data-dc-tpl="310" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12px","color":"#b3afa6"}}>
                              <span data-dc-tpl="311">
                                {I(v2.c?.label)}
                              </span>
                              {"\n                "}
                              <span data-dc-tpl="312" style={{"display":"flex","alignItems":"stretch","height":"26px","border":"1px solid rgba(255,255,255,0.14)","borderRadius":"7px","background":"rgba(0,0,0,0.35)","overflow":"hidden"}}>
                                {"\n                  "}
                                <input data-dc-tpl="313" type="text" inputMode="decimal" value={val(v2.c?.numVal)} onChange={v2.c?.onNum} onBlur={v2.c?.onNumBlur} onKeyDown={v2.c?.onNumKey} onFocus={v2.c?.onNumFocus} aria-label={v2.c?.label} style={{"width":"54px","padding":"0 4px 0 8px","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                                {"\n                  "}
                                {v2.c?.hasUnit ? <>
                                  <button data-dc-tpl="315" type="button" onClick={v2.c?.cycleUnit} title={v2.c?.unitTitle} aria-label={v2.c?.unitTitle} style={css(`min-width:28px; padding:0 7px; border:0; border-left:1px solid rgba(255,255,255,0.1); background:${v2.c?.unitBg ?? ""}; color:#b3afa6; font:inherit; font-size:11px; font-weight:700; cursor:${v2.c?.unitCur ?? ""};`, "min-width:28px; padding:0 7px; border:0; border-left:1px solid rgba(255,255,255,0.1); background:{{ c.unitBg }}; color:#b3afa6; font:inherit; font-size:11px; font-weight:700; cursor:{{ c.unitCur }};")} className="scpk">
                                    {I(v2.c?.unit)}
                                  </button>
                                </> : null}
                                {"\n                "}
                              </span>
                              {"\n              "}
                            </span>
                            {"\n              "}
                            <input data-dc-tpl="316" type="range" min={v2.c?.min} max={v2.c?.max} step={v2.c?.step} value={val(v2.c?.val)} onChange={v2.c?.onChange} aria-label={v2.c?.label} style={{"width":"100%","margin":"0","accentColor":"#e9e7e2"}} />
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isColor ? <>
                          {"\n            "}
                          <div data-dc-tpl="318" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            {"\n              "}
                            <span data-dc-tpl="319" style={{"fontSize":"12px","color":"#b3afa6"}}>
                              {I(v2.c?.label)}
                            </span>
                            {"\n              "}
                            {v2.c?.hasP ? <>
                              {"\n                "}
                              <div data-dc-tpl="321" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                                {"\n                  "}
                                <span data-dc-tpl="322" style={{"flex":"0 0 auto","fontSize":"10.5px","fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","color":"#8a867e"}}>
                                  Profil
                                </span>
                                {"\n                  "}
                                <div data-dc-tpl="323" data-keep-color="1" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                                  {"\n                    "}
                                  {list(v2.c?.psw).map(($it3, $i3) => {
                                    const v3 = { ...v2, "s": $it3, $index: $i3 };
                                    return <React.Fragment key={$i3}>
                                      <button data-dc-tpl="325" onClick={v3.s?.onClick} title={v3.s?.bg} aria-label={v3.s?.bg} style={css(`width:24px; height:24px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:${v3.s?.bg ?? ""}; box-shadow:${v3.s?.ring ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:{{ s.bg }}; box-shadow:{{ s.ring }}; cursor:pointer;")} />
                                    </React.Fragment>;
                                  })}
                                  {"\n                  "}
                                </div>
                                {"\n                "}
                              </div>
                              {"\n              "}
                            </> : null}
                            {"\n              "}
                            <div data-dc-tpl="326" data-keep-color="1" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                              {"\n                "}
                              {list(v2.c?.sw).map(($it3, $i3) => {
                                const v3 = { ...v2, "s": $it3, $index: $i3 };
                                return <React.Fragment key={$i3}>
                                  {"\n                  "}
                                  <button data-dc-tpl="328" onClick={v3.s?.onClick} title={v3.s?.bg} aria-label={v3.s?.bg} style={css(`width:24px; height:24px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:${v3.s?.bg ?? ""}; box-shadow:${v3.s?.ring ?? ""}; cursor:pointer;`, "width:24px; height:24px; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:{{ s.bg }}; box-shadow:{{ s.ring }}; cursor:pointer;")} />
                                  {"\n                "}
                                </React.Fragment>;
                              })}
                              {"\n                "}
                              <label data-dc-tpl="329" title="Egen farge" style={css(`position:relative; width:24px; height:24px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:${v2.c?.ringCustom ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:24px; height:24px; border-radius:999px; border:1px solid #3a3a3a; background:conic-gradient(#e76f51, #e9c46a, #2a9d8f, #457b9d, #9b2c4a, #e76f51); box-shadow:{{ c.ringCustom }}; overflow:hidden; cursor:pointer;")}>
                                <input data-dc-tpl="330" type="color" value={val(v2.c?.hex)} onChange={v2.c?.onPick} aria-label="Egen farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","border":"0","padding":"0","cursor":"pointer"}} />
                              </label>
                              {"\n              "}
                            </div>
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isSeg ? <>
                          {"\n            "}
                          <div data-dc-tpl="332" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            {"\n              "}
                            <span data-dc-tpl="333" style={{"fontSize":"12px","color":"#b3afa6"}}>
                              {I(v2.c?.label)}
                            </span>
                            {"\n              "}
                            <div data-dc-tpl="334" style={{"display":"flex","gap":"3px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                              {"\n                "}
                              {list(v2.c?.opts).map(($it3, $i3) => {
                                const v3 = { ...v2, "o": $it3, $index: $i3 };
                                return <React.Fragment key={$i3}>
                                  {"\n                  "}
                                  <button data-dc-tpl="336" onClick={v3.o?.onClick} style={css(`flex:1 1 0; min-width:0; height:28px; padding:0 8px; border:0; border-radius:999px; background:${v3.o?.bg ?? ""}; color:${v3.o?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "flex:1 1 0; min-width:0; height:28px; padding:0 8px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                                    {I(v3.o?.label)}
                                  </button>
                                  {"\n                "}
                                </React.Fragment>;
                              })}
                              {"\n              "}
                            </div>
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isCheck ? <>
                          {"\n            "}
                          <label data-dc-tpl="338" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                            <input data-dc-tpl="339" type="checkbox" checked={chk(v2.c?.checked)} onChange={v2.c?.onChange} style={{"width":"16px","height":"16px","margin":"0","accentColor":"#e9e7e2"}} />
                            <span data-dc-tpl="340">
                              {I(v2.c?.label)}
                            </span>
                          </label>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isArea ? <>
                          {"\n            "}
                          <div data-dc-tpl="342" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            {"\n              "}
                            <span data-dc-tpl="343" style={{"fontSize":"12px","color":"#b3afa6"}}>
                              {I(v2.c?.label)}
                            </span>
                            {"\n              "}
                            {v2.c?.hasTools ? <>
                              {"\n                "}
                              <div data-dc-tpl="345" style={{"display":"flex","flexWrap":"wrap","gap":"4px"}}>
                                {"\n                  "}
                                {list(v2.c?.tools).map(($it3, $i3) => {
                                  const v3 = { ...v2, "t": $it3, $index: $i3 };
                                  return <React.Fragment key={$i3}>
                                    {"\n                    "}
                                    <button data-dc-tpl="347" onMouseDown={v3.t?.onDown} title={v3.t?.title} aria-label={v3.t?.title} style={{"height":"30px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"8px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpe">
                                      {I(v3.t?.label)}
                                    </button>
                                    {"\n                  "}
                                  </React.Fragment>;
                                })}
                                {"\n                "}
                              </div>
                              {"\n              "}
                            </> : null}
                            {"\n              "}
                            <textarea data-dc-tpl="348" ref={v2.c?.ref} value={val(v2.c?.val)} onChange={v2.c?.onChange} onKeyDown={v2.c?.onKey} aria-label={v2.c?.label} rows={v2.c?.rows} placeholder={v2.c?.ph} style={{"padding":"9px 11px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"10px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.45","resize":"vertical","outline":"none","tabSize":"2"}} />
                            {"\n              "}
                            {v2.c?.hasTools ? <>
                              <span data-dc-tpl="350" style={{"fontSize":"11.5px","lineHeight":"1.45","color":"#8a867e","textWrap":"pretty"}}>
                                Enter gir nytt punkt. Tab gir underpunkt, Shift+Tab går tilbake. Vanlig tekst og lister kan blandes.
                              </span>
                            </> : null}
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isSelect ? <>
                          {"\n            "}
                          <label data-dc-tpl="352" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            {"\n              "}
                            <span data-dc-tpl="353" style={{"fontSize":"12px","color":"#b3afa6"}}>
                              {I(v2.c?.label)}
                            </span>
                            {"\n              "}
                            <select data-dc-tpl="354" value={val(v2.c?.val)} onChange={v2.c?.onChange} style={{"height":"34px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px"}}>
                              {"\n                "}
                              {list(v2.c?.opts).map(($it3, $i3) => {
                                const v3 = { ...v2, "o": $it3, $index: $i3 };
                                return <React.Fragment key={$i3}>
                                  <option data-dc-tpl="356" value={val(v3.o?.v)}>
                                    {I(v3.o?.label)}
                                  </option>
                                </React.Fragment>;
                              })}
                              {"\n              "}
                            </select>
                            {"\n            "}
                          </label>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isNums ? <>
                          {"\n            "}
                          <div data-dc-tpl="358" style={{"display":"grid","gridTemplateColumns":"repeat(4, minmax(0, 1fr))","gap":"6px"}}>
                            {"\n              "}
                            {list(v2.c?.items).map(($it3, $i3) => {
                              const v3 = { ...v2, "n": $it3, $index: $i3 };
                              return <React.Fragment key={$i3}>
                                {"\n                "}
                                <label data-dc-tpl="360" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                                  {"\n                  "}
                                  <span data-dc-tpl="361" style={{"fontSize":"11px","color":"#8a867e"}}>
                                    {I(v3.n?.label)}
                                  </span>
                                  {"\n                  "}
                                  <input data-dc-tpl="362" type="number" value={val(v3.n?.val)} onChange={v3.n?.onChange} style={{"width":"100%","height":"30px","padding":"0 6px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontVariantNumeric":"tabular-nums"}} />
                                  {"\n                "}
                                </label>
                                {"\n              "}
                              </React.Fragment>;
                            })}
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isBtns ? <>
                          {"\n            "}
                          <div data-dc-tpl="364" style={{"display":"flex","flexWrap":"wrap","gap":"6px"}}>
                            {"\n              "}
                            {list(v2.c?.items).map(($it3, $i3) => {
                              const v3 = { ...v2, "b": $it3, $index: $i3 };
                              return <React.Fragment key={$i3}>
                                {"\n                "}
                                <button data-dc-tpl="366" onClick={v3.b?.onClick} disabled={v3.b?.disabled} style={css(`height:32px; padding:0 13px; border:1px solid ${v3.b?.border ?? ""}; border-radius:999px; background:${v3.b?.bg ?? ""}; color:${v3.b?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; opacity:${v3.b?.op ?? ""};`, "height:32px; padding:0 13px; border:1px solid {{ b.border }}; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; opacity:{{ b.op }};")}>
                                  {I(v3.b?.label)}
                                </button>
                                {"\n              "}
                              </React.Fragment>;
                            })}
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n          "}
                        {v2.c?.isNote ? <>
                          <span data-dc-tpl="368" style={{"fontSize":"12px","lineHeight":"1.5","color":"#8a867e","textWrap":"pretty"}}>
                            {I(v2.c?.text)}
                          </span>
                        </> : null}
                        {"\n          "}
                        {v2.c?.isImg ? <>
                          {"\n            "}
                          <div data-dc-tpl="370" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            {"\n              "}
                            <span data-dc-tpl="371" style={{"fontSize":"12px","color":"#b3afa6"}}>
                              {I(v2.c?.label)}
                            </span>
                            {"\n              "}
                            <div data-dc-tpl="372" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                              {"\n                "}
                              <div data-dc-tpl="373" data-keep-color="1" style={{"position":"relative","flex":"0 0 92px","height":"58px","borderRadius":"8px","overflow":"hidden","border":"1px solid #2b2b2b","background":"repeating-conic-gradient(#2c2c2c 0 25%, #1c1c1c 0 50%) 50% / 12px 12px"}}>
                                {"\n                  "}
                                {v2.c?.hasThumb ? <>
                                  <img data-dc-tpl="375" src={v2.c?.thumb} alt="" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"contain","display":"block"}} />
                                </> : null}
                                {"\n                "}
                              </div>
                              {"\n                "}
                              <div data-dc-tpl="376" style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"6px"}}>
                                {"\n                  "}
                                <button data-dc-tpl="377" onClick={v2.c?.onPick} style={{"height":"32px","padding":"0 14px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12px","fontWeight":"700","cursor":"pointer"}}>
                                  {I(v2.c?.pickLabel)}
                                </button>
                                {"\n                  "}
                                {v2.c?.hasSrc ? <>
                                  <button data-dc-tpl="379" onClick={v2.c?.onClear} style={{"padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","textDecoration":"underline","textUnderlineOffset":"3px","cursor":"pointer"}}>
                                    Fjern bildet
                                  </button>
                                </> : null}
                                {"\n                "}
                              </div>
                              {"\n              "}
                            </div>
                            {"\n              "}
                            {v2.c?.canAI ? <>
                              {"\n                "}
                              <div data-dc-tpl="381" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"10px","border":"1px solid #262626","borderRadius":"12px"}}>
                                {"\n                  "}
                                <span data-dc-tpl="382" style={{"fontSize":"11.5px","color":"#8a867e","lineHeight":"1.45"}}>
                                  Valgfritt: fjern bakgrunnen med AI. Kjører i nettleseren, og originalen tas vare på.
                                </span>
                                {"\n                  "}
                                <div data-dc-tpl="383" style={{"display":"flex","gap":"6px"}}>
                                  {"\n                    "}
                                  <button data-dc-tpl="384" onClick={v2.c?.aiPerson} style={{"flex":"1","height":"30px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                                    Person
                                  </button>
                                  {"\n                    "}
                                  <button data-dc-tpl="385" onClick={v2.c?.aiObject} style={{"flex":"1","height":"30px","padding":"0 10px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                                    Objekt
                                  </button>
                                  {"\n                  "}
                                </div>
                                {"\n                "}
                              </div>
                              {"\n              "}
                            </> : null}
                            {"\n              "}
                            {v2.c?.busy ? <>
                              {"\n                "}
                              <div data-dc-tpl="387" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                                {"\n                  "}
                                <span data-dc-tpl="388" style={{"fontSize":"12px","fontWeight":"600"}}>
                                  {I(v2.c?.aiLabel)}
                                </span>
                                {"\n                  "}
                                <div data-dc-tpl="389" style={{"height":"4px","borderRadius":"999px","background":"rgba(255,255,255,0.14)","overflow":"hidden"}}>
                                  <div data-dc-tpl="390" style={css(`width:${v2.c?.aiW ?? ""}; height:100%; background:#f3f1ec;`, "width:{{ c.aiW }}; height:100%; background:#f3f1ec;")} />
                                </div>
                                {"\n                "}
                              </div>
                              {"\n              "}
                            </> : null}
                            {"\n              "}
                            {v2.c?.hasOrig ? <>
                              <button data-dc-tpl="392" onClick={v2.c?.onOrig} style={{"alignSelf":"flex-start","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","textDecoration":"underline","textUnderlineOffset":"3px","cursor":"pointer"}}>
                                Bruk originalbildet
                              </button>
                            </> : null}
                            {"\n            "}
                          </div>
                          {"\n          "}
                        </> : null}
                        {"\n        "}
                      </React.Fragment>;
                    })}
                    {"\n      "}
                  </aside>
                  {"\n        "}
                </> : null}
                {"\n      "}
              </div>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </main>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.lcOpen ? <>
        {"\n    "}
        <div data-dc-tpl="394" onClick={v.closeLc} style={{"position":"fixed","inset":"0","zIndex":"50","display":"flex","alignItems":"center","justifyContent":"center","padding":"24px","background":"rgba(0,0,0,0.7)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div data-dc-tpl="395" role="dialog" aria-modal="true" aria-label="Egen visning" onClick={v.stop} style={{"width":"100%","maxWidth":"1040px","maxHeight":"calc(100dvh - 48px)","overflow":"auto","display":"flex","flexDirection":"column","gap":"16px","padding":"26px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"#0c0c0c"}}>
            {"\n        "}
            <div data-dc-tpl="396" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span data-dc-tpl="397" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
                Egen visning
              </span>
              {"\n          "}
              <span data-dc-tpl="398" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                Dra fanene til den kolonnen du vil. Slipp en fane oppå en annen for å legge dem etter hverandre, og dra dem for å endre rekkefølgen. Tomme kolonner blir ikke vist.
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="399" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"6px"}}>
              {"\n          "}
              <span data-dc-tpl="400" style={{"fontSize":"12px","color":"#8a867e"}}>
                Start fra:
              </span>
              {"\n          "}
              {list(v.lcPresets).map(($it1, $i1) => {
                const v1 = { ...v, "p": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="402" onClick={v1.p?.onClick} style={{"height":"30px","padding":"0 12px","border":"1px solid rgba(255,255,255,0.18)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                    {I(v1.p?.label)}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="403" style={{"display":"grid","gridTemplateColumns":"repeat(5, minmax(150px, 1fr))","gap":"10px","overflowX":"auto"}}>
              {"\n          "}
              {list(v.lcSlots).map(($it1, $i1) => {
                const v1 = { ...v, "c": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <div data-dc-tpl="405" onDragOver={v1.c?.onOver} onDragLeave={v1.c?.onLeave} onDrop={v1.c?.onDrop} style={css(`min-height:320px; display:flex; flex-direction:column; gap:8px; padding:8px; border:1px dashed ${v1.c?.border ?? ""}; border-radius:14px; background:${v1.c?.bg ?? ""};`, "min-height:320px; display:flex; flex-direction:column; gap:8px; padding:8px; border:1px dashed {{ c.border }}; border-radius:14px; background:{{ c.bg }};")}>
                    {"\n              "}
                    <span data-dc-tpl="406" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","color":"#8a867e"}}>
                      {I(v1.c?.title)}
                    </span>
                    {"\n              "}
                    {list(v1.c?.items).map(($it2, $i2) => {
                      const v2 = { ...v1, "it": $it2, $index: $i2 };
                      return <React.Fragment key={$i2}>
                        {"\n                "}
                        <div data-dc-tpl="408" draggable="true" onDragStart={v2.it?.onStart} onDragEnd={v2.it?.onEnd} onDragOver={v2.it?.onOver} onDrop={v2.it?.onDrop} style={css(`min-height:${v2.it?.h ?? ""}; display:flex; flex-direction:column; justify-content:space-between; gap:6px; padding:8px 10px; border:1px solid ${v2.it?.border ?? ""}; border-radius:10px; background:${v2.it?.bg ?? ""}; cursor:grab;`, "min-height:{{ it.h }}; display:flex; flex-direction:column; justify-content:space-between; gap:6px; padding:8px 10px; border:1px solid {{ it.border }}; border-radius:10px; background:{{ it.bg }}; cursor:grab;")}>
                          {"\n                  "}
                          <span data-dc-tpl="409" style={{"display":"flex","alignItems":"center","gap":"6px","fontSize":"13px","fontWeight":"700"}}>
                            <span data-dc-tpl="410" style={{"color":"#8a867e","letterSpacing":"-2px"}}>
                              ⋮⋮
                            </span>
                            <span data-dc-tpl="411">
                              {I(v2.it?.name)}
                            </span>
                          </span>
                          {"\n                  "}
                          <span data-dc-tpl="412" style={{"display":"flex","gap":"4px"}}>
                            {"\n                    "}
                            <button data-dc-tpl="413" onClick={v2.it?.onL} title="Flytt til venstre kolonne" aria-label="Flytt til venstre kolonne" style={css(`width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:${v2.it?.opL ?? ""};`, "width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:{{ it.opL }};")}>
                              ←
                            </button>
                            {"\n                    "}
                            <button data-dc-tpl="414" onClick={v2.it?.onU} title="Flytt opp" aria-label="Flytt opp" style={css(`width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:${v2.it?.opU ?? ""};`, "width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:{{ it.opU }};")}>
                              ↑
                            </button>
                            {"\n                    "}
                            <button data-dc-tpl="415" onClick={v2.it?.onD} title="Flytt ned" aria-label="Flytt ned" style={css(`width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:${v2.it?.opD ?? ""};`, "width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:{{ it.opD }};")}>
                              ↓
                            </button>
                            {"\n                    "}
                            <button data-dc-tpl="416" onClick={v2.it?.onR} title="Flytt til høyre kolonne" aria-label="Flytt til høyre kolonne" style={css(`width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:${v2.it?.opR ?? ""};`, "width:26px; height:26px; padding:0; border:1px solid rgba(255,255,255,0.16); border-radius:7px; background:transparent; color:#f3f1ec; font:inherit; font-size:12px; cursor:pointer; opacity:{{ it.opR }};")}>
                              →
                            </button>
                            {"\n                  "}
                          </span>
                          {"\n                "}
                        </div>
                        {"\n              "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                    {v1.c?.empty ? <>
                      <span data-dc-tpl="418" style={{"flex":"1","display":"flex","alignItems":"center","justifyContent":"center","padding":"10px","fontSize":"12px","lineHeight":"1.4","color":"#6f6b64","textAlign":"center"}}>
                        Slipp en fane her
                      </span>
                    </> : null}
                    {"\n              "}
                    {v1.c?.canTabs ? <>
                      <label data-dc-tpl="420" style={{"display":"flex","alignItems":"center","gap":"8px","marginTop":"auto","fontSize":"12px","color":"#b3afa6","cursor":"pointer"}}>
                        <input data-dc-tpl="421" type="checkbox" checked={chk(v1.c?.tabsOn)} onChange={v1.c?.onTabs} style={{"width":"15px","height":"15px","accentColor":"#f3f1ec"}} />
                        <span data-dc-tpl="422">
                          Vis som faner
                        </span>
                      </label>
                    </> : null}
                    {"\n            "}
                  </div>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="423" style={{"display":"flex","flexWrap":"wrap","justifyContent":"space-between","gap":"8px"}}>
              {"\n          "}
              <button data-dc-tpl="424" onClick={v.lcReset} style={{"height":"40px","padding":"0 16px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12.5px","fontWeight":"600","textDecoration":"underline","textUnderlineOffset":"3px","cursor":"pointer"}} className="scp9">
                Tilbakestill til grunnoppsett
              </button>
              {"\n          "}
              <div data-dc-tpl="425" style={{"display":"flex","gap":"8px"}}>
                {"\n            "}
                <button data-dc-tpl="426" onClick={v.closeLc} style={{"height":"40px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                  Avbryt
                </button>
                {"\n            "}
                <button data-dc-tpl="427" onClick={v.lcApply} style={{"height":"40px","padding":"0 20px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                  Bruk visningen
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
      {v.ctxOpen ? <>
        {"\n    "}
        <div data-dc-tpl="429" onPointerDown={v.closeCtx} onContextMenu={v.stopCtx} style={{"position":"fixed","inset":"0","zIndex":"60"}} />
        {"\n    "}
        <div data-dc-tpl="430" role="menu" aria-label="Lagmeny" onContextMenu={v.stopCtx} style={css(`position:fixed; left:${v.ctxL ?? ""}; top:${v.ctxT ?? ""}; z-index:61; min-width:200px; display:flex; flex-direction:column; padding:6px; border:1px solid rgba(255,255,255,0.16); border-radius:12px; background:#0c0c0c; box-shadow:0 16px 40px rgba(0,0,0,0.5);`, "position:fixed; left:{{ ctxL }}; top:{{ ctxT }}; z-index:61; min-width:200px; display:flex; flex-direction:column; padding:6px; border:1px solid rgba(255,255,255,0.16); border-radius:12px; background:#0c0c0c; box-shadow:0 16px 40px rgba(0,0,0,0.5);")}>
          {"\n      "}
          {list(v.ctxItems).map(($it1, $i1) => {
            const v1 = { ...v, "m": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              <button data-dc-tpl="432" role="menuitem" onClick={v1.m?.onClick} style={css(`display:flex; align-items:center; justify-content:space-between; gap:18px; height:34px; padding:0 10px; border:0; border-radius:8px; background:transparent; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; text-align:left; cursor:${v1.m?.cur ?? ""}; opacity:${v1.m?.op ?? ""};`, "display:flex; align-items:center; justify-content:space-between; gap:18px; height:34px; padding:0 10px; border:0; border-radius:8px; background:transparent; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; text-align:left; cursor:{{ m.cur }}; opacity:{{ m.op }};")} className="scpe">
                <span data-dc-tpl="433">
                  {I(v1.m?.label)}
                </span>
                <span data-dc-tpl="434" data-no-i18n="1" style={{"fontSize":"11.5px","fontWeight":"500","color":"#8a867e"}}>
                  {I(v1.m?.sc)}
                </span>
              </button>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.newOpen ? <>
        {"\n    "}
        <div data-dc-tpl="436" onClick={v.closeNew} style={{"position":"fixed","inset":"0","zIndex":"50","display":"flex","alignItems":"center","justifyContent":"center","padding":"24px","background":"rgba(0,0,0,0.7)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div data-dc-tpl="437" role="dialog" aria-modal="true" aria-label="Ny mal" onClick={v.stop} style={{"width":"100%","maxWidth":"980px","maxHeight":"calc(100dvh - 48px)","overflow":"auto","display":"flex","flexDirection":"column","gap":"18px","padding":"26px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"#0c0c0c"}}>
            {"\n        "}
            <div data-dc-tpl="438" style={{"display":"flex","alignItems":"flex-start","justifyContent":"space-between","gap":"16px"}}>
              {"\n        "}
              <div data-dc-tpl="439" style={{"display":"flex","flexDirection":"column","gap":"6px","minWidth":"0"}}>
                {"\n          "}
                {v.newNotApply ? <>
                  {"\n            "}
                  <span data-dc-tpl="441" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
                    Ny mal
                  </span>
                  {"\n            "}
                  <span data-dc-tpl="442" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6"}}>
                    Velg hvordan den nye malen skal starte.
                  </span>
                  {"\n          "}
                </> : null}
                {"\n          "}
                {v.newApply ? <>
                  {"\n            "}
                  <span data-dc-tpl="444" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
                    Bytt oppsett
                  </span>
                  {"\n            "}
                  <span data-dc-tpl="445" style={{"fontSize":"13px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
                    Velg et nytt oppsett. Personbilde, navn, tema og egne bilder blir med over. Du kan angre etterpå.
                  </span>
                  {"\n          "}
                </> : null}
                {"\n        "}
              </div>
              {"\n        "}
              <div data-dc-tpl="446" style={{"position":"relative","flex":"0 0 auto"}}>
                {"\n          "}
                <button data-dc-tpl="447" onClick={v.togglePal} aria-expanded={v.palOpen} style={{"display":"flex","alignItems":"center","gap":"10px","padding":"8px 14px 8px 10px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp5">
                  {"\n            "}
                  <span data-dc-tpl="448" data-keep-color="1" style={{"display":"flex","overflow":"hidden","borderRadius":"999px","border":"1px solid rgba(255,255,255,0.25)"}}>
                    {"\n              "}
                    {list(v.palCurSw).map(($it1, $i1) => {
                      const v1 = { ...v, "c": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <span data-dc-tpl="450" style={css(`width:12px; height:18px; background:${v1.c ?? ""};`, "width:12px; height:18px; background:{{ c }};")} />
                      </React.Fragment>;
                    })}
                    {"\n            "}
                  </span>
                  {"\n            "}
                  <span data-dc-tpl="451">
                    Velg farge
                  </span>
                  {"\n            "}
                  <span data-dc-tpl="452" style={{"color":"#9d998f","fontWeight":"500"}}>
                    {I(v.palCurName)}
                  </span>
                  {"\n          "}
                </button>
                {"\n          "}
                {v.palOpen ? <>
                  {"\n            "}
                  <div data-dc-tpl="454" style={{"position":"absolute","top":"calc(100% + 8px)","right":"0","zIndex":"5","width":"250px","maxHeight":"min(440px, calc(100dvh - 200px))","overflow":"auto","display":"flex","flexDirection":"column","gap":"2px","padding":"6px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"14px","background":"#141414","boxShadow":"0 18px 40px rgba(0,0,0,0.55)"}}>
                    {"\n              "}
                    {list(v.palList).map(($it1, $i1) => {
                      const v1 = { ...v, "p": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                "}
                        <button data-dc-tpl="456" onClick={v1.p?.onClick} style={css(`display:flex; align-items:center; gap:10px; padding:7px 9px; border:0; border-radius:9px; background:${v1.p?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:12.5px; text-align:left; cursor:pointer;`, "display:flex; align-items:center; gap:10px; padding:7px 9px; border:0; border-radius:9px; background:{{ p.bg }}; color:#f3f1ec; font:inherit; font-size:12.5px; text-align:left; cursor:pointer;")} className="scpe">
                          {"\n                  "}
                          <span data-dc-tpl="457" data-keep-color="1" style={{"flex":"0 0 auto","display":"flex","overflow":"hidden","borderRadius":"6px","border":"1px solid rgba(255,255,255,0.2)"}}>
                            {"\n                    "}
                            {list(v1.p?.sw).map(($it2, $i2) => {
                              const v2 = { ...v1, "c": $it2, $index: $i2 };
                              return <React.Fragment key={$i2}>
                                <span data-dc-tpl="459" style={css(`width:14px; height:20px; background:${v2.c ?? ""};`, "width:14px; height:20px; background:{{ c }};")} />
                              </React.Fragment>;
                            })}
                            {"\n                  "}
                          </span>
                          {"\n                  "}
                          <span data-dc-tpl="460" style={{"flex":"1","minWidth":"0"}}>
                            {I(v1.p?.name)}
                          </span>
                          {"\n                  "}
                          <span data-dc-tpl="461" style={css(`color:#f3f1ec; opacity:${v1.p?.chk ?? ""};`, "color:#f3f1ec; opacity:{{ p.chk }};")}>
                            ✓
                          </span>
                          {"\n                "}
                        </button>
                        {"\n              "}
                      </React.Fragment>;
                    })}
                    {"\n            "}
                  </div>
                  {"\n          "}
                </> : null}
                {"\n        "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="462" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"12px"}}>
              {"\n          "}
              {list(v.newTop).map(($it1, $i1) => {
                const v1 = { ...v, "o": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="464" onClick={v1.o?.onClick} style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"10px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"16px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scpl">
                    {"\n              "}
                    <span data-dc-tpl="465" data-keep-color="1" style={{"position":"relative","display":"block","width":"100%","aspectRatio":"16 / 9","borderRadius":"10px","overflow":"hidden","background":"#111111","border":"1px solid rgba(255,255,255,0.1)"}}>
                      {"\n                "}
                      {v1.o?.hasImg ? <>
                        <img data-dc-tpl="467" src={v1.o?.img} alt="" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"cover","display":"block"}} />
                      </> : null}
                      {"\n                "}
                      {v1.o?.loading ? <>
                        <span data-dc-tpl="469" style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"11.5px","color":"#6f6b64"}}>
                          Lager skisse …
                        </span>
                      </> : null}
                      {"\n              "}
                    </span>
                    {"\n              "}
                    <span data-dc-tpl="470" style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"0 4px 4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="471" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}}>
                        {I(v1.o?.name)}
                      </span>
                      {"\n                "}
                      <span data-dc-tpl="472" style={{"fontSize":"12px","lineHeight":"1.45","color":"#9d998f","textWrap":"pretty"}}>
                        {I(v1.o?.desc)}
                      </span>
                      {"\n              "}
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="473" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0, 1fr))","gap":"12px"}}>
              {"\n          "}
              {list(v.newStd).map(($it1, $i1) => {
                const v1 = { ...v, "o": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="475" onClick={v1.o?.onClick} style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"10px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"16px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scpl">
                    {"\n              "}
                    <span data-dc-tpl="476" data-keep-color="1" style={{"position":"relative","display":"block","width":"100%","aspectRatio":"16 / 9","borderRadius":"10px","overflow":"hidden","background":"#111111","border":"1px solid rgba(255,255,255,0.1)"}}>
                      {"\n                "}
                      {v1.o?.hasImg ? <>
                        <img data-dc-tpl="478" src={v1.o?.img} alt="" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","objectFit":"cover","display":"block"}} />
                      </> : null}
                      {"\n                "}
                      {v1.o?.loading ? <>
                        <span data-dc-tpl="480" style={{"position":"absolute","inset":"0","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"11.5px","color":"#6f6b64"}}>
                          Lager skisse …
                        </span>
                      </> : null}
                      {"\n              "}
                    </span>
                    {"\n              "}
                    <span data-dc-tpl="481" style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"0 4px 4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="482" style={{"fontSize":"13px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}}>
                        {I(v1.o?.name)}
                      </span>
                      {"\n                "}
                      <span data-dc-tpl="483" style={{"fontSize":"12px","lineHeight":"1.45","color":"#9d998f","textWrap":"pretty"}}>
                        {I(v1.o?.desc)}
                      </span>
                      {"\n              "}
                    </span>
                    {"\n            "}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="484" style={{"display":"flex","justifyContent":"flex-end"}}>
              {"\n          "}
              <button data-dc-tpl="485" onClick={v.closeNew} style={{"height":"40px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}} className="scp1">
                Avbryt
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
      {v.exp ? <>
        {"\n    "}
        <div data-dc-tpl="487" onClick={v.closeExp} style={{"position":"fixed","inset":"0","zIndex":"50","display":"flex","alignItems":"center","justifyContent":"center","padding":"24px","background":"rgba(0,0,0,0.7)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div data-dc-tpl="488" role="dialog" aria-modal="true" aria-label="Eksporter" onClick={v.stop} style={{"width":"100%","maxWidth":"500px","maxHeight":"calc(100dvh - 48px)","overflow":"auto","display":"flex","flexDirection":"column","gap":"18px","padding":"26px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"#0c0c0c"}}>
            {"\n        "}
            <span data-dc-tpl="489" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
              Eksporter thumbnail
            </span>
            {"\n        "}
            <div data-dc-tpl="490" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span data-dc-tpl="491" style={{"fontSize":"12px","color":"#b3afa6"}}>
                Oppløsning
              </span>
              {"\n          "}
              <div data-dc-tpl="492" style={{"display":"flex","gap":"3px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                {"\n            "}
                {list(v.resOpts).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button data-dc-tpl="494" onClick={v1.o?.onClick} style={css(`flex:1 1 0; height:34px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:34px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v1.o?.label)}
                    </button>
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="495" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span data-dc-tpl="496" style={{"fontSize":"12px","color":"#b3afa6"}}>
                Format
              </span>
              {"\n          "}
              <div data-dc-tpl="497" style={{"display":"flex","gap":"3px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                {"\n            "}
                {list(v.fmtOpts).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    <button data-dc-tpl="499" onClick={v1.o?.onClick} style={css(`flex:1 1 0; height:34px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:34px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v1.o?.label)}
                    </button>
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            {v.isPng ? <>
              <label data-dc-tpl="501" style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.45","cursor":"pointer"}}>
                <input data-dc-tpl="502" type="checkbox" checked={chk(v.expT)} onChange={v.onExpT} style={{"flex":"0 0 16px","width":"16px","height":"16px","margin":"1px 0 0","accentColor":"#e9e7e2"}} />
                <span data-dc-tpl="503" style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                  <span data-dc-tpl="504">
                    Gjennomsiktig bakgrunn
                  </span>
                  <span data-dc-tpl="505" style={{"fontSize":"12px","color":"#8a867e"}}>
                    Bakgrunn og vignett tas bort. Bare lagene blir med.
                  </span>
                </span>
              </label>
            </> : null}
            {"\n        "}
            <div data-dc-tpl="506" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"12px 14px","border":"1px solid #262626","borderRadius":"12px"}}>
              {"\n          "}
              <span data-dc-tpl="507" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","color":"#b3afa6"}}>
                Hva passer best?
              </span>
              {"\n          "}
              <div data-dc-tpl="508" style={{"display":"grid","gridTemplateColumns":"minmax(0, 130px) minmax(0, 1fr)","gap":"10px","fontSize":"12px","lineHeight":"1.45"}}>
                <span data-dc-tpl="509" style={{"fontWeight":"700","color":"#e9e7e2"}}>
                  YouTube
                </span>
                <span data-dc-tpl="510" style={{"color":"#9d998f","textWrap":"pretty"}}>
                  JPG i 1080p. Liten fil, og alltid under grensen på 2 MB.
                </span>
              </div>
              {"\n          "}
              <div data-dc-tpl="511" style={{"display":"grid","gridTemplateColumns":"minmax(0, 130px) minmax(0, 1fr)","gap":"10px","fontSize":"12px","lineHeight":"1.45"}}>
                <span data-dc-tpl="512" style={{"fontWeight":"700","color":"#e9e7e2"}}>
                  Appen og nettsiden
                </span>
                <span data-dc-tpl="513" style={{"color":"#9d998f","textWrap":"pretty"}}>
                  PNG i 1080p. Skarpest tekst og logoer.
                </span>
              </div>
              {"\n          "}
              <div data-dc-tpl="514" style={{"display":"grid","gridTemplateColumns":"minmax(0, 130px) minmax(0, 1fr)","gap":"10px","fontSize":"12px","lineHeight":"1.45"}}>
                <span data-dc-tpl="515" style={{"fontWeight":"700","color":"#e9e7e2"}}>
                  Gjennomsiktig bakgrunn
                </span>
                <span data-dc-tpl="516" style={{"color":"#9d998f","textWrap":"pretty"}}>
                  Bare PNG. Bruk det når bildet skal ligge oppå en video eller et annet bilde.
                </span>
              </div>
              {"\n          "}
              <div data-dc-tpl="517" style={{"display":"grid","gridTemplateColumns":"minmax(0, 130px) minmax(0, 1fr)","gap":"10px","fontSize":"12px","lineHeight":"1.45"}}>
                <span data-dc-tpl="518" style={{"fontWeight":"700","color":"#e9e7e2"}}>
                  Storskjerm og trykk
                </span>
                <span data-dc-tpl="519" style={{"color":"#9d998f","textWrap":"pretty"}}>
                  PNG i 4K. Størst fil og mest detaljer.
                </span>
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="520" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
              {"\n          "}
              <span data-dc-tpl="521" style={{"fontSize":"12.5px","fontWeight":"600","color":"#e9e7e2","fontVariantNumeric":"tabular-nums"}}>
                {I(v.sizeText)}
              </span>
              {"\n          "}
              {v.tooBig ? <>
                {"\n            "}
                <div data-dc-tpl="523" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"10px 12px","border":"1px solid rgba(245,184,0,0.45)","borderRadius":"10px","background":"rgba(245,184,0,0.08)"}}>
                  {"\n              "}
                  <span data-dc-tpl="524" style={{"flex":"1 1 220px","fontSize":"12px","lineHeight":"1.45","color":"#e9e7e2","textWrap":"pretty"}}>
                    Filen er over 2 MB. Det er for stort for YouTube, men fungerer fint i appen.
                  </span>
                  {"\n              "}
                  {v.hasFix ? <>
                    <button data-dc-tpl="526" onClick={v.fixBig} style={{"height":"30px","padding":"0 14px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12px","fontWeight":"700","cursor":"pointer"}}>
                      {I(v.fixLabel)}
                    </button>
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="527" style={{"display":"flex","gap":"8px","justifyContent":"flex-end"}}>
              {"\n          "}
              <button data-dc-tpl="528" onClick={v.closeExp} style={{"height":"42px","padding":"0 18px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}}>
                Avbryt
              </button>
              {"\n          "}
              <button data-dc-tpl="529" onClick={v.copyExp} disabled={v.expBusy} style={{"height":"42px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.1em","textTransform":"uppercase","cursor":"pointer"}}>
                Kopier
              </button>
              {"\n          "}
              <button data-dc-tpl="530" onClick={v.sendExp} disabled={v.expBusy} style={{"height":"42px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","letterSpacing":"0.1em","textTransform":"uppercase","cursor":"pointer"}}>
                Send til …
              </button>
              {"\n          "}
              <button data-dc-tpl="531" onClick={v.doExport} disabled={v.expBusy} style={css(`height:42px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:${v.expOp ?? ""};`, "height:42px; padding:0 22px; border:1px solid #f3f1ec; border-radius:999px; background:#f3f1ec; color:#000; font:inherit; font-size:12.5px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; opacity:{{ expOp }};")}>
                {I(v.expBtn)}
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
      {v.save ? <>
        {"\n    "}
        <div data-dc-tpl="533" onClick={v.closeSave} style={{"position":"fixed","inset":"0","zIndex":"50","display":"flex","alignItems":"center","justifyContent":"center","padding":"24px","background":"rgba(0,0,0,0.7)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div data-dc-tpl="534" role="dialog" aria-modal="true" aria-label="Lagre mal" onClick={v.stop} style={{"width":"100%","maxWidth":"440px","display":"flex","flexDirection":"column","gap":"16px","padding":"26px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"22px","background":"#0c0c0c"}}>
            {"\n        "}
            <span data-dc-tpl="535" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase"}}>
              Lagre mal
            </span>
            {"\n        "}
            <label data-dc-tpl="536" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              <span data-dc-tpl="537" style={{"fontSize":"12px","color":"#b3afa6"}}>
                Navn
              </span>
              {"\n          "}
              <input data-dc-tpl="538" value={val(v.tplName)} onChange={v.onTplName} placeholder="Navn på malen" style={{"height":"42px","padding":"0 14px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"12px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} />
              {"\n        "}
            </label>
            {"\n        "}
            <span data-dc-tpl="539" style={{"fontSize":"12px","lineHeight":"1.5","color":"#8a867e"}}>
              {I(v.saveNote)}
            </span>
            {"\n        "}
            <div data-dc-tpl="540" style={{"display":"flex","flexWrap":"wrap","gap":"8px"}}>
              {"\n          "}
              {list(v.saveBtns).map(($it1, $i1) => {
                const v1 = { ...v, "b": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="542" onClick={v1.b?.onClick} disabled={v1.b?.disabled} style={css(`height:40px; padding:0 18px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:${v1.b?.op ?? ""};`, "height:40px; padding:0 18px; border:1px solid {{ b.border }}; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer; opacity:{{ b.op }};")}>
                    {I(v1.b?.label)}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            {v.showOver ? <>
              {"\n          "}
              <div data-dc-tpl="544" style={{"display":"flex","flexDirection":"column","gap":"6px","paddingTop":"12px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="545" style={{"fontSize":"12px","color":"#b3afa6"}}>
                  Kategorien er full (5 maler). Overskriv en av disse:
                </span>
                {"\n            "}
                {list(v.overList).map(($it1, $i1) => {
                  const v1 = { ...v, "o": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button data-dc-tpl="547" onClick={v1.o?.onClick} data-no-i18n="1" style={{"minHeight":"36px","padding":"6px 12px","border":"1px solid rgba(255,255,255,0.16)","borderRadius":"10px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","textAlign":"left","cursor":"pointer"}} className="scp3">
                      {I(v1.o?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.cropOpen ? <>
        {"\n    "}
        <div data-dc-tpl="549" style={{"position":"fixed","inset":"0","zIndex":"55","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"16px","padding":"24px","background":"rgba(0,0,0,0.88)","backdropFilter":"blur(6px)"}}>
          {"\n      "}
          <div data-dc-tpl="550" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"4px","textAlign":"center"}}>
            {"\n        "}
            <span data-dc-tpl="551" style={{"fontSize":"12px","fontWeight":"700","letterSpacing":"0.22em","textTransform":"uppercase","color":"#f3f1ec"}}>
              Beskjær bildet
            </span>
            {"\n        "}
            <span data-dc-tpl="552" style={{"fontSize":"12.5px","lineHeight":"1.5","color":"#b3afa6","textWrap":"pretty"}}>
              Dra i kantene eller hjørnene. Dra inne i rammen for å flytte den.
            </span>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="553" ref={v.cropRef} data-keep-color="1" style={css(`position:relative; flex:0 0 auto; margin:12px; width:${v.cropW ?? ""}; height:${v.cropH ?? ""}; touch-action:none; user-select:none; background:repeating-conic-gradient(#8c8c8c 0 25%, #6e6e6e 0 50%) 50% / 16px 16px;`, "position:relative; flex:0 0 auto; margin:12px; width:{{ cropW }}; height:{{ cropH }}; touch-action:none; user-select:none; background:repeating-conic-gradient(#8c8c8c 0 25%, #6e6e6e 0 50%) 50% / 16px 16px;")}>
            {"\n        "}
            <img data-dc-tpl="554" src={v.cropUrl} alt="" draggable="false" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","display":"block","pointerEvents":"none"}} />
            {"\n        "}
            <div data-dc-tpl="555" style={css(`position:absolute; left:0; right:0; top:0; height:${v.cbT ?? ""}; background:rgba(0,0,0,0.62); pointer-events:none;`, "position:absolute; left:0; right:0; top:0; height:{{ cbT }}; background:rgba(0,0,0,0.62); pointer-events:none;")} />
            {"\n        "}
            <div data-dc-tpl="556" style={css(`position:absolute; left:0; right:0; bottom:0; height:${v.cbB ?? ""}; background:rgba(0,0,0,0.62); pointer-events:none;`, "position:absolute; left:0; right:0; bottom:0; height:{{ cbB }}; background:rgba(0,0,0,0.62); pointer-events:none;")} />
            {"\n        "}
            <div data-dc-tpl="557" style={css(`position:absolute; left:0; top:${v.cbT ?? ""}; width:${v.cbL ?? ""}; height:${v.cbH ?? ""}; background:rgba(0,0,0,0.62); pointer-events:none;`, "position:absolute; left:0; top:{{ cbT }}; width:{{ cbL }}; height:{{ cbH }}; background:rgba(0,0,0,0.62); pointer-events:none;")} />
            {"\n        "}
            <div data-dc-tpl="558" style={css(`position:absolute; right:0; top:${v.cbT ?? ""}; width:${v.cbR ?? ""}; height:${v.cbH ?? ""}; background:rgba(0,0,0,0.62); pointer-events:none;`, "position:absolute; right:0; top:{{ cbT }}; width:{{ cbR }}; height:{{ cbH }}; background:rgba(0,0,0,0.62); pointer-events:none;")} />
            {"\n        "}
            <div data-dc-tpl="559" data-h="m" onPointerDown={v.cropDown} style={css(`position:absolute; left:${v.cbL ?? ""}; top:${v.cbT ?? ""}; width:${v.cbW ?? ""}; height:${v.cbH ?? ""}; outline:2px solid #ffffff; cursor:move;`, "position:absolute; left:{{ cbL }}; top:{{ cbT }}; width:{{ cbW }}; height:{{ cbH }}; outline:2px solid #ffffff; cursor:move;")}>
              {"\n          "}
              <div data-dc-tpl="560" style={{"position":"absolute","left":"33.33%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="561" style={{"position":"absolute","left":"66.66%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="562" style={{"position":"absolute","top":"33.33%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="563" style={{"position":"absolute","top":"66.66%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="564" data-h="tl" style={{"position":"absolute","left":"0","top":"0","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"nwse-resize"}} />
              {"\n          "}
              <div data-dc-tpl="565" data-h="t" style={{"position":"absolute","left":"50%","top":"0","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"ns-resize"}} />
              {"\n          "}
              <div data-dc-tpl="566" data-h="tr" style={{"position":"absolute","left":"100%","top":"0","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"nesw-resize"}} />
              {"\n          "}
              <div data-dc-tpl="567" data-h="r" style={{"position":"absolute","left":"100%","top":"50%","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"ew-resize"}} />
              {"\n          "}
              <div data-dc-tpl="568" data-h="br" style={{"position":"absolute","left":"100%","top":"100%","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"nwse-resize"}} />
              {"\n          "}
              <div data-dc-tpl="569" data-h="b" style={{"position":"absolute","left":"50%","top":"100%","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"ns-resize"}} />
              {"\n          "}
              <div data-dc-tpl="570" data-h="bl" style={{"position":"absolute","left":"0","top":"100%","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"nesw-resize"}} />
              {"\n          "}
              <div data-dc-tpl="571" data-h="l" style={{"position":"absolute","left":"0","top":"50%","width":"18px","height":"18px","margin":"-9px 0 0 -9px","borderRadius":"5px","background":"#ffffff","border":"2px solid #000","cursor":"ew-resize"}} />
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="572" style={{"display":"flex","flexWrap":"wrap","alignItems":"center","justifyContent":"center","gap":"8px"}}>
            {"\n        "}
            <button data-dc-tpl="573" onClick={v.cropTrim} style={{"height":"40px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scpm">
              Fjern tomme kanter
            </button>
            {"\n        "}
            <button data-dc-tpl="574" onClick={v.cropReset} style={{"height":"40px","padding":"0 18px","border":"1px solid rgba(255,255,255,0.3)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scpm">
              Vis hele bildet
            </button>
            {"\n        "}
            <span data-dc-tpl="575" style={{"width":"12px"}} />
            {"\n        "}
            <button data-dc-tpl="576" onClick={v.cropCancel} style={{"height":"40px","padding":"0 18px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}}>
              Avbryt
            </button>
            {"\n        "}
            <button data-dc-tpl="577" onClick={v.cropApply} style={{"height":"40px","padding":"0 24px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","cursor":"pointer"}}>
              Bruk
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.hasMsg ? <>
        {"\n    "}
        <div data-dc-tpl="579" role="status" style={{"position":"fixed","left":"50%","bottom":"28px","transform":"translateX(-50%)","zIndex":"60","maxWidth":"calc(100% - 40px)","padding":"12px 20px","border":"1px solid rgba(255,255,255,0.18)","borderRadius":"999px","background":"rgba(12,12,12,0.92)","backdropFilter":"blur(8px)","fontSize":"13px","fontWeight":"600","textAlign":"center"}}>
          {I(v.msg)}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      <input data-dc-tpl="580" type="file" accept=".json,application/json" ref={v.restoreRef} onChange={v.onRestore} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="581" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp" ref={v.fileRef} onChange={v.onFile} style={{"display":"none"}} />
      {"\n  "}
      <footer data-dc-tpl="582" style={{"position":"relative","flexShrink":"0","marginTop":"auto","height":"56px","paddingBottom":"env(safe-area-inset-bottom)","display":"flex","alignItems":"center","justifyContent":"center"}}>
        {"\n    "}
        <span data-dc-tpl="583" style={{"fontSize":"11.5px","fontWeight":"600","letterSpacing":"0.32em","textTransform":"uppercase","color":"#b3afa6"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
    </div>
    </>
  );
}
