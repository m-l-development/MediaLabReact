# Verktøy 3: Mockups

Status: ferdig og verifisert.

- `media-lab-react/mockups.dc.html` + `src/pages/mockups/` (generert fra `media-lab/mockups.dc.html`).
- `mockup-engine.js` og `ml-share.js` importeres fra `media-lab/` i samme rekkefølge som i `<helmet>`.
- En konsollfeil fra dc-runtime forsvinner i React: `<polygon points="{{ quadPts }}">`. Nettleseren leste den rå malen før runtimen skjulte den. `tests/compare.spec.js` tar slike `{{ … }}`-feil ut av grunnlinjen.

## Verifisering
- `tests/compare.spec.js`: skjermbildene er like grunnlinjen (mørk/lys × desktop/mobil).
- `tests/mockups.spec.js` (felles hjelper `tests/parity.js`): 26 steg kjøres likt på originalen og React. Stegene er galleri, kategorier, åpne mockup, last opp design, fyll/vis hele, zoom/flytt, skygger/glans, bakgrunnsfarge, forgrunn av/på, juster og dra hjørner, last ned PNG og JPG, kopier, finn automatisk, tilbakestill, neste/forrige, tilbake, fjern design, legg til og slett egne mockup-bilder (IndexedDB `mockuplib`), engelsk og lys modus. Tekst og skjermbilde er like etter hvert steg. **Nedlastede PNG/JPG er byte for byte like** (SHA-1).
- Bakgrunnsbølgene fra `ml-bg.js` er maskert (`ML_BG` i `parity.js`), fordi de tegnes etter tiden siden skriptet startet.

## Andre tester lagt til
- `tests/animasjon.spec.js`: testen styrer tiden selv (`performance.now` og `requestAnimationFrame`). Bakgrunnsanimasjonen på forsiden er byte for byte lik i 10 s i mørk og lys modus.
- `paritet/`: klikktest som sammenligner to versjoner av `media-lab/` (`FOER_DIR`/`NAA_DIR`). Etter oppryddingen ga 663 klikk på alle sider samme resultat før og etter.
