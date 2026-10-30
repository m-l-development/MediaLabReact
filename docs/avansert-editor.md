# Avansert modus: LightCraft (Photo Design) og FilmCraft (Motion Design)

Status 2026-10-30: **Valgt: selvstendig implementasjon.** LightCraft og FilmCraft brukes bare som funksjonelle referanser;
ingen kode, pakker eller kjøretidsavhengigheter fra dem. Kartleggingen under er grunnlaget.

## 1. Hva referanseprosjektene er

| | LightCraft (`storytold/lightcraft`) | FilmCraft (`storytold/filmcraft`) |
|---|---|---|
| Hva | Fotobibliotek og raw-framkalling (ikke-destruktiv), som Lightroom | Profesjonell ikke-lineær videoredigerer, som Premiere |
| Språk og grensesnitt | Ren Rust, 29 crates; grensesnitt i egui | Ren Rust, 50 crates (egne kodeker, lyd-DSP, GPU-kompositor); egui |
| Nett | `lightcraft-web`: hele appen som WASM i en canvas (WebGL/glow), OPFS for biblioteket | `filmcraft-web`: hele appen som WASM (WebGPU, ellers WebGL2), OPFS, WebCodecs, WebAudio |
| Ferdig nettpakke | `lightcraft-web-0.15.0.zip`: 33 MB wasm (8,4 MB brotli) + 16 MB kinesisk skrift | `filmcraft-web-0.14.0.zip`: 44 MB wasm |
| API mot JavaScript | `start()`, `command(id, json)`: **alle motorkommandoer** (se under) | Bare `start()`: ingen kommando- eller meldings-API |
| Lisens | MIT OR Apache-2.0; skrifter OFL-1.1. GPL-3.0 og SAM3 gjelder bare valgfrie AI-modeller som **ikke** er i pakken | MIT OR Apache-2.0; skrifter OFL-1.1, CC0 |
| Modenhet (egen vurdering) | «Young and moving fast» | «Feature breadth ~86 %, ready for real work ~56 %» |

Ingen av dem er React-komponenter. Gjenbruk må skje på WASM-nivå: enten de ferdige nettappene, eller egne
WASM-bindinger til enkelte crates (krever Rust-verktøy, som ikke er installert på maskinen).

## 2. Funksjonsregister (gruppert; kilde: kommandoregisteret og README)

Status: **F** = implementert i referansen (kommando finnes / dokumentert), **D** = delvis/eksperimentelt i nett.
Gjenbruk: **N** = via ferdig nettapp uten kodeendring, **A** = krever adapter i MediaLabReact, **R** = måtte skrives på nytt.

### LightCraft → Photo Design «Avansert»

| Gruppe | Funksjoner (kommandoer) | Status | Gjenbruk | Merknad / test |
|---|---|---|---|---|
| Framkalling | `develop.adjust/set/get/auto/wb/curve/profile/treatment/hdr/merge/targeted`: eksponering, kontrast, hvitbalanse, høylys/skygger, kurver, profiler, HDR-sammenslåing, lokale justeringer | F | N | Test: åpne bilde, endre eksponering, eksportere, sammenligne |
| Beskjæring | `crop.set/aspect/angle/straighten/geometry/reset` | F | N | |
| Synkronisering | `develop.copy/paste/sync/reset` | F | N | |
| Angre/gjør om | `edit.undo/redo` | F | N | |
| Visning | sammenligning, histogram, navigator, klipping, zoom, filmstrip | F | N | |
| Bibliotek | import, mapper, filtre, sortering, vurdering, flagg, etiketter | F | N | Biblioteket ligger i nettleserens OPFS (kan slettes av nettleseren; appen har «Back Up Library») |
| Eksport | `export.jpg/png/quality/ppi/presets`, `photo.jpg/png/tif` | F | N + A | A: resultatet må tilbake til «Dine medier» |
| AI-masker, støyfjerning | SAM3 / RawNIND | D | – | Modeller lastes separat, egne lisenser (ikke-OSI / GPL-3.0): **holdes utenfor** |
| Lag og komposisjon, tekst, former | – | Finnes ikke i LightCraft | – | Dette er Photo Designs eksisterende styrke; beholdes der |

### FilmCraft → Motion Design «Avansert»

