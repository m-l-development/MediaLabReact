# Fontbibliotek, designmaler og editorutvidelser – implementeringsoversikt

Levende oversikt for hele oppdraget (felles fontbibliotek, 151 Thumbnail-maler, 100 Photo Design-maler og
editorfunksjonene de trenger). Oppdateres etter hver fase. Sjekklisten for malene står nederst.

Status per fase: **Steg 1 (kartlegging) ferdig 2026-11-12.** **Fase 1 (fonter) implementert og testet 2026-11-12** (se Fase 1 – status). **Fase 2 (filtre F01–F13) implementert og testet 2026-11-12** (se Fase 2 – status). Fase 3 (Thumbnail-maler) neste.

## 1. Originalmaterialet (fasiten)

| Del | Kilde | Innhold |
|---|---|---|
| Fontbibliotek | artefakt «Fontbibliotek for designappen» | ca. 400 fonter med stil, bruksområde, lisens, snitt (R/B/I/BI), kilde; ca. 300 kan brukes, ca. 100 er merket rødt (lisens) |
| Fontvelger | artefakt «Fontvelger for Thumbnail Studio» (`app.js`, `app.css`, 12 fontfamilier som woff2) | demo av velgeren (søk, kategorier, forhåndsvisning); fontfilene er «Last ned selv»-fonter |
| Photo Design-maler | «Designmalsamling for fotoverktøy – Alle maler 001–100» | 100 maler, 5 kategorier à 20, 7 formater; implementeringsguide (fonter, fargesystem, bildefelt, effekter, formater, funksjonsliste) |
| Thumbnail-maler | «Thumbnail-maler for videoer», del 1, 2 og 3 | **151 maler** (50 + 50 + 51; del 3 er merket «101–151»), 1280 × 720, 6 kategorier; filtersystemet F01–F13 (del 3) |

Merk: oppdraget nevner 150 Thumbnail-maler, men materialet har 151 (del 3 er 101–151). Alle 151 implementeres.

### Slik er malene bygget
- **Photo:** hver mal er absolutt plassert HTML/CSS i ekte pikselstørrelse, med tre fargevariabler `--bg`
  (Bakgrunn), `--tx` (Tekst), `--ac` (Støttefarge); mellomtoner med `color-mix(..., var(--tx) n%, var(--bg))`.
  Bildefelt `.ph` («BILDE»). Effektklasser: `.grain`, `.grunge`, `.crumple`, `.vt/.vr`, `.waves`, `.barcode`,
  `.stars`; i tillegg konturtekst, glød, `clip-path`, sirkeltekst (SVG `textPath`). Under hver mal: referanse, bruk,
  fonter, farger, bildefelt, effekter og «Funksjoner».
- **Thumbnail:** `<article id="gen-01">` med tegning i 1280 × 720 og spesifikasjon: stil, fonter, farger, bilde
  (BILDE = foto som fyller feltet, UTKLIPT = utklipt PNG), overlay, «ved behov», effekter, roller (del 3).
- **Fonter i malene (40, alle Google Fonts med åpen lisens):** Anton, Archivo (inkl. bredde-aksen), Archivo Black,
  Bagel Fat One, Bebas Neue, Big Shoulders Display, Bodoni Moda, Bricolage Grotesque, Caveat, Cormorant Garamond,
  Courier Prime, DM Serif Display, Fraunces, Gloock, Hanken Grotesk, Inter, Inter Tight, Instrument Serif, JetBrains
  Mono, Josefin Sans, Kaushan Script, League Gothic, Lilita One, Montserrat, Mrs Saint Delafield, Oswald, Permanent
  Marker, Pinyon Script, Playfair Display, Poppins, Rozha One, Shrikhand, Six Caps, Space Grotesk, Space Mono, Syne,
  UnifrakturMaguntia, Unbounded, Yeseva One, Young Serif (+ Rubik Dirt i Photo-guidens fontliste).
- **Filtre F01–F13 (Thumbnail del 3, gjelder alle 151):** F01 Mørk bunn, F02 Mørk side, F03 Vignett, F04 Fargelag,
  F05 Duotone, F06 Svart-hvitt, F07 Uskarp, F08 Varm film, F09 Kald natt, F10 Korn, F11 Lysglød, F12 Raster,
  F13 Papir. Hvert filter har oppskrift (CSS) og justerbare parametere i materialet.

## 2. Eksisterende arkitektur (det som skal utvides, ikke byttes ut)

