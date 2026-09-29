# Verktøy 4: Loop Studio (startsiden)

Status: ferdig og verifisert. Editoren (`studio-editor.dc.html`, Ukeprogram Loop) er et eget verktøy og migreres til slutt.

- `media-lab-react/loop-studio.dc.html` + `src/pages/loop-studio/`. `#boot-splash` («LASTER …») står foran `#dc-root` som i originalen og fjernes av logikken.
- `loop-editor.dc.html` er en uendret kopi av omdirigeringen til `studio-editor.dc.html`. Den sammenlignes når editoren er migrert.
- `dc2jsx`: innhold i `<body>` foran `<x-dc>` beholdes.

## Footer (ml-footer.js): etterligning av runtimen
I originalen rakk `ml-footer.js` å koble innfading på footeren i den rå malen. Runtimen kompilerte malen på nytt rett etter første visning (`fetch(location.href)`), og da satte React stilen tilbake. Dette gir følgende oppførsel i originalen:
- Footere som finnes ved oppstart, vises med en gang. Når man ruller bort og tilbake, skjules og vises de **uten** animasjon.
- Footere som dukker opp senere, fader inn som ml-footer er laget for.

`src/shared/dc.jsx` (`keepFooterLikeRuntime`) gjør det samme: stilen noteres før ml-footer kobler seg på, og settes tilbake etter IntersectionObservers første melding. `tests/footer.spec.js` sjekker oppstart, rulling ned, opp og ned igjen mot originalen på alle migrerte sider.

**Kjent kappløp i originalen:** Etter ny innlasting (HTML fra hurtigbufferen) vinner runtimen før IntersectionObserver. Da er footer-tekst under skjermkanten skjult til man ruller dit. React følger alltid førstebesøk-oppførselen (synlig). Det er den vanlige situasjonen i produksjon, der HTML revalideres over nettverket (`no-cache`).

## Verifisering
- `tests/compare.spec.js`: skjermbildene er like grunnlinjen (mørk/lys × desktop/mobil).
- `tests/loop-studio.spec.js`: 21 steg med tre lagrede loops på Disk. Stegene er åpne/lukke Disk, favoritt av/på, slett fra Disk (også `ukeloop.custom.<id>`), rediger maler, sidetittel, kategori/navn/beskrivelse/knapp, flytt, ny mal, fjern mal, ferdig, tom tittel → standard, tilbakestill, ny innlasting, hover, engelsk og lys modus. Etter hvert steg er tekst, feltverdier, lenker (inkl. `studio-editor.dc.html?mal=…&id=…`) og **hele localStorage** like. Skjermbildene er like, med unntak av footer-kappløpet over (≤ 0,15 %).
- `tests/parity.js` sammenligner nå også feltverdier, lenker og localStorage, og låser `Math.random` likt i begge versjoner.