| Gruppe | Funksjoner | Status | Gjenbruk | Merknad |
|---|---|---|---|---|
| Tidslinje | flere spor, innsetting/overskriving, ripple/roll/slip/slide/razor, markører, zoom, snapping, tick-presis tid | F | N | |
| Bevegelse | posisjon, skala, rotasjon, opasitet, 26 blandemoduser, keyframes (lineær, Bezier, hold, ease) | F | N | |
| Farge | grunnkorreksjon, kurver, fargehjul, HSL sekundær, vignett, looks | F | N | |
| Effekter og overganger | 90+ effekter, ~30 overganger | F | N | |
| Lyd | mikser, EQ, dynamikk, loudness (EBU R128), automasjon | F | N | |
| Tekst/teksting | tekstmotor, form- og pennverktøy, SRT/WebVTT/SCC | F | N | |
| Eksport | H.264 MP4 + AAC (egen koder), ProRes, PNG-sekvens; bakgrunnsjobber med fremdrift | F (nett: D) | N + A | A: resultatet tilbake til «Dine medier» |
| Prosjektlagring | atomisk lagring, autosave, krasjgjenoppretting (OPFS i nett) | F | N | |
| Utveksling | FCP7 XML, FCPXML, OTIO, EDL, AAF, OMF | F | N | |
| Nedtelling, splitting med video i midten (TB-EB63E9) | razor + flere spor + bilde-i-bilde (motion) dekker arbeidsflyten | F | N | Nedtellingsgenerator finnes ikke som egen funksjon: lages i Motion Design og importeres |

## 3. Arkitektur (anbefaling)

1. **Direkte gjenbruk av de ferdige nettappene, uendret.** Ingen kopiert kildekode, ingen omskriving. Versjon og
   SHA-256 for hver zip låses; lisenser og `NOTICE` følger med.
2. **Isolert vert per editor**: hver app i en egen `<iframe>`, startet fra «Avansert» i Photo Design / Motion Design.
   Feil eller minnebruk i én editor påvirker ikke resten av appen, og det blir ett tydelig «← Tilbake».
3. **Bro (adapter) i MediaLabReact**: et lite JS-lag i iframe-siden som
   - tar imot et bilde/en video fra Photo Design / Motion Design eller «Dine medier» og legger det inn i appen
     (LightCraft: import + `command()`; FilmCraft: simulert slipp av filen),
   - fanger opp eksporten (nedlastingen) og leverer den tilbake til «Dine medier».
4. **Standardmodus er uendret.** Photo Design og Motion Design beholder egne prosjekter; de avanserte appene har egne
   bibliotek/prosjekter i OPFS. Ingen blanding av prosjektformater.

## 4. Beslutning (2026-10-30)

Funksjonene skrives selvstendig i MediaLabReact og legges i de eksisterende Avansert-modusene (standardmodus uendret).
De ferdige nettpakkene og WASM-integrasjon ble vurdert og forkastet (alternativene under er beholdt som dokumentasjon).

Implementert hittil (se commits på connecthub):
- Photo Design → Avansert: avansert framkalling (`web/src/features/photo-design/engine/develop.ts`): hvit-/svartpunkt, vibrance, klarhet, skarphet,
  auto-tone, histogram, før/etter, kopier/lim inn framkalling.
- «Avansert modus» ved Autolagring i Photo Design og Motion Design.

### Alternativene som ble vurdert

1. **Isolasjon (sikkerhet).** Innloggingsøkten (`ch.auth`) og «Dine medier» ligger i nettleserens lagring for
   appens domene. Kjøres tredjeparts-WASM på **samme domene**, kan den i prinsippet lese dem.
   - **A (anbefalt): eget domene** for editorene (f.eks. et eget Vercel-prosjekt/underdomene). Full funksjon (OPFS),
     ingen tilgang til økten. Broen bruker `postMessage` mellom domenene. Krever et nytt domene/prosjekt.
   - **B: samme domene** under `/app/vendor/…`, med låst versjon og hash. Enklest; tredjepartskoden får teknisk
     tilgang til økten og lokale data.
   - **C: sandkasse-iframe uten eget opphav.** Isolert, men OPFS virker ikke (LightCraft-biblioteket kan ikke lagres)
     og broen blir svært begrenset.
2. **CSP.** WASM krever `'wasm-unsafe-eval'` (og workers/blob for LightCraft) – bare for editorenes sti/domene, ikke for
   resten av appen.
3. **Størrelse og hosting.** ~77 MB WASM (komprimeres av Vercel); lagt som låste filer i repoet (valgt) i stedet for
   å hentes ved bygging.

Rust-verktøy trengs bare hvis vi senere vil bygge fra kilde i stedet for å bruke de publiserte pakkene.