| Område | Filer | Merknad |
|---|---|---|
| Fontfiler | `media-lab/build/vendor.js` (`FONTS`), `media-lab/build/vendor-lock.json`, `/fonts/<navn>.css`, `/fonts/fonts.css` (lastes av `web/index.html`) | Fontsource-pakker fra npm, latin + latin-ext, SHA-384-lås. 9 fonter i dag |
| Photo Design | `features/photo-design/engine/model.ts` (FORMATS, FONTS, TEMPLATES, lag), `engine/palette.ts` (`tplDoc`, fargeskjema), `engine/render.ts`, `Props.tsx` (fontvalg), `Home.tsx` (malkort) | Formatene er de samme som malene bruker. Fargeskjema med tre roller (`scheme`) finnes. Lag: bilde, tekst, form, glød, effekt (`fx`) |
| Thumbnail Studio | `features/thumbnail-studio/engine/model.ts` (W 1920 × H 1080, FONTS m/ snitt, lag), `engine/layouts.ts` (grunnoppsett + 29 oppsett), `engine/render.ts`, `Dialogs.tsx` («Ny mal»/«Bytt oppsett»), `ctrl-defs.ts` (fontvalg) | Bildelag har lysstyrke/kontrast/metning, fargetone, avanserte justeringer (Avansert modus) og AI-utklipp |
| Motion Design | `features/motion-design/engine/model.ts` (FONTS), `fields.ts` (fontvalg), `MotionDesign.tsx` (forhåndslasting) | |
| Loop Studio | `features/loop-studio/controller.ts` (`cfg.font`, `/fonts/<navn>.css` i editor og i eksportert spiller) | Eksporten bygger inn fontens CSS: fontene må ligge selvhostet med samme filnavn |
| Effekter | `shared/fx/fx.ts` (sun, spot, moon, fire, smoke, veil, light, streak, atmos, bloom, leak, vign, parts) | Korn, slitt tekst, loddrett tekst finnes ikke |
| Avansert modus | `s.adv` / `data-adv-toggle` i Photo, Thumbnail, Motion, Loop | Additiv: Enkel modus er uendret når den er av |

### Skal ikke berøres
Navigasjon, innlogging/ConnectHub, Admin, deling, lagring/repo-format (bare nye valgfrie felt), eksisterende maler og
oppsett, eksisterende snarveier, Isolate Subject, Mockups, mediebiblioteket, byggeoppsett utenom fontlisten.

## 3. Teknisk plan

### Fase 1 – Felles fontbibliotek og fontvelger
- `shared/fonts/catalog.ts`: generert fra fontbiblioteket (navn, stil, bruksområder, kilde, lisens, snitt). Røde
  (lisens) tas ikke med i appen. Fonter uten fontfil i appen vises ikke i velgeren.
- Fontfiler: Google-fontene legges til i `vendor.js` (samme mekanisme og lås; bare nye linjer i låsen). Hver font får
  `/fonts/<navn>.css`; `fonts.css` beholder bare de 9 som lastes i dag (ingen ekstra nedlasting for eksisterende sider).
- `shared/fonts/loader.ts`: laster `/fonts/<navn>.css` og venter på fonten før tegning (editor, forhåndsvisning,
  eksport); hurtigbuffer per font; reserve-font fra kategorien.
- `shared/fonts/FontPicker.tsx`: søk, stil, bruksområde, forhåndsvisning, snitt. Erstatter nedtrekkslistene i
  Photo, Thumbnail, Motion (og Loop der fontvalget finnes). Eksisterende fontnavn i prosjekter er uendret.
- B/I bare når fonten har ekte snitt (`harStil`); ingen kunstig fet/kursiv (`font-synthesis: none` der det tegnes).
- «Last ned selv»-fontene: bare de som har fontfil i materialet (12) og kjent lisens. Se Åpne punkter.

#### Fase 1 – status
- 203 Google-fonter (alle med åpen lisens i fontbiblioteket) ligger selvdrevet i appen: 194 nye i `media-lab/build/vendor-fonts.json` (generert av `web/tools/fonts-gen.mjs`), samme byggemekanisme og SHA-384-lås som før (låsen fikk 1160 nye linjer, ingen endret). 21,9 MB fontfiler, lastes bare ved bruk; `fonts.css` er uendret (de 9 som lastes på alle sider).
- Alle 41 fontene malene bruker er med. Katalog: `web/src/shared/fonts/catalog.json` (snitt og vekter lest fra fontfilene).
- Ny felles tjeneste `shared/fonts/` (`catalog.ts`, `loader.ts`, `FontPicker.tsx`). Fontvelgeren erstatter nedtrekkslistene i Photo Design, Thumbnail Studio, Motion Design (tekst og undertekster) og Loop Studio; appens egne fonter står øverst.
- Vekter: bare de fonten har (en vekt et eksisterende prosjekt bruker, vises alltid). Kursiv i Motion: av når fonten mangler ekte kursiv (står den på fra før, kan den slås av). Eksisterende prosjekter tegnes som før.
- Tegning og eksport venter på fontene: Photo (editor, maler på startsiden, PNG/JPG, PDF), Thumbnail (`ensureFonts`), Motion (åpning, eksport), Loop (editor; eksportert spiller bygger inn fontens CSS, nå også navn med tall).
- Motion godtok bare sine 7 fonter ved lasting; nå også bibliotekets (ukjente fonter blir Archivo som før).
- Ikke med ennå: «Last ned selv»-fontene (153). Materialet har fontfiler for 12 familier, men ikke lisensfilene (OFL krever at lisensen følger fonten). Tas med når lisensfilene er på plass.
- Tester: `shared/fonts/catalog.test.ts` (lisens, malfonter, snitt, Motion-lasting), `e2e/fonts.spec.ts` (alle fire apper på PC, Photo på mobil, lagring og gjenåpning).

