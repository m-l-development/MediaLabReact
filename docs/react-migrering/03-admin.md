# Verktøy 2: Admin

Status: ferdig og verifisert.

- `media-lab-react/admin.dc.html` + `src/pages/admin/` (generert fra `media-lab/admin.dc.html`).
- React-sidene har nå samme filnavn som originalene (`media-lab.dc.html`, `admin.dc.html`), slik at lenker og bokmerker virker uendret etter sammenslåingen. `index.html` er den samme omdirigeringen som før. Originalene nås på `/_original/<fil>` i dev og preview.
- Skript i `<helmet>` med lokal `src` blir `import` i `main.jsx`, i samme rekkefølge (etter skriptene i `<head>`).

## Verifisering
- `tests/compare.spec.js`: skjermbildene er like grunnlinjen (mørk/lys × desktop/mobil) og har samme konsollfeil som grunnlinjen (ingen).
- `tests/admin.spec.js`: hele flyten mot et falskt API med samme kontrakt som `api/ml.js`, kjørt likt på originalen og React-versjonen. 27 steg: oppsett av utviklerkonto, opplasting, skjul/vis innebygd bilde, mapper, sletting av fil, brukere (legg til, rolle, nytt passord, slett), menigheter (legg til, nytt navn, slett, vis filer), logg (filtre, tøm), system, min konto (feil/riktig passord), logg ut, feil/riktig innlogging, engelsk, lys modus. Etter hvert steg er synlig tekst lik og skjermbildet likt (≤ 0,001 %).
- Unntak: bakgrunnsbølgene fra `ml-bg.js` er maskert. De tegnes etter tiden siden skriptet startet, og originalen laster skriptet litt senere. Til vanlig beveger de seg hele tiden.

## Ikke verifisert
- Ekte API og Vercel Blob. Det falske API-et følger kontrakten, men ekte feilmeldinger og tilganger er ikke testet.