### Fase 2 – Thumbnail: filtre F01–F13
- Nytt valgfritt felt på bildelag: `filters: { id, on, …parametere }[]` (mangler = ingen, gamle prosjekter uendret).
- Tegnes i rekkefølge i `engine/render.ts` (canvas), samme i forhåndsvisning og eksport; parametere og standardverdier
  nøyaktig fra materialet.

#### Fase 2 – status
- `web/src/features/thumbnail-studio/engine/filters.ts`: de 13 filtrene med parametere og standardverdier fra materialet (CSS i 1280 × 720; mål i piksler × 1,5 i 1920-dokumentet). Korn (F10, F13) er materialets SVG-støy (feTurbulence .85, 3 oktaver, 240 px-rute).
- Tegning (`render.ts`, `drawPic`): uten filtre nøyaktig som før. Med filtre tegnes bildet i et eget lerret: pikselfiltre (svart-hvitt, duotone, uskarp, varm, kald) i rekkefølge, så overleggene, og til slutt klippes alt til bildets egen form/alfa. Originalbildet endres aldri; samme kode for lerret, forhåndsvisning og eksport.
- Lagring: valgfritt felt `filters` på bildelag, kontrollert ved åpning (`cleanFilters` i `backup.ts`: ukjente filtre og verdier utenfor området forkastes). Eldre maler uten feltet er uendret.
- Panel: «Filtre» under «Bildejusteringer» for bilder (ikke ensfargede logoer), i både Enkel og Avansert modus – et tillegg, ingen eksisterende kontroller er flyttet. Legg til, slå av/på, juster, flytt opp/ned, fjern; hvert steg kan angres.
- Standardverdier som materialet ikke oppgir (nøytrale; malene i fase 3 setter sine egne): F04 farge #f5b800, F05 mørk #000000 / lys #ffffff, F10 styrke 35 %, F11 farge #ffffff / styrke 100 %, F13 papirfarge #f1ece2 og vignett 50 %.
- Tester: `engine/filters.test.ts` (standardverdier, rydding, pikselfilter, lagring/åpning, engelske tekster), `e2e/thumbnail-filters.spec.ts` (PC: piksler på lerretet, av/på, rekkefølge, fjern, lagre/åpne, eksport; hvert av de 13 filtrene endrer bildet og fjerning gir originalen; mobil: filter i Rediger-skuffen).

### Fase 3 – Thumbnail: 151 maler
- Malene **måles fra originalene** i en nettleser (posisjon, størrelse, font, snitt, størrelse, sperring, farge,
  rotasjon, radius, gradient) og gjøres om til lag (generator i `web/tools/`, utdata i `engine/templates/`), så
  verdiene er de samme som i designet. 1280 → 1920 (× 1,5) i generatoren.
- BILDE → bildelag (cover), UTKLIPT → bildelag med rolle «person» (dagens AI-utklipp). Fargeroller → malens tre farger.
- Visuell kontroll: originalen (HTML) og appens tegning sammenlignes piksel for piksel per mal, med terskel og rapport.
- Malvelger: nye kategorier i «Ny mal» ved siden av dagens oppsett.

### Fase 4 – Photo Design: manglende editorfunksjoner
Generelle funksjoner (ikke knyttet til maler), valgfrie felt på lagene: korn (overlegg), slitt tekst (grunge-maske),
loddrett tekst, klippemaske/polygon, glød (farget uskarp skygge), tekstur i tekst, sirkeltekst, strekkode, konturtekst,
blandingsmodus m.m. – endelig liste fra «Funksjoner»-linjene (se Photo-guiden, punkt 6) mot det som finnes.

### Fase 5 – Photo Design: 100 maler
Samme metode som fase 3 (måling fra originalene, generator, visuell kontroll). `--bg/--tx/--ac` → malens
fargeskjema (Bakgrunn/Tekst/Støttefarge), så fargevelgeren virker. `.ph` → bildelag.

## 4. Åpne punkter og risiko
- **«Last ned selv»-fonter (ca. 150):** materialet har fontfiler for 12 familier. Resten må lastes ned fra kildene
  før de kan brukes; til da vises de ikke i velgeren (ingen font uten fil eller lisens).
- **Lisensfiler for de 12:** OFL krever at lisensen følger fonten; materialet har ikke OFL.txt for disse.
- **Størrelse:** alle Google-fonter i biblioteket som selvhostede filer gir anslagsvis 20–40 MB i deployen (lastes
  bare ved bruk). Måles i fase 1.
- **Avansert/Enkel modus:** plassering vurderes per funksjon i hver fase og dokumenteres her.

## 5. Sjekkliste
Status: Ikke startet · Under arbeid · Implementert · Testet · Godkjent

### Thumbnail Studio (151)

| Kode | Del | Kategori | Navn | Status |
|---|---|---|---|---|
| GEN-01 | 1 | Generell video | Markert ord | Ikke startet |
| GEN-02 | 1 | Generell video | Håndskrift | Ikke startet |
| GEN-03 | 1 | Generell video | Podkast-kort | Ikke startet |
| GEN-04 | 1 | Generell video | Figur foran tittel | Ikke startet |
| GEN-05 | 1 | Generell video | Stort spørsmål | Ikke startet |
| GEN-06 | 1 | Generell video | Polaroid-vlogg | Ikke startet |
| GEN-07 | 1 | Generell video | Vitnesbyrd | Ikke startet |
| GEN-08 | 1 | Generell video | Kapittel | Ikke startet |
| GEN-09 | 1 | Generell video | Notatblokk | Ikke startet |
| GEN-10 | 1 | Generell video | Sveitsisk | Ikke startet |
| bib-01 | 1 | Bibelvideo | Klassisk vers | Ikke startet |
| bib-02 | 1 | Bibelvideo | Landskap og serif | Ikke startet |
| bib-03 | 1 | Bibelvideo | Avisside | Ikke startet |
| bib-04 | 1 | Bibelvideo | Bok i Bibelen | Ikke startet |
| bib-05 | 1 | Bibelvideo | Kollasj med ekko | Ikke startet |
| bib-06 | 1 | Bibelvideo | Revne fjell | Ikke startet |
| bib-07 | 1 | Bibelvideo | Lerret og bølge | Ikke startet |
| bib-08 | 1 | Bibelvideo | Leseplan | Ikke startet |
| bib-09 | 1 | Bibelvideo | Blått vindu | Ikke startet |
| live-01 | 1 | Direktesending | Søndag direkte | Ikke startet |
| live-02 | 1 | Direktesending | Lys og rolig | Ikke startet |
| live-03 | 1 | Direktesending | Lovsangskveld | Ikke startet |
| live-04 | 1 | Direktesending | Nattverd | Ikke startet |
| live-05 | 1 | Direktesending | Dåp | Ikke startet |
| live-06 | 1 | Direktesending | Høytid – jul | Ikke startet |
| live-07 | 1 | Direktesending | Høytid – påske | Ikke startet |
| live-08 | 1 | Direktesending | Klokkeslett | Ikke startet |
| live-09 | 1 | Direktesending | Bildestripe | Ikke startet |
| pro-01 | 1 | Promo | Ungdomskveld | Ikke startet |
| pro-02 | 1 | Promo | Konferanse med talere | Ikke startet |
| pro-03 | 1 | Promo | Fjell og gradient | Ikke startet |
| pro-04 | 1 | Promo | Sol og sirkel | Ikke startet |
| pro-05 | 1 | Promo | Kurs | Ikke startet |
| pro-06 | 1 | Promo | Ukentlig samling | Ikke startet |
| pro-07 | 1 | Promo | Uskarp fargesky | Ikke startet |
| pro-08 | 1 | Promo | Revet papir | Ikke startet |
| trl-01 | 1 | Trailer | Spotlys og silhuett | Ikke startet |
| trl-02 | 1 | Trailer | Lysstråle | Ikke startet |
| trl-03 | 1 | Trailer | Scene på gulv | Ikke startet |
| trl-04 | 1 | Trailer | Strømmende bånd | Ikke startet |
| trl-05 | 1 | Trailer | Kinoformat | Ikke startet |
| trl-06 | 1 | Trailer | Duotone grunge | Ikke startet |
| trl-07 | 1 | Trailer | Dokumentar | Ikke startet |
| tsr-01 | 1 | Teaser | Snart | Ikke startet |
| tsr-02 | 1 | Teaser | Nedtelling | Ikke startet |
| tsr-03 | 1 | Teaser | Lysstripe | Ikke startet |
| tsr-04 | 1 | Teaser | Skjult ord | Ikke startet |
| tsr-05 | 1 | Teaser | Tittel med ekko | Ikke startet |
| tsr-06 | 1 | Teaser | To sirkler | Ikke startet |
| tsr-07 | 1 | Teaser | Bilde i bokstaver | Ikke startet |
| GEN-11 | 2 | Generell video | Kantlys | Ikke startet |
| GEN-12 | 2 | Generell video | Fiskeøye | Ikke startet |
| GEN-13 | 2 | Generell video | Filmfoto og oransje | Ikke startet |
| GEN-14 | 2 | Generell video | Elektrisk blå | Ikke startet |
| GEN-15 | 2 | Generell video | Studieark | Ikke startet |
| GEN-16 | 2 | Generell video | Frostet glass | Ikke startet |
| GEN-17 | 2 | Generell video | Delt duotone | Ikke startet |
| GEN-18 | 2 | Generell video | Kamerasøker | Ikke startet |
| GEN-19 | 2 | Generell video | Magasinforside | Ikke startet |
| bib-10 | 2 | Bibelvideo | Mørk avisvegg | Ikke startet |
| bib-11 | 2 | Bibelvideo | Swash-bokstaver | Ikke startet |
| bib-12 | 2 | Bibelvideo | Stillhet ved sjøen | Ikke startet |
| bib-13 | 2 | Bibelvideo | Fjellag | Ikke startet |
| bib-14 | 2 | Bibelvideo | Markert vers | Ikke startet |
| bib-15 | 2 | Bibelvideo | Bokstavgitter | Ikke startet |
| bib-16 | 2 | Bibelvideo | Buevindu | Ikke startet |
| bib-17 | 2 | Bibelvideo | Ord for ord | Ikke startet |
| bib-18 | 2 | Bibelvideo | Bibelquiz | Ikke startet |
| live-10 | 2 | Direktesending | Bønnenatt | Ikke startet |
| live-11 | 2 | Direktesending | Scenelys | Ikke startet |
| live-12 | 2 | Direktesending | TV-grafikk | Ikke startet |
| live-13 | 2 | Direktesending | Dåp ved sjøen | Ikke startet |
| live-14 | 2 | Direktesending | Kalenderblokk | Ikke startet |
| live-15 | 2 | Direktesending | Adventslys | Ikke startet |
| live-16 | 2 | Direktesending | Neonskilt | Ikke startet |
| live-17 | 2 | Direktesending | Pinseild | Ikke startet |
| pro-09 | 2 | Promo | Neonpublikum | Ikke startet |
| pro-10 | 2 | Promo | Fem talere | Ikke startet |
| pro-11 | 2 | Promo | Billett | Ikke startet |
| pro-12 | 2 | Promo | Plakatvegg | Ikke startet |
| pro-13 | 2 | Promo | Middagsbord | Ikke startet |
| pro-14 | 2 | Promo | Fargeblokker | Ikke startet |
| pro-15 | 2 | Promo | Vi trenger deg | Ikke startet |
| pro-16 | 2 | Promo | Familiedag | Ikke startet |
| trl-08 | 2 | Trailer | Studio-samtale | Ikke startet |
| trl-09 | 2 | Trailer | Planetkant | Ikke startet |
| trl-10 | 2 | Trailer | VHS | Ikke startet |
| trl-11 | 2 | Trailer | Døråpning | Ikke startet |
| trl-12 | 2 | Trailer | Filmrull | Ikke startet |
| trl-13 | 2 | Trailer | Lystunnel | Ikke startet |
| trl-14 | 2 | Trailer | Regn på ruten | Ikke startet |
| trl-15 | 2 | Trailer | Rulletekst | Ikke startet |
| tsr-08 | 2 | Teaser | Blå sky | Ikke startet |
| tsr-09 | 2 | Teaser | Sensurert | Ikke startet |
| tsr-10 | 2 | Teaser | Nøkkelhull | Ikke startet |
| tsr-11 | 2 | Teaser | Laster inn | Ikke startet |
| tsr-12 | 2 | Teaser | Kryss av dagene | Ikke startet |
| tsr-13 | 2 | Teaser | Hvem er gjesten? | Ikke startet |
| tsr-14 | 2 | Teaser | Stempel | Ikke startet |
| tsr-15 | 2 | Teaser | Soloppgang i tekst | Ikke startet |
| GEN-20 | 3 | Generell video | Mørk markør | Ikke startet |
| GEN-21 | 3 | Generell video | Lampelys | Ikke startet |
| GEN-22 | 3 | Generell video | Kursplakat | Ikke startet |
| GEN-23 | 3 | Generell video | Stort tall | Ikke startet |
| GEN-24 | 3 | Generell video | Fire hjørner | Ikke startet |
| GEN-25 | 3 | Generell video | Gul duotone | Ikke startet |
| GEN-26 | 3 | Generell video | Lyst studio | Ikke startet |
| GEN-27 | 3 | Generell video | Halvt ansikt | Ikke startet |
| GEN-28 | 3 | Generell video | Klassisk foredrag | Ikke startet |
| bib-19 | 3 | Bibelvideo | Offerets lys | Ikke startet |
| bib-20 | 3 | Bibelvideo | Gotisk kollasj | Ikke startet |
| bib-21 | 3 | Bibelvideo | To sirkler | Ikke startet |
| bib-22 | 3 | Bibelvideo | Kongen kommer | Ikke startet |
| bib-23 | 3 | Bibelvideo | Grønn eng | Ikke startet |
| bib-24 | 3 | Bibelvideo | Pergament | Ikke startet |
| bib-25 | 3 | Bibelvideo | Høy og smal | Ikke startet |
| bib-26 | 3 | Bibelvideo | Håp-stabel | Ikke startet |
| bib-27 | 3 | Bibelvideo | Galater-lag | Ikke startet |
| live-18 | 3 | Direktesending | Søndag i scenelys | Ikke startet |
| live-19 | 3 | Direktesending | Ren dato | Ikke startet |
| live-20 | 3 | Direktesending | Varm sky | Ikke startet |
| live-21 | 3 | Direktesending | Høymesse | Ikke startet |
| live-22 | 3 | Direktesending | Dåp og lime | Ikke startet |
| live-23 | 3 | Direktesending | Kveldsmøte | Ikke startet |
| live-24 | 3 | Direktesending | Taler i fokus | Ikke startet |
| live-25 | 3 | Direktesending | Nyttårsbønn | Ikke startet |
| pro-17 | 3 | Promo | Ungdomskveld varm | Ikke startet |
| pro-18 | 3 | Promo | Fjellkonferanse | Ikke startet |
| pro-19 | 3 | Promo | Talerrad | Ikke startet |
| pro-20 | 3 | Promo | Lovsangsplakat | Ikke startet |
| pro-21 | 3 | Promo | Julebasar | Ikke startet |
| pro-22 | 3 | Promo | Kvinnefrokost | Ikke startet |
| pro-23 | 3 | Promo | Sommerleir | Ikke startet |
| pro-24 | 3 | Promo | Gospelkonsert | Ikke startet |
| trl-16 | 3 | Trailer | Kortfilm-tittel | Ikke startet |
| trl-17 | 3 | Trailer | Tre kapitler | Ikke startet |
| trl-18 | 3 | Trailer | Fart | Ikke startet |
| trl-19 | 3 | Trailer | Blått rektangel | Ikke startet |
| trl-20 | 3 | Trailer | Gyllen time | Ikke startet |
| trl-21 | 3 | Trailer | Før og etter | Ikke startet |
| trl-22 | 3 | Trailer | Mosaikk | Ikke startet |
| trl-23 | 3 | Trailer | Stjernehimmel | Ikke startet |
| tsr-16 | 3 | Teaser | Skisseark | Ikke startet |
| tsr-17 | 3 | Teaser | Kontur-rekke | Ikke startet |
| tsr-24 | 3 | Teaser | Kontur-rekke med tittel | Ikke startet |
| tsr-18 | 3 | Teaser | Ute av fokus | Ikke startet |
| tsr-19 | 3 | Teaser | Gotisk dato | Ikke startet |
| tsr-20 | 3 | Teaser | Svakt lys | Ikke startet |
| tsr-21 | 3 | Teaser | Halvt avduket | Ikke startet |
| tsr-22 | 3 | Teaser | Manglende brikke | Ikke startet |
| tsr-23 | 3 | Teaser | Signatur | Ikke startet |

### Photo Design (100)

| Nr | Kategori | Navn | Format | Status |
|---|---|---|---|---|
| 001 | Arrangement og plakater | Søndag – tre felt | Instagram 4:5 · 1080×1350 | Ikke startet |
| 002 | Arrangement og plakater | Konsert – fotostriper | A4 plakat · 2480×3508 | Ikke startet |
| 003 | Arrangement og plakater | Første onsdag | Instagram 4:5 · 1080×1350 | Ikke startet |
| 004 | Arrangement og plakater | Vekkelsesmøte – glød | Story 9:16 · 1080×1920 | Ikke startet |
| 005 | Arrangement og plakater | Bønnenatt – bred tittel | Story 9:16 · 1080×1920 | Ikke startet |
| 006 | Arrangement og plakater | Oppstart – rød tittel | Instagram 4:5 · 1080×1350 | Ikke startet |
| 007 | Arrangement og plakater | Hold av datoen | Instagram 4:5 · 1080×1350 | Ikke startet |
| 008 | Arrangement og plakater | Lederkveld – blå håndskrift | Instagram 4:5 · 1080×1350 | Ikke startet |
| 009 | Arrangement og plakater | Konferanse – pensel diagonal | Story 9:16 · 1080×1920 | Ikke startet |
| 010 | Arrangement og plakater | Invitasjon – kvittering | Story 9:16 · 1080×1920 | Ikke startet |
| 011 | Arrangement og plakater | Parkveld – rust | Story 9:16 · 1080×1920 | Ikke startet |
| 012 | Arrangement og plakater | Bønneuke – høy kondensert | Story 9:16 · 1080×1920 | Ikke startet |
| 013 | Arrangement og plakater | Søndag – buet form | Story 9:16 · 1080×1920 | Ikke startet |
| 014 | Arrangement og plakater | Søndag ettermiddag – rød | Story 9:16 · 1080×1920 | Ikke startet |
| 015 | Arrangement og plakater | Etter mørket – glød | Instagram 4:5 · 1080×1350 | Ikke startet |
| 016 | Arrangement og plakater | Horisont – retreat | A4 plakat · 2480×3508 | Ikke startet |
| 017 | Arrangement og plakater | Bue – stillhetskveld | A4 plakat · 2480×3508 | Ikke startet |
| 018 | Arrangement og plakater | Frokostmøte – konturtall | Story 9:16 · 1080×1920 | Ikke startet |
| 019 | Arrangement og plakater | Bølgekolonne – pinsemøte | Story 9:16 · 1080×1920 | Ikke startet |
| 020 | Arrangement og plakater | Bibeldagen – script over tittel | Story 9:16 · 1080×1920 | Ikke startet |
| 021 | Program, ukeplan og kalender | Hva skjer denne uka | Story 9:16 · 1080×1920 | Ikke startet |
| 022 | Program, ukeplan og kalender | Kommende arrangementer | Instagram 4:5 · 1080×1350 | Ikke startet |
| 023 | Program, ukeplan og kalender | Arrangementskalender – kort | Instagram 4:5 · 1080×1350 | Ikke startet |
| 024 | Program, ukeplan og kalender | Aktivitetsplan – fet + tynn | Instagram 4:5 · 1080×1350 | Ikke startet |
| 025 | Program, ukeplan og kalender | Program – loddrett tittel | Instagram 4:5 · 1080×1350 | Ikke startet |
| 026 | Program, ukeplan og kalender | Konferanseprogram – tabell | A4 plakat · 2480×3508 | Ikke startet |
| 027 | Program, ukeplan og kalender | Kommende konserter – diagonal | Instagram 4:5 · 1080×1350 | Ikke startet |
| 028 | Program, ukeplan og kalender | Datofaner – rød | Story 9:16 · 1080×1920 | Ikke startet |
| 029 | Program, ukeplan og kalender | Tidslinje – to scener | Story 9:16 · 1080×1920 | Ikke startet |
| 030 | Program, ukeplan og kalender | Månedsplakat – DESEMBER | Instagram 4:5 · 1080×1350 | Ikke startet |
| 031 | Program, ukeplan og kalender | Dagens program – story | Story 9:16 · 1080×1920 | Ikke startet |
| 032 | Program, ukeplan og kalender | Dagsprogram – ryggrad | Story 9:16 · 1080×1920 | Ikke startet |
| 033 | Program, ukeplan og kalender | Ukeplan – lys pille | Instagram 4:5 · 1080×1350 | Ikke startet |
| 034 | Program, ukeplan og kalender | Vaktliste – skjerm | 16:9 · 1920×1080 | Ikke startet |
| 035 | Program, ukeplan og kalender | Ukens møter – mørke kort | Story 9:16 · 1080×1920 | Ikke startet |
| 036 | Program, ukeplan og kalender | Seminarplan – skjerm | 16:9 · 1920×1080 | Ikke startet |
| 037 | Program, ukeplan og kalender | Månedskalender – rutenett | Instagram 4:5 · 1080×1350 | Ikke startet |
| 038 | Program, ukeplan og kalender | Åpningstider – uke | Story 9:16 · 1080×1920 | Ikke startet |
| 039 | Program, ukeplan og kalender | Turnéplan – faner | Instagram 4:5 · 1080×1350 | Ikke startet |
| 040 | Program, ukeplan og kalender | Møteplan – sveitsisk | A4 plakat · 2480×3508 | Ikke startet |
| 041 | Festival og konsert | Festival – lineup serif | Instagram 4:5 · 1080×1350 | Ikke startet |
| 042 | Festival og konsert | Festivalprogram – 16:9 | 16:9 · 1920×1080 | Ikke startet |
| 043 | Festival og konsert | Konsertserie – story | Story 9:16 · 1080×1920 | Ikke startet |
| 044 | Festival og konsert | Lovsangskveld – grunge | Story 9:16 · 1080×1920 | Ikke startet |
| 045 | Festival og konsert | Ungdomsfestival – oransje | Story 9:16 · 1080×1920 | Ikke startet |
| 046 | Festival og konsert | Konsert – glød | Instagram 4:5 · 1080×1350 | Ikke startet |
| 047 | Festival og konsert | Sommerfest – himmel | Instagram 4:5 · 1080×1350 | Ikke startet |
| 048 | Festival og konsert | Festival – hold av datoen | Story 9:16 · 1080×1920 | Ikke startet |
| 049 | Festival og konsert | Lineup – mørk story | Story 9:16 · 1080×1920 | Ikke startet |
| 050 | Festival og konsert | Festival – diagonal gul | Instagram 4:5 · 1080×1350 | Ikke startet |
| 051 | Festival og konsert | Konsert – loddrett rød | Instagram 4:5 · 1080×1350 | Ikke startet |
| 052 | Festival og konsert | Korkonsert – klassisk | A3 plakat · 3508×4961 | Ikke startet |
| 053 | Festival og konsert | Julekonsert – rust | A4 plakat · 2480×3508 | Ikke startet |
| 054 | Festival og konsert | Festivaluke – kondensert | Instagram 4:5 · 1080×1350 | Ikke startet |
| 055 | Festival og konsert | Nattkonsert – glød | Story 9:16 · 1080×1920 | Ikke startet |
| 056 | Festival og konsert | Konsert – bred tittel | Instagram 4:5 · 1080×1350 | Ikke startet |
| 057 | Festival og konsert | Festivaldager – faner | Instagram 4:5 · 1080×1350 | Ikke startet |
| 058 | Festival og konsert | Gospelkveld – buet form | Instagram 4:5 · 1080×1350 | Ikke startet |
| 059 | Festival og konsert | Festivalprogram – to dager | A4 plakat · 2480×3508 | Ikke startet |
| 060 | Festival og konsert | Festivalpass – billett | Visittkort · 1004×650 | Ikke startet |
| 061 | Bibelvers, sitat og typografi | Salme – kornet mørk | Story 9:16 · 1080×1920 | Ikke startet |
| 062 | Bibelvers, sitat og typografi | Vers – lys kornet | Instagram 4:5 · 1080×1350 | Ikke startet |
| 063 | Bibelvers, sitat og typografi | Sitat – gode ting tar tid | Instagram 4:5 · 1080×1350 | Ikke startet |
| 064 | Bibelvers, sitat og typografi | Ett ord – HÅP | Instagram 4:5 · 1080×1350 | Ikke startet |
| 065 | Bibelvers, sitat og typografi | Didone – vers story | Story 9:16 · 1080×1920 | Ikke startet |
| 066 | Bibelvers, sitat og typografi | Bue – vers story | Story 9:16 · 1080×1920 | Ikke startet |
| 067 | Bibelvers, sitat og typografi | Script over ord – Nåde | Instagram 4:5 · 1080×1350 | Ikke startet |
| 068 | Bibelvers, sitat og typografi | Gjentatt ord – BE | Story 9:16 · 1080×1920 | Ikke startet |
| 069 | Bibelvers, sitat og typografi | Minimal overlegg – sitat | Story 9:16 · 1080×1920 | Ikke startet |
| 070 | Bibelvers, sitat og typografi | Loddrett ord – FRED | Instagram 4:5 · 1080×1350 | Ikke startet |
| 071 | Bibelvers, sitat og typografi | Ord med bildebånd – TILLIT | Instagram 4:5 · 1080×1350 | Ikke startet |
| 072 | Bibelvers, sitat og typografi | Håndskrift-markering – vers | Instagram 4:5 · 1080×1350 | Ikke startet |
| 073 | Bibelvers, sitat og typografi | Dagens ord – kvadrat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 074 | Bibelvers, sitat og typografi | Glød – vers kvadrat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 075 | Bibelvers, sitat og typografi | Stablet grått ord | Instagram 1:1 · 1080×1080 | Ikke startet |
| 076 | Bibelvers, sitat og typografi | Konturtall – Salme 23 | Instagram 4:5 · 1080×1350 | Ikke startet |
| 077 | Bibelvers, sitat og typografi | Loddrett serif – vers kvadrat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 078 | Bibelvers, sitat og typografi | Hjørnemerker – sitat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 079 | Bibelvers, sitat og typografi | Rotert sidetekst – vers | Instagram 1:1 · 1080×1080 | Ikke startet |
| 080 | Bibelvers, sitat og typografi | Nyttår – 2027 | Instagram 4:5 · 1080×1350 | Ikke startet |
| 081 | Hverdag, kafé, info og sosiale medier | Vi har åpent | Story 9:16 · 1080×1920 | Ikke startet |
| 082 | Hverdag, kafé, info og sosiale medier | Meny – ryggrad | Story 9:16 · 1080×1920 | Ikke startet |
| 083 | Hverdag, kafé, info og sosiale medier | Kirkekafé – stemning | Story 9:16 · 1080×1920 | Ikke startet |
| 084 | Hverdag, kafé, info og sosiale medier | Daglig story | Story 9:16 · 1080×1920 | Ikke startet |
| 085 | Hverdag, kafé, info og sosiale medier | Velkommen – nye medlemmer | Instagram 4:5 · 1080×1350 | Ikke startet |
| 086 | Hverdag, kafé, info og sosiale medier | Kvittering – takk for gaven | Story 9:16 · 1080×1920 | Ikke startet |
| 087 | Hverdag, kafé, info og sosiale medier | Infoplakat – dugnad | A4 plakat · 2480×3508 | Ikke startet |
| 088 | Hverdag, kafé, info og sosiale medier | Kursplan – kvadrat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 089 | Hverdag, kafé, info og sosiale medier | Kunngjøring – uskarp | Instagram 1:1 · 1080×1080 | Ikke startet |
| 090 | Hverdag, kafé, info og sosiale medier | Velkommen – skjerm | 16:9 · 1920×1080 | Ikke startet |
| 091 | Hverdag, kafé, info og sosiale medier | Taler – presentasjon | 16:9 · 1920×1080 | Ikke startet |
| 092 | Hverdag, kafé, info og sosiale medier | Nyhetsbrev – story | Story 9:16 · 1080×1920 | Ikke startet |
| 093 | Hverdag, kafé, info og sosiale medier | Kafémeny – liste | A4 plakat · 2480×3508 | Ikke startet |
| 094 | Hverdag, kafé, info og sosiale medier | Visittkort – moderne | Visittkort · 1004×650 | Ikke startet |
| 095 | Hverdag, kafé, info og sosiale medier | Visittkort – blå håndskrift | Visittkort · 1004×650 | Ikke startet |
| 096 | Hverdag, kafé, info og sosiale medier | Takk til frivillige – rulletekst | Instagram 4:5 · 1080×1350 | Ikke startet |
| 097 | Hverdag, kafé, info og sosiale medier | Endrede tider – kvadrat | Instagram 1:1 · 1080×1080 | Ikke startet |
| 098 | Hverdag, kafé, info og sosiale medier | Priser – diagonal | Instagram 4:5 · 1080×1350 | Ikke startet |
| 099 | Hverdag, kafé, info og sosiale medier | Jubileum – 50 ÅR | Instagram 4:5 · 1080×1350 | Ikke startet |
| 100 | Hverdag, kafé, info og sosiale medier | Vers på skjerm | 16:9 · 1920×1080 | Ikke startet |
