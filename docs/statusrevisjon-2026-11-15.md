# Statusrevisjon MediaLab – 2026-11-15

## FORTSETTELSE – les dette først (oppdatert 2026-11-16)

Permanent fortsettelsesnotat. Oppdateres ved hver avslutning/avbrudd. Detaljer og målinger står i seksjonene under.

**Siste kjente produksjonscommit:** `a7d10ca` (merge av `e61e12a`, Panorama; connecthub = main = prod, Release verify grønn 2026-11-16). Objektivkorreksjonen er i releasen etter denne. Kontroller før
videre arbeid: `git fetch` + `curl https://media-lab-react-vyef.vercel.app/app/version.json`.

**Ukommittert arbeid:** ingen. **Neste oppgave: punkt 7 (Motion: Music Sync + forlenge/forkorte maler, med tilleggene).**
- Eierens lokale filer holdes ALLTID utenfor: `web/e2e-dev/mockups-cloud-logo-dev.spec.ts`,
  `web/e2e/feature-gaps-2.spec.ts`, `web/e2e/site-pages.spec.ts`.

### Prioritert arbeidsliste (godkjent av eier – arbeid selvstendig)
1. **WebKit og mobil:** gå gjennom de gjenværende WebKit-feilene (`npx playwright test -c playwright.iphone.config.ts`).
   Skill reelle feil fra tidsavbrudd/emulering, rett reelle feil, kjør full regresjon. Fullfør mobilgjennomgangen av alle
   editorene (Thumbnail, Photo, Motion, Loop, Mockups, Isolate, QR) – funksjon, ikke bare utseende.
   - Kjør WebKit-suiten ALENE: andre Playwright-kjøringer samtidig sletter `test-results` (ENOENT) og gir tidsavbrudd.
   - Siste fulle kjøring (2026-11-16): **94 bestått / 4 feilet**; de fire er deretter rettet eller begrunnet hoppet over
     (se «Oppfølging 4»). Gjenstår i mobilgjennomgangen: Mockups, QR og Isolate har ingen kjente feil i WebKit, men er
     ikke gått gjennom manuelt skjerm for skjerm.
2. **Minne: ÅRSAK FUNNET OG RETTET i Chromium (2026-11-16).** `e2e-mem/bisect.spec.ts` (`-c e2e-mem/bisect.config.ts`)
   kjører hvert ledd i bildeveien alene. Resultat med et 3,0 MB PNG, per bilde, etter GC og kritisk minnepress:
   File 0 · sha256 0 · probe/miniatyr 0,3 · `assets.register` (inkl. IndexedDB) 0,3 · **`<img>` fra blob:-adresse
   4,05 MB (`partition_alloc`)** · det samme med/uten `decode()` og med `src` nullstilt etterpå: 4,05 · data:-adresse 1,0 ·
   **`createImageBitmap` 0**. 40 bilder: +178 MB, lineært, uten tak. Altså: Chromium beholder de kodede bytene
   (≈ filstørrelsen, rundet opp) for hvert bilde som lastes i et `<img>` fra en ny blob:-adresse – også etter
   `revokeObjectURL`, GC og minnepress; frigjøres først ved ny innlasting av siden. Det forklarer veksten i Photo,
   Thumbnail og Motion (alle laster bilder slik).
   **Tiltak (gjort):** `shared/lib/blob-image.ts` – i Chromium dekodes bildene som `ImageBitmap` (EXIF-retning fra
   bildet, vanlig fargekonvertering; kontrollert: JPEG med Orientation 6 gir samme mål og piksler som `<img>`). Brukt i
   Thumbnail (`engine/images.ts` ImageCache + panelets miniatyr via `shared/ui/PicThumb.tsx`), Photo (`loadImg`) og
   Motion (`setImg`, import-probe, miniatyr ved åpning; eksporten venter på dekodingen). SVG, feil og Safari/iPhone:
   vanlig `<img>` som før (uendret oppførsel der). `fetch` av blob:-adressen + bitmap: 0 MB vekst (målt).
   **Resultat** (`profile.spec.ts`, Photo + Thumbnail + Motion, 5 runder): sideprosessen 108 → 119 → 122 → 118 → 120 MB,
   `partition_alloc` flat ≈ 10 MB (før: ≈ +11 MB per runde for de tre). Thumbnail alene 6 runder: `partition_alloc`
   7,2 MB flat fra runde 2. Om Safari/iPhone har samme oppførsel kan ikke måles her (CDP-sporing finnes bare i
   Chromium) – IKKE VERIFISERT.
3. **iPhone (ekte enhet, gratis):** ingen ekte iPhone tilgjengelig → IKKE VERIFISERT. Eieren har en testplan (seksjonen
   «Oppfølging 3»). Gjelder: Motion-kort og «Fyll skjermen», store bilder/bildebytte/eksport, Isolate-kanter, fokus-zoom.
   - Isolate-maskekanter: `ctx.filter`-erstatningen dekker dem (hovedtråd, også OffscreenCanvas der den finnes);
     verifisert i WebKit (kanten blir myk). Tidligere påstand om at det ikke virket i Isolate var feil.
4. **New York:** fingerstrøk-modellen er committet (Motion-referansetestene består). Gjenstår: eiers visuelle godkjenning; eventuelt finjustere
   strøkenes form ytterligere mot originalen (`scratchpad`-verktøy: `qc/nyc.cjs`, `grab.cjs aee45477`).
5. **Panorama – FERDIG (2026-11-16), ikke verifisert på ekte iPhone.** Photo Design: «Panorama»-kort på startsiden,
   «Panorama …» under Legg til → Medier, «Lag panorama av valgte bilder» ved flere valgte bilder, «Rediger panorama …» på
   et panoramalag. Motor (egen kode, gratis, `engine/pano/`, i egen arbeidstråd): Harris-hjørner + BRIEF (tåler ulik
   eksponering), gjensidig samsvar med forholdstest, kamerarotasjon per par (RANSAC, Horn), synsvinkel fra EXIF (35 mm)
   eller beregnet (søk + finjustering mot alle innliere), spenntre + global finjustering, automatisk horisont,
   eksponeringsutjevning per kanal (normalisert mot medianbildet), projeksjon sylinder/kule/plan, sømblending (myk ↔ skarp),
   beskjæring automatisk (største rektangel uten tomme kanter) / hele (gjennomsiktig) / egen (dra ramme og hjørner).
   Manuelt: hele panoramaet (rotasjon, vipp, midtpunkt, brennvidde) og hvert bilde (sideveis, opp/ned, rotasjon, dra i
   forhåndsvisningen, ta ut/inn). Full oppløsning (PC ≤ 64 MP, iPhone ≤ 16 MP), JPEG 95 % (PNG ved tomme kanter);
   «Bruk» = nytt prosjekt i panoramaets størrelse eller nytt/byttet lag med oppskriften (`pano` på laget); «Last ned».
   Bilder som ikke overlapper, utelates med beskjed. Tester: `engine/pano/pano.test.ts` (ekte kameravisninger med kjent
   fasit: 4 bilder i tilfeldig rekkefølge – synsvinkel ±2°, gir ±0,4°, feil mot virkeligheten < 14/255; 20 % overlapp med
   vipp/rull – rotasjoner ±0,5°; mørkt/lyst bilde med gamma, støy, vignettering – eksponering utjevnet; fremmed bilde
   utelates; plan/kule/finjustering/EXIF); `e2e/photo-panorama.spec.ts` (ekte fotografi som scene: hele flyten
   legg til → juster → beskjær → Bruk → Rediger → Bruk; fem bilder med 0,35× og 1,45× eksponering og støy, nedlasting i
   full oppløsning kontrollert) – PC, mobil og WebKit/iPhone-emulering. Kjent grense: overlapp som bare er ensfarget flate
   (hvit vegg) eller helt utbrent kan ikke plasseres – appen sier fra.
6. **Objektivkorreksjon – FERDIG (2026-11-16), ikke verifisert på ekte iPhone.** Photo Design → Avansert framkalling →
   «Objektivkorreksjon» (lagres på bildelaget som andre framkallingsvalg, gjelder forhåndsvisning og eksport likt):
   fortegning tønne ↔ pute (radial modell, bildet forstørres akkurat nok til at kantene fylles), kromatisk aberrasjon
   rød/cyan og blå/gul (radial skala per kanal), vignettering med midtpunkt. «Auto» anslår aberrasjonen (rød og blå kanal
   tilpasses grønn rundt kantene, minste kvadrater med underpiksel) og vignetteringen (lysfall ytterst mot midten).
   Fortegning stilles for hånd – ingen objektivprofiler (de finnes bare i betalte/lukkede databaser). Objektivet rettes
   før perspektivet. Kode: `engine/lens.ts`. Tester: `engine/lens.test.ts` (rutenett med kjent tønnefortegning blir rett
   – linjeavvik < 0,6 px; aberrasjon funnet innen 0,25 px i hjørnet og fargekantene redusert > 55 %; vignettering funnet
   og hjørnene innen 6/255 av midten; lagring/avgrensning), `e2e/photo-lens.spec.ts` (ekte fotografi med lagt-til
   objektivfeil: Auto, fortegning, lagring og gjenåpning).
7. **Motion: Music Sync + forlenge/forkorte maler** – GODKJENT (eiers melding 2026-11-16), etter 5–6. Bygges inn i den
   eksisterende Motion-motoren (ikke en parallell løsning). (a) Music Sync: analyse av hele lydsporet – faktiske slag,
   takter/taktstruktur, energi, oppbygging, pauser, drops, klimaks, seksjoner (intro/vers/refreng/avslutning der mulig);
   klippbytter og overganger på musikalsk naturlige steder, visuelle høydepunkter på musikalske høydepunkter, ikke
   mekanisk lik rytme; klipplengder etter energi og malens uttrykk (rolig / rask TikTok / store drops gir ulike mønstre);
   behold manuelle justeringer ved ny kjøring; valg automatisk/manuell. (b) Malens lengde: brukeren angir ønsket lengde
   (f.eks. 18 → 30 / 60 s, og kortere) – fordel tid på klipp, nye medieplasser, gjenta/variere sekvenser, forleng rolige
   partier, bevar overganger/animasjoner/keyframes, ingen tomrom/svarte bilder, tekst/grafikk følger timingen, musikken
   tilpasses; ved forkorting prioriteres de viktigste delene. Forleng/forkort i tidslinjen, legg til/fjern/flytt klipp
   uten å ødelegge animasjoner, angre/gjør om. (c) Samspill: ny analyse og bedre tidsfordeling etter bytte av musikk,
   klipp, lengde – uten å ødelegge brukerens arbeid. (d) Test med Vacation-prosjektet og eierens video
   (kopi utenfor repoet: `F:\ML-testdata\Vacation-1080p30.mp4`, 1,9 MB; originalen ligger i Claude-opplastingene):
   original, 30 s, 60 s, kortere, rolig/rask/drops-musikk, bytte musikk og klipp etter synk, eksport med riktig lyd og bilde
   gjennom HELE videoen; ingen klipp utenfor varigheten, aldri urimelig lang eksport. Gratis, lokale analysemetoder.
   **VIKTIG TILLEGG (eier):** `Vacation-1080p30.mp4` er et NEGATIVT eksempel – dagens resultat er ikke godkjent. Gå
   gjennom hele videoen bilde for bilde: klippetiming, overganger, tekst, animasjoner og musikkens rytme; finn konkret hva
   som gjør det dårlig; sammenlign klippbyttene med faktiske slag, oppbygging og høydepunkter; finn hvorfor Music Sync
   ikke gir naturlig visuell rytme; kontroller om tidslinjen og malens animasjoner ødelegges eller feilfordeles. Ikke bare
   «flytt til nærmeste slag» – gjennomtenkt visuell dramaturgi, naturlig variasjon i klipplengder, presise overganger,
   sammenheng mellom musikk og bilde. Bruk videoen som regresjonstest: eksporter en ny versjon med samme materiale og
   musikk og sammenlign direkte med originalen; kontroller forlengelse til 30 og 60 s uten at rytme, animasjoner eller
   design bryter sammen. Ikke ferdig før hele den nye eksporten er sett gjennom og konkrete forbedringer er dokumentert.
   Mål: publiserbart på Instagram/TikTok, ikke bare en teknisk eksport. (Skjermbildet fra eieren: Vacation, 18,6 s,
   94 BPM, «Typografisk» bevegelse, mange svært korte fargeflate-klipp på 0,0–0,8 s i midten, markører på hvert slag.)
   **VIKTIG TILLEGG 2 (eier) – universell musikkstøtte:** alle spor skal fungere på alle Motion-maler uansett sjanger,
   BPM, tempo eller struktur – ingen maler som bare passer bestemte låter/BPM, ingen spesialtilfeller. Systemet:
   (1) analyserer hvert spor (BPM, slag, takter, pauser, energi, drops, oppbygging, overganger), (2) analyserer hver mal
   (klipplengder, overganger, animasjoner, keyframes, tekst, høydepunkter, dramaturgi), (3) sammenligner og tilpasser
   malens timing til musikken, (4) bevarer malens identitet og animasjoner, (5) håndterer musikk uten tydelig BPM/takt,
   (6) håndterer store tempoforskjeller uten unaturlige klipp, hastige overganger eller tomme partier, (7) analyserer på
   nytt ved bytte av lydspor. Malene må få en fleksibel tidsstruktur: høydepunkter, faste og fleksible sekvenser,
   overgangspunkter, animasjoner/keyframes, områder som kan forlenges/forkortes, naturlige punkter for repetisjon/variasjon.
   Test HVER mal med flere ulike spor: rolig, rask elektronisk, hip-hop/trap, pop, cinematisk, store drops, ujevn rytme /
   varierende tempo – reelle kombinasjoner, se gjennom eksportene. Ikke reduser malenes kvalitet eller fjern animasjoner.
   (Testmusikk må være gratis og lovlig – lag egne syntetiske spor i hver stil, eller bruk fritt lisensierte.)

### Faste regler
Ingen betalte tjenester eller kostnader. Ikke reduser kvalitet/funksjonalitet (heller ikke PC). Ikke slett tester eller
skjul feil. Hold eierens lokale filer utenfor. Test → commit → push → merge → deploy når release-gate er grønn, og
kontroller faktisk produksjonscommit (connecthub, main, prod, release-gate). Release-flyten kan stoppe på et kappløp
(«release-gate ble ikke stående som success … pending»): kjør Release-jobben på nytt.

### Status kort
- FERDIG, emulert: Motion-kort/miniatyr, «Fyll skjermen», ctx.filter-erstatning, SVG-teksturer, malforhåndsvisninger
  (IntersectionObserver-reserve), dvh, fokus-zoom (enhetstest), hvitt bilde (lerretsgrense, lerretsminne, raske bytter).
- IKKE VERIFISERT på ekte iPhone: alt over.
- RETTET (Chromium): minnevekst ≈ 4 MB/bilde – Chromium beholdt kodede bytes for <img> fra blob:; nå ImageBitmap. IKKE VERIFISERT på ekte iPhone: knip-zoom i Motion, MP4-eksport,
  Blob i IndexedDB (kan ikke emuleres på Windows).
- Siste tester (2026-11-16): `npm run check` 699/699; Chrome full regresjon 394 bestått / 0 feilet; WebKit 94/4 → de 4
  rettet/begrunnet (kjørt enkeltvis).


Grunnlag: produksjon `ca00fee` (connecthub = main = prod ved start). Revisjonen dekker alle eierens meldinger i
arbeidshistorikken (341 meldinger, 2026-10-10 → 2026-11-15), registrene (`feature-parity.md`, `gjenoppretting.md`,
`testlogg.md`, `maler-og-fonter.md`, `motion-referansemaler.md`) og koden.

**Verifiseringsnivåer** (ikke blandet):
- **Verifisert** = kjørt og bestått i denne revisjonen (nettleser/enhetstest/eksport), eller kontrollert visuelt mot originalen.
- **Statisk** = funnet i kode og en test finnes, men ikke kjørt enkeltvis i denne revisjonen (vedlegget). Full regresjon
  dekker de fleste av disse indirekte (se Testresultater).
- Mockups, falske adaptere og «komponenten finnes» regnes ikke som ferdig.

## Oppfølging 4 (2026-11-16) – WebKit-feilene gjennomgått

WebKit/iPhone-suiten (`playwright.iphone.config.ts`, iPhone 15-emulering 393 × 659, kjørt alene): **82/17 → 94 bestått,
4 feilet** før de siste rettingene. Etter dem består alle de fire når de kjøres alene, eller de hoppes over med en
begrunnelse i testen. Hver feil er klassifisert:

| Test | Klassifisering | Tiltak |
|---|---|---|
| `mobile-touch` Motion: trykk på klipp | **Reell feil (lav skjerm):** i avansert modus brøt tidslinjens verktøyrad over flere linjer, fylte hele tidslinjen, og sporene fikk 1 px høyde – klipp kunne ikke trykkes | Verktøyraden er én rullbar linje på smal skjerm, sporene minst 96 px (`MotionDesign.module.css`). PC uendret |
| `feedback-verify` TB-1591A7 Loop-banner | **Reell feil (lav skjerm):** grunnoppsett-banneret (fast nederst) dekket slide-kortene | På smal skjerm står banneret i flyten øverst i editoren (`Page.module.css`, `LoopStudio.tsx`). PC uendret |
| `mobile-workflows` Thumbnail: dra lag | **Reell feil (lav skjerm):** «Legg til»-panelet + hjelpeboksen «Redigering på mobil» lot bare en stripe av lerretet være synlig; det nye laget lå bak panelet | Hjelpeboksen skjules mens et panel er åpent (`ThumbnailStudio.module.css`) |
| `feedback-preview` forhåndsvisning fyller boksen | **Reell, liten:** rammen ble skalert først når ResizeObserver meldte seg (sent i Safari) | Måles straks ved oppstart (`LivePreview.tsx`); testen venter på skaleringen |
| `isolate-fill` melding | **Riktig appatferd:** Safari får meldingen «AI-modellen krever mer minne …» (AI prøves ikke på iPhone) | Testen forventer den meldingen i WebKit |
| `platform` web-app-kortet | **Gjelder ikke Safari:** iOS har ikke `beforeinstallprompt` | Hoppes over i WebKit (begrunnet) |
| `mobile-touch` knip-zoom i Motion | **Emuleringsgrense:** tidslinjens knip bruker berøringshendelser; WebKit på Windows kan ikke lage dem (`TouchEvent`: Illegal constructor) | Trykk-delen testes i WebKit; knip testes i Chromium med ekte berøring. **IKKE VERIFISERT** på ekte iPhone |
| `loop-studio` gamle looper | **Emuleringsgrense:** WebKit-bygget på Windows kan ikke lagre Blob i IndexedDB (ekte Safari kan) | Hoppes over når oppsettet ikke kan lagres (begrunnet) |
| `export-import-all` Motion MP4 | **Emuleringsgrense:** bygget mangler VideoEncoder, MediaRecorder og captureStream (ekte Safari 17+ har dem) | Testen kontrollerer at Motion viser «Nettleseren kan ikke eksportere video …» i stedet for å henge. MP4 på ekte iPhone: **IKKE VERIFISERT** |
| `photo-design` «egne farger», «alle malene», «farger i prosjektet» | **Tidsavbrudd:** WebKit-emuleringen er treg; forhåndsvisningen er riktig (kontrollert: grønn etter ny innlasting) | «egne farger» merket `test.slow` i WebKit og lengre venting; de andre består alene |

Også: `e2e-mem/memlog.*` er fjernet (`--memlog` gir ingen heap-data ved automatisering); `e2e-mem/bloburl.spec.ts` er
beholdt som verktøy.

## Oppfølging (fra `b36806c`) – de gjenstående punktene

Denne delen erstatter de tilsvarende radene lenger ned (DELVIS / IKKE FERDIG), som står igjen som historikk.

| # | Krav | Implementert | Testet | Resultat | Mangler | Filer |
|---|---|---|---|---|---|---|
| 1 | Photo: penselmaske og AI-maske for lokale justeringer | Ny lokal maske «Pensel» (k = `px`): males i den felles maskeredigeringen (pensel, former, «Velg objekt» med SlimSAM, rødt = valgt), lagres kjørelengdekodet i prosjektet; «+ Motiv (AI)» lager masken med objektmodellen (ormbg); «Mal på masken …» redigerer; «Snu» virker | Enhetstester (koding/dekoding, myke kanter, justering bare der det er malt, lagring/innlasting, ugyldig maske forkastes); `e2e/photo-ai-mask.spec.ts` (ekte foto: eksponering bare i malt halvdel); `e2e-real/photo-remove.spec.ts` (ekte AI-motivmaske) | **Verifisert** | – | `engine/develop.ts`, `controller.ts`, `Props.tsx`, `shared/mask/MaskEditor.tsx` |
| 1 | Photo: AI-fylling som rekonstruerer bakgrunnen; uskarp som eget valg | «Fjern objekt …» (Motiv-fanen): merk objektet (rødt) → «Fyll med AI» (LaMa, lokalt i nettleseren, full oppløsning; uten AI-støtte: innholdsbevisst utfylling med beskjed) eller «Gjør uskarp» (eget valg). Resultatet blir et nytt bilde i laget; Angre henter originalen | `e2e/photo-ai-mask.spec.ts` på ekte foto (stue): speilet fjernes og blir vegg (mørke piksler 0 %, kantstyrke halvert), Angre gir speilet tilbake; uskarp beholder fargene; **ekte LaMa** i `e2e-real/photo-remove.spec.ts`: speilet og pampasgress/vase fjernet, veggen rekonstruert (før/etter-ark kontrollert visuelt) | **Verifisert** (LaMa lokalt; i CI brukes innholdsbevisst reserve fordi modellen ikke lastes ned der) | Svake spor kan bli igjen ved store områder med struktur bak (stigen til høyre i testbildet) | `controller.ts` (`openRemove`, `runRemove`), `Editor.tsx`, `PhotoDesign.tsx` |
| 2 | Photo: hvitt bilde ved «Bytt bilde» | Sannsynlig årsak funnet og rettet: lerret over nettleserens grense (iOS: 16,7 M piksler) tegnes tomt uten feil – et 48 MP-bilde (8064 × 6048) ble hvitt i eksport/full oppløsning. `baseOf` prøver nå lerretsstørrelsen og skalerer bare ned der nettleseren ikke klarer den (ingen kvalitetstap i Chrome/PC) | `e2e/photo-white-image.spec.ts`: etterligner iOS-grensen; feilet før rettingen (eksporten uten bilde), består etter (forhåndsvisning og eksport viser bildet); kontroll uten grense består | **Rettet for denne årsaken – ikke verifisert som eierens tilfelle** | Ikke testet på ekte iPhone; eierens bilde aldri mottatt. Markeres ikke som løst før det er bekreftet | `engine/render.ts` (`canvasFits`, `baseOf`) |
| 3 | Minne: lengre målinger, finn årsaken til økende DOM- og nettleserminne | Målingen deler nå opp i JS-heap, DOM-noder, lyttere, layout, sideprosess (renderer), GPU og totalt. Ny `e2e-mem/retain.spec.ts` finner korteste sterke sti fra GC-røttene til frakoblede lerreter | 10 runder gjennom alle editorene (50 åpninger): **med** Playwrights filopplasting vokser DOM +1774/runde og sideprosessen +72 MB/runde – årsak påvist: DevTools-protokollens filfelt-håndtak («DevTools console») holder hele det lukkede verktøyet med lerreter (48 MB per bilde). Med et ekte slipp av filen: 0 frakoblede noder. **Uten** artefaktet: DOM-noder 186 og lyttere 228 helt flate i 10 runder, GPU flat (≈ 30 MB), JS-heap 18 → 21 MB | DOM- og lerretslekkasjen var et måleartefakt (ikke i appen). **Gjenstår:** sideprosessens eget minne vokser ≈ 15 MB per runde (Thumbnail 5, Motion 4, Loop 4, Photo 2, Isolate 0 MB per besøk) – nettleserens interne (bildedekoding, fonter, kompilert kode); ikke fordelt videre | Profilering av nettleserens interne minne (memory-infra) for å se om veksten flater ut | `e2e-mem/memory.spec.ts`, `steps.ts`, `retain.spec.ts` |
| 4 | Deling og samarbeid mot dev-backend | – | `run-dev.mjs --only=par`: delt grunnoppsett (SHR-07), rollebytte (PLT-16), to brukere på samme PC (PLT-17), Loop delt i menigheten, personlig grunnoppsett/«Del med menigheten», menighetens disk (to brukere, versjoner, Admin-sletting, isolering), serie fra felles grunnoppsett | **Verifisert** (6/6 PC). PLT-17 feilet først: testen var utdatert (Photo-malene ligger i popupen) – rettet | Mobilvariantene hoppes over i dev-løpet (som før) | `e2e-dev/*` |
| 5 | 30 dagers innlogging: levetid, fornyelse, sikkerhet, logout | Økten lagres i `localStorage` (`ch.auth`), tilgangstokenet varer 1 time og fornyes automatisk; informasjonskapselen `ch_at` (tilgangstokenet for sperren) har samme levetid, `SameSite=Lax`, `Secure` på https | Ny `e2e-dev/session-dev.spec.ts` mot dev: levetid ≈ 1 t, `ch_at` ≤ 65 min og Lax, utløpt token fornyes og brukeren forblir innlogget, utlogging fjerner økten og informasjonskapselen, og **både det siste og det første refresh-tokenet avvises av Supabase** etter utlogging | **Verifisert:** fornyelse, sikkerhet og utlogging virker. **Men:** det finnes ingen 30-dagersgrense – økten fornyes i det uendelige til utlogging | 30-dagersgrensen (trinn 6a i `kartlegging-og-plan.md`, alternativ A: `amr`-kontroll i RLS/API, gratis) er aldri godkjent eller bygget. Endrer kjernen i tilgangsmodellen → **krever eierens godkjenning** | `infrastructure/supabase/client.ts`, `services/auth/auth-service.ts` |
| 6 | New York: originalens håndtegnede penselmaske | Formen målt bilde for bilde i originalen og gjenskapt: en «sky» med en rad bobler (ulik størrelse) langs topp og bunn, glatte sider med avrundede hjørner, liten klatt først og så rask vekst mot høyre (målt kurve) | Eksportert og sammenlignet med originalen på 2,2–4,0 s (ark i scratchpad) | **Nær originalen** (formen og fronten innen ≈ 0,1–0,2 s) | Ikke piksel-lik: originalen er en håndtegnet strøk-animasjon; vår er parametrisk. Visuell godkjenning hos eier | `engine/render.ts` (`drawMatted`), `engine/templates3.ts` |
| 7 | `feature-gaps-2.spec.ts` (eierens lokale fil) | Testen var utdatert: valget «Ingen look» heter nå «Original» og er aktivt fra start; testen klikket det og ventet en endring. Forventningen rettet (hopper over «Original» som «Ingen») | Kjørt: 3/3 bestått | **Rettet (testen), ikke en produktfeil** | Filen er fortsatt ukommittert (eierens regel) | `e2e/feature-gaps-2.spec.ts` |

Panorama og objektivkorreksjon er ikke startet (venter på godkjenning). Ingen betalte tjenester er tatt i bruk.

## Oppfølging 2 (fra `453c338`) – minneprofilering, innlogging, hvitt bilde, New York

### Minne (reell profilering)
Verktøy: Chromes egen minneinstrumentering (memory-infra via DevTools-protokollen) – sideprosessens minne per allokator
(V8, Blink GC, PartitionAlloc, malloc, Skia, cc, diskarderbart, font- og nettbuffer), GPU-prosessen separat, målt etter
hver runde, etter 60 s i ro og etter simulert kritisk minnepress (`e2e-mem/profile.spec.ts`); heap-sammenligning per
objekttype (`heapdiff.spec.ts`); kontrollmåling uten appen (`browser-baseline.spec.ts`).

| Måling | Resultat |
|---|---|
| 12 runder gjennom alle editorene | Sideprosessen +15 MB/runde (138 → 315 MB). **PartitionAlloc** +12,4 MB/runde (25 → 161), Blink GC +1,6, V8 ≈ flat (19 → 22,5), malloc flat (≈ 55), Skia flat, diskarderbart svinger (buffer) |
| 60 s i ro / kritisk minnepress | PartitionAlloc uendret (161 → 161) ⇒ **ikke buffer**. GPU-prosessen 142 → 5 MB etter ro ⇒ **forsinket frigjøring**, ikke lekkasje |
| Per verktøy (6 runder) | Thumbnail +6,2 MB/runde, Photo +5,1, Motion +4,4, Loop +3,0, Isolate 0 |
| Thumbnail delt opp | Bare åpne: 0. Malbiblioteket: +0,1. **Mal + bilde: +4,0 MB/runde** i `allocated_objects`; med et 16× mindre bilde +1,0 MB ⇒ følger bildet. Uendret med AI blokkert og med gjenbrukt fil |
| Ny innlasting av siden | `allocated_objects` 22 → 2,9 MB ⇒ minnet er **knyttet til dokumentet** (frigjøres ved innlasting) |
| Heap-sammenligning runde 1 → 4 | Ingen økning i Blob/File/Image/Canvas-objekter; < 1 MB endring (kompilert kode) ⇒ ikke nådd fra JavaScript |
| Nettleseren alene (samme vei: IndexedDB → blob: → Image → lerret, 6 ganger) | +0,3 MB/runde ⇒ nettleserens egen buffer forklarer ikke 4 MB |

**Rettet:** Photos effektbuffer (`shared/fx/fx.ts`) var bare begrenset av antall (200 lerreter, ≈ 3,7 MB hver) og ble aldri
tømt – nå et minnebudsjett på 48 MB (eldste ut, lerretet frigjøres straks) og `clearFxCache()` når Photo lukkes. Thumbnails
malskisser (blob:-adresser) ble ikke frigjort når verktøyet ble lukket – nå frigjort i `dispose()`. Photos store
mellomlagre frigjøres etter eksport og ved «Bytt bilde» (se hvitt bilde).

**Gjenstår (dokumentert, ikke løst):** ≈ 4 MB per innsatt bilde i Thumbnail (og tilsvarende i Photo/Motion) blir liggende i
nettleserens innebygde minne til siden lastes på nytt. Det er ikke nådd fra JavaScript, frigjøres ikke av søppeltømming
eller minnepress, og nettleserens egen bildevei gir det ikke. Innebygd prøvetaking med kallstakker
(`Memory.startSampling`) er ikke tilgjengelig i denne Chromium-bygget (0 prøver). Neste steg: Chrome med
`--memlog` / chrome://memory-internals for kallstakker. Praktisk betydning: ≈ 4 MB per bilde som legges inn i løpet av en
økt; en ny innlasting nullstiller. Photo målt etter rettingen av effektbufferen: fortsatt +3,6 MB/runde (effektene var ikke i bruk i
steget). Felles for Photo, Thumbnail og Motion (men ikke Isolate, 0 MB): bildet registreres i «Dine medier» (sjekksum,
miniatyr, IndexedDB) – neste spor å følge.

### Innlogging (verifisert mot dev, `e2e-dev/session-dev.spec.ts`)
| Punkt | Faktisk |
|---|---|
| Tilgangstoken (JWT) | Utstedes for 60 min (`exp − iat` = 3600 s), fornyes automatisk før utløp; et utløpt token fornyes ved neste lasting og brukeren forblir innlogget |
| Refresh-token | Roteres ved hver fornyelse (nytt token hver gang). Et brukt token godtas fortsatt etter 11 s (gjenbruksvinduet på dev er lengre enn Supabases standard 10 s), men **avvises etter 71 s** |
| Lagring | Økten i `localStorage` (`ch.auth`); informasjonskapselen `ch_at` (tilgangstokenet for serversperren): 60 min, `SameSite=Lax`, `Secure` på https, ikke HttpOnly (skrives av appen) |
| Utlogging | Økten fjernes lokalt, `ch_at` slettes, og både siste og første refresh-token avvises av Supabase (400) |
| Sikkerhetsoverskrifter (prod) | Streng CSP (`script-src 'self'` + hasher, ingen `unsafe-inline` for skript), HSTS (1 år), `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` |
| Levetid | Ingen fast grense – økten varer til utlogging (eiers valg: ingen tvungen innlogging etter 30 dager) |

Vurdering: løsningen er sikker for formålet. Ingen endring gjort. Eneste mulige skjerping er å sette gjenbruksvinduet for
refresh-tokener til standard 10 s i Supabase (gratis innstilling) – ikke nødvendig, ikke gjort. Produksjonens
innstillinger er ikke målt direkte (krever innlogging i prod).

### Hvitt bilde ved «Bytt bilde»
Reproduksjonstester (`e2e/photo-white-image.spec.ts`), iOS-grensen etterlignet (16,7 M piksler per lerret): 12 MP,
48 MP og 108 MP – forhåndsvisning og eksport viser bildet; tre bytter etter hverandre (48 → 12 → 48 MP) viser hvert bilde.
Alle består i Chrome **og WebKit** (Safari-motoren). Ny årsak funnet og rettet: iOS har også en grense for **samlet**
lerretsminne (≈ 256–384 MB); Photo holdt opptil tre lerreter i eksportstørrelse per bilde, også for bilder som var byttet
ut. Nå frigjøres store mellomlagre etter eksport og ved «Bytt bilde»: levende lerretsminne etter to 48 MP-eksporter og tre
bytter **110 → 7 MB** (test). **Ikke bekreftet på ekte iPhone** – står som åpen til det er testet.

**Produktfeil funnet av CI og rettet:** «Bytt bilde» to ganger raskt (først et stort, så et lite bilde) kunne ende med det
første bildet, fordi det store ble ferdig sist og overskrev det nye. Nå vinner det siste valget for samme lag; bilder som
legges til samtidig (f.eks. HDR), kommer fortsatt alle med. Test: «raskt Bytt bilde» feilet 2/2 uten rettingen, består
etter.

### New York – penselvinduet
Målt bilde for bilde i originalen (2,2–4,0 s) og justert: vinduets plassering (x 0,16–0,85, y 0,18–0,77), boblenes
størrelse og avstand (store, få, dype innhakk oppe og nede), avrundede hjørner foran, og veksten (liten klatt fra ≈ 2,0 s,
rask vekst 2,8–3,4 s, myk stopp ≈ 3,7 s). Fortsatt redigerbart (plassering, størrelse, tid i `matte.brush`). Forskjeller
som gjenstår: originalens første klatt er mer uregelmessig (håndtegnet), og boblene i originalen varierer mer i størrelse.
En feil i min egen sammenligning (bildet ble tatt før videoen var ferdig dekodet) ga tidligere en tidsforskyvning på
≈ 0,3 s som ble «rettet» feil; nå korrigert.

## Testresultater (denne revisjonen)

| Kontroll | Resultat |
|---|---|
| `npm run check` (tsc -b, oxlint, vitest, build) | Bestått: 91 testfiler, 688 tester (3 nye), bygg OK |
| Full Playwright-regresjon PC + mobil (Chrome) | 372 bestått, 7 feilet, 243 hoppet over (16,3 min). Ny kjøring av de 7: 4 bestått (ustabile under last). Igjen: `feature-gaps-2` (eierens lokale, ukommitterte fil – kjent), `image-paste-guard` (består 2/2 alene – kortvarig melding på 2,6 s rekkes ikke under full last), `motion-crop` (ny test – rettet, består 2/2) |
| Motion: alle 13 referansemaler, full eksport (720p) to ganger: malen slik den er + med egne bilder/video, egen musikk og Music Sync | 13/13 eksportert med lyd; sammenlignet bilde for bilde med originalene (scratchpad `qc/<mal>-cmp.jpg`) |
| Music Sync, enhetstester (`musicsync.test.ts`) | 70/110/112/160 BPM, synkopert, pause og drop, tempoendring 100→140, halv/dobbel takt (42→84, 166→83), malrytme, utfylte felt – alle bestått |
| Minnemåling (`e2e-mem/memory.spec.ts`, tre runder gjennom alle editorene + 60 s i ro) | JS-heap flat (≈ 18 MB etter runde 2 og 3); DOM-noder +≈1000 og lyttere +≈200 per runde; prosessminne +≈70 MB per runde (Isolate-modellen 2,4 GB mens åpen, frigjøres) |
| Frakoblede noder per editor (`e2e-mem/detached.spec.ts`) | Photo 962, Thumbnail 598, Motion 574, Loop 752 – holdes av nettleserens interne mellomlagre (NodeList, ShadowRoot, React-lyttere i det frakoblede treet), ingen JS-rot funnet |

## FERDIG OG VERIFISERT

| Krav | Implementert | Testet | Resultat | Filer |
|---|---|---|---|---|
| Motion: de 13 referansevideoene som brukbare maler (plassholdere, bytt bilde/video, egen musikk, eksport) | 13 maler med målt timing, plassholdere, «Fyll alle», klikk-meny | Full eksport ×2 per mal med egne filer + Music Sync; `motion-reference-templates.spec.ts` (13 + mobil) i regresjonen | Alle eksporterer med lyd; designet bevares ved bytte (tekst, rammer, farger) | `engine/templates3.ts`, `controller.ts` |
| Music Sync: takt, halv/dobbel takt, tempoendring, pauser, drops, bytte musikk, manuell justering, eksport med lyd | Felles motor `engine/musicsync.ts` | Enhetstester (over) + `motion-music-sync.spec.ts` (sakte/rask/drop, profil, av/på, manuell justering, lagring, eksport) | Bestått etter rettingene under; 112 BPM funnet i alle 13 malene | `engine/musicsync.ts`, `Panels.tsx` |
| Motion: beskjæring ved å dra (meldt ødelagt to ganger) | Beskjær fra høyremeny / dobbeltklikk | Ny `e2e/motion-crop.spec.ts` | Virker: venstre kant dras inn (22 %), bildet beskjæres, Esc beholder | `controller.ts` |
| Malbibliotek: antall og duplikater | Thumbnail 151 maler + 27 oppsett = 178; Photo 100 + 18 = 118 (+ Tomt); Motion 24 | `thumbnail-library`, `photo-library`, `templates-theme`, `motion-design` i regresjonen (summen av kategoriene = hele biblioteket, ingen duplikater) | Bestått | `shared/templates/*` |
| Photo bruker samme malpopup som Thumbnail | Felles `TemplatePicker` | `photo-design.spec.ts` m.fl. i regresjonen | Bestått | `shared/templates/TemplatePicker.tsx` |
| Fargetemaer (10) og egne farger, Standard gjenoppretter | `ThemePicker`, `recolorDeep` | `templates-theme.spec.ts`, `loop-fx-theme.spec.ts` i regresjonen | Bestått | `shared/templates/*`, `loop-studio/engine/player.js` |
| Øvrige apper (Thumbnail, Photo, Loop, Mockups, Isolate, QR, fonter, feedback, admin uten backend, lagring/gjenoppretting, mobil) | – | 372 + 4 bestått i full regresjon (PC og mobil) | Ingen produktfeil funnet | `web/e2e/*` |
| Bunnlinje «Design by Kristen Utvikling» (agentregisteret meldte «ikke funnet») | `footer.credit` i AppShell | Sett i skjermbilde av Motion-editoren | Finnes | `shared/i18n/messages.ts` |
| Dra medier fra mediepoolen til tidslinjen (meldt «ikke funnet») | `medDown` (pekerdrag) i Panels | Kode kontrollert | Finnes (ikke egen dra-test, «Legg til» testes) | `Panels.tsx`, `controller.ts` |

## TEKNISK FERDIG – IKKE VISUELT GODKJENT AV EIER

| Krav | Status | Hva eieren bør se på |
|---|---|---|
| De 13 Motion-malene «ser profesjonelle ut og tilsvarer referansen» | Timing, oppbygning, typografi og størrelser er nå målt mot originalene (titler rettet i 8 maler). Originalenes eget opptak/musikk følger ikke med – feltene er plassholdere til de byttes. | Spesielt New York (penselvinduet er runde strøk, originalen er en håndtegnet «sky»-form), Life in October (fontbytte), Sangtekst (ord-for-ord-plassering) |
| Music Sync «enkel å forstå» | Én knapp i Lyd-fanen, status «På · BPM · profil», av/på, profilvalg | Om tekstene/profilnavnene er forståelige |

## DELVIS FERDIG

| Krav | Implementert | Mangler / begrensning | Filer |
|---|---|---|---|
| Minne/lekkasjer (→ Oppfølging #3) | JS-heap stabil; ingen JS-rotet lekkasje funnet | DOM-noder og prosessminne vokser per runde (se målingen). Ikke bevist lekkasje, men ikke avkreftet. Krever egen undersøkelse med lengre kjøring | `e2e-mem/*` |
| iPhone/Safari | WebKit-konfig (`playwright.iphone.config.ts`) | Kun emulert WebKit, ikke i CI; ekte iPhone ikke testet i denne revisjonen | |
| Deling/samarbeid (→ Oppfølging #4: verifisert) | Implementert, tester i `e2e-dev` | Krever dev-backend; ikke kjørt i denne revisjonen (ingen hemmeligheter brukt) | `e2e-dev/*` |
| AI-maskering på ekte bilder (→ Oppfølging #1: ekte LaMa og motivmaske kjørt) | SlimSAM, pensel | `e2e-real` krever modeller; ikke kjørt i denne revisjonen | `e2e-real/*` |
| Photo «Bytt bilde» gir hvitt bilde (→ Oppfølging #2) | – | Aldri gjenskapt (trenger eierens bilde); ingen regresjonstest | |
| Lekkede passord-beskyttelse | – | Krever Supabase Pro (eier har akseptert varselet) | |
| «Husk meg» 30 dager (→ Oppfølging #5) | `persistSession`, `autoRefreshToken` | Ingen dokumentert rotårsak eller test for utløpt/tilbakekalt sesjon funnet i registeret | `infrastructure/supabase/client.ts` |
| Ustabile tester | – | `image-paste-guard` (melding 2,6 s) og fire andre feiler av og til under full last; består alene | `e2e/*` |

## IKKE FERDIG

| Krav | Status |
|---|---|
| Photo: penselmaske og motiv-/AI-maske (→ Oppfølging #1: ferdig) | Bare lineære og radiale masker finnes |
| Photo: panorama og objektivkorreksjon | Bevisst ikke laget (beslutning i `avansert-editor.md`); krever eierens vurdering om det fortsatt ønskes |
| Motion: penselvindu i New York (→ Oppfølging #6) | Runde strøk (dokumentert begrensning) |

## FEIL SOM HAR OPPSTÅTT – funnet og rettet i denne revisjonen

| Feil | Årsak | Retting | Test |
|---|---|---|---|
| **Kritisk:** Music Sync etter «Fyll alle» med egne videoer ga en video på hundrevis av timer (eksporten ble aldri ferdig) | Utfylte videoklipp har `dur: 0` (lengden er (ut−inn)/fart); Music Sync brukte `dur` → tidskartet delte på null | Faktisk lengde for video/bilder; videoens `out` følger ny lengde nøyaktig | `musicsync.test.ts` «utfylte felt …» (feilet før, består etter) |
| Music Sync ødela malens rytme: lynmontasjen i Dagteller (0,2 s) ble 0,53 s per klipp; avsløringen i New York (4,5 s) ble 0,6 s | Montasjen fikk hele slag etter stil, uavhengig av malens egne klipplengder | Malens egen lengde i slag (også halve/kvarte) beholdes; intensitet og profil justerer relativt | «malens egen rytme beholdes …» |
| Halv/dobbel takt: mal på 83 BPM mot sang på 150 BPM ble 3,6× raskere | Malens slag koblet til hvert slag i sangen | Nærmeste slagnivå velges (hvert andre slag / delslag) | «halv / dobbel takt …» |
| Tomme mellomslag tolket som pauser (klipp holdt for lenge) | Intensitet per slag | Intensitet over en takt | samme test |
| For små titler i 7 maler + feil plassering i Dagteller (stående) | Størrelser satt etter øyemål | Målt i originalene: THE END 150→320, Årstall 230/210→450/460, YOUR LOCATION 118→165, NEW YORK 120→300, VACATION 150→260, THE END (stående) 120→230 og 110→180, Dagteller (stående) liten/stor linje 0,29/0,55→0,405/0,48 | Visuell sammenligning + regresjon |
| Minnemålingen kunne ikke åpne Photo | Photo åpner maler i popup nå | Steget bruker popupen | `e2e-mem/steps.ts` |

Ingen tidligere fungerende funksjon ble funnet ødelagt i den fulle regresjonen (bortsett fra eierens lokale `feature-gaps-2`, som velger en look som allerede er aktiv).

## FORBEDRINGSPOTENSIAL (nye forslag, ikke tidligere krav)

1. Kjør den visuelle Motion-kontrollen (`e2e/motion-ref-qc.spec.ts`, `ML_REF_QC=<mappe>`) før hver endring i malene, og lagre sammenligningsark som artefakt.
2. Lengre minnekjøring (10+ runder) for å avgjøre om nodeveksten flater ut; vurder å tømme modellbuffer i Isolate ved lukking.
3. Gjør `image-paste-guard` robust (vent på varig tilstand i stedet for en melding på 2,6 s).
4. Ekte iPhone/Safari i CI (BrowserStack eller tilsvarende) – krever konto/avgjørelse.
5. Music Sync: la brukeren flytte «hovedøyeblikket» (første kutt) til et valgt slag.

## Krever eierens vurdering

- Visuell godkjenning av de 13 Motion-malene (se «Teknisk ferdig – ikke visuelt godkjent»).
- Om penselmaske/AI-maske i Photo og panorama/objektivkorreksjon fortsatt skal lages.
- `feature-gaps-2.spec.ts`: rettet (Oppfølging #7).
- 30-dagersgrensen (trinn 6a, alternativ A) – godkjenning før bygging.
- Supabase Pro (lekkede passord) og ekte iPhone-testing (kostnad).

## Produksjon og Git (ved start av revisjonen)

connecthub = main = produksjon = `ca00fee`; ingen åpne PR-er; ingen ventende migreringer i repoet utover det som er kjørt (50 migreringsfiler). Ucommittet lokalt (eierens, røres ikke): `e2e-dev/mockups-cloud-logo-dev.spec.ts`, `e2e/feature-gaps-2.spec.ts`, `e2e/site-pages.spec.ts`. Rettingene i denne revisjonen publiseres via vanlig release-PR (CI → release-gate → merge → Release verify).

## Vedlegg: kravregister (statisk kontroll)

Alle konkrete krav i eierens meldinger (213 rader), kartlagt mot kode og tester med søk – **ikke** kjørt enkeltvis. Statusen er en indikasjon, og noen «ikke funnet» er feil (rettet over: bunnlinjen, dra fra mediepoolen, bølgeform for lyd i tidslinjen, beskjæring). Fordeling: kode+test 151, kode uten test 18, uklart 34, ikke funnet 6, erstattet 4.

### Del 1
Kilde: `req-1.md`. Stier er relative til `F:\ReactProjects\MediaLabReact` (web = `web/`). Rask kontroll med grep/lesing av utdrag; ingen tester kjørt. Teststatus er hentet fra filnavn/testnavn og fra `docs/gjenoppretting.md`, `docs/feature-parity.md`, `docs/testlogg.md`. Tilbakemeldingssakene (Del 4 i siste melding) er "lagt ved samtalen" og ligger ikke i fila.

| ID | Dato | Område | Krav | Kodebevis | Testbevis | Status | Notat |
|---|---|---|---|---|---|---|---|
| R1-001 | 10-10 | Hub/admin | Onepage SPA i React 19 + TS + Vite + React Compiler + Oxlint | `web/package.json` (react 19.3.0, babel-plugin-react-compiler 1.0.0, oxlint 1.87.0, vitest), `web/vite.config.ts` | CI i `docs/ci/ci.yml`; `src/app/App.test.tsx` | kode+test | Compiler faktisk aktivert i vite-config ikke kontrollert i detalj |
| R1-002 | 10-10 | Hub/admin | Hub med sidebar/verktøykort, mørkt slate-tema, "Dine aktive medier" (`MainHub.tsx`, `Sidebar.tsx`, `MediaContext.tsx` i `src/context`) | `src/features/hub/Hub.tsx`, `src/app/AppShell.tsx`, `src/features/media-library/MediaLibrary.tsx` (Dine medier) | `src/features/hub/Hub.test.tsx`, `e2e/platform.spec.ts` "oversikten vises uten konsollfeil" | erstattet | Brukeren ba senere (10-10 18:27) om `features/`-struktur; filene `src/context/*`, `src/apps/*` finnes ikke, funksjonen dekkes av annen struktur |
| R1-003 | 10-10 | Hub/admin | Navigasjon: aktiv app, URL-synk, tilbake/frem, lazy loading + Suspense, forhåndslasting | `src/app/router.ts`, `src/app/tool-loader.ts`, `src/app/ToolHost.tsx`, `src/app/tools.ts` | `src/app/router.test.ts` (tilbake/fram, vakt), `tool-loader.test.ts(x)`, `e2e/platform.spec.ts` "mappene, verktøy-lenker og tilbake/fram" | kode+test | Bruker History API (`/app/<verktøy>`), ikke URL-hash `#/mockups` som spec foreslo (erstattet i praksis) |
| R1-004 | 10-10 | Hub/admin | Forhåndslasting av neste verktøy ved hover/berøring (PLT-08) | `src/app/tool-loader.ts` | `tool-loader.test.tsx` | kode+test | `gjenoppretting.md` sier "bygget, ikke kontrollert" i nettleser |
| R1-005 | 10-10 | Other | Felles mediemodell: stabile ID-er, original/avledet, ingen binærdata i Context, objekt-URL-opprydding | `src/domain/asset.ts`, `src/domain/ids.ts`, `src/services/assets/asset-service.ts`, `src/infrastructure/idb`, `src/infrastructure/media` | `src/domain/domain.test.ts`, `src/services/assets/media-platform.test.ts`, `hash.test.ts` | kode+test | |
| R1-006 | 10-10 | Sharing/collab | Medier gjenbrukes mellom verktøy uten ny opplasting ("Bruk i ...") | `src/app/send-targets.ts`, `src/features/media-library/AssetPicker.tsx` | `e2e/image-paste-guard.spec.ts` "Isolate -> Bruk i Thumbnail Studio", `e2e/platform.spec.ts` "opplastet bilde lagres..." | kode+test | SHR-02 "Send til" direkte fra Photo/Thumbnail/Motion: E2E PC/mobil per `gjenoppretting.md` |
| R1-007 | 10-10 | Other | Funksjonsregister `docs/feature-parity.md` + `docs/gjenoppretting.md` med ID, status, testbevis | `docs/feature-parity.md` (328 linjer), `docs/gjenoppretting.md`, `docs/testlogg.md` | n/a (dokumentasjon) | kode, ingen test | Dokumentasjon, ikke testbar; "Åpne spørsmål" i feature-parity §15 viser fortsatt beslutninger |
| R1-008 | 10-10 | Loop | Loop Studio gjenbygget fullt (slides, effekter, lyd, maler, eksport, MP4 4K, stående, sanntidsopptak) | `src/features/loop-studio/*` (EditorView, controller, transfer) | `e2e/loop-studio*.spec.ts`, `e2e/loop-fx-theme.spec.ts`, `e2e-dev/loop-*-dev.spec.ts` | kode+test | LE-27/28 testet i fil; ukeprogram-foto bør prøves manuelt |
| R1-009 | 10-10 | Thumbnail | Thumbnail Studio: maler, lag, 1080p/4K eksport, lagre/åpne | `src/features/thumbnail-studio/*` | `e2e/thumbnail-*.spec.ts` (studio, library, place, slots, filters) | kode+test | |
| R1-010 | 10-10 | Photo | Photo Design: formater, lag, looks, kurver, utklipp, trykk/PDF | `src/features/photo-design/*` | `e2e/photo-design*.spec.ts`, `photo-features`, `photo-develop-tools`, `photo-mask-editor`, `photo-batch` | kode+test | Dekning per enkeltfunksjon ikke gjennomgått; `feature-parity.md` har PD-04 "bygget; ikke egen test" |
| R1-011 | 10-10 | Motion | Motion Design: tidslinje, tekst, lyd, overganger, SRT, fargejustering, eksport | `src/features/motion-design/*` | `e2e/motion-*.spec.ts` (ca. 25 filer), `e2e-dev/motion-dev.spec.ts` | kode+test | |
| R1-012 | 10-10 | AI/image | Isolate Subject: person/objekt/logo/tekst, markering, maske, PNG-eksport, bevar originale piksler | `src/features/isolate-subject/*` (engine/segmenter.ts, inpaint.ts, keybox.ts) | `e2e/isolate-*.spec.ts`, `e2e-real/isolate-*.spec.ts` (ekte modeller), `engine/engine.test.ts` | kode+test | Ikke manuelt verifisert av bruker (`gjenoppretting.md`) |
| R1-013 | 10-10 | Other | Mockups: innebygde/egne mockups, plassering, perspektiv, eksport | `src/features/mockups/*` | `e2e/mockups*.spec.ts` (load, place, rotate, undo, logo, verify), `e2e-dev/mockups-*-dev.spec.ts` | kode+test | |
| R1-014 | 10-10 | Fonts | Lys/mørk modus og norsk/engelsk i alle verktøy | `src/shared/i18n/messages.ts`, `src/styles`, `src/app/AppShell.tsx` | `e2e/platform.spec.ts` "lys modus og engelsk huskes", `photo-design-theme*.spec.ts`, `templates-theme.spec.ts`, `theme-scan.ts` | kode+test | Fullt tema-skann finnes for Photo/maler; Motion/Mockups ikke bekreftet |
| R1-015 | 10-10 | Infra/release | Video lagres aldri i skyen, kun lokal prosjektmappe | `src/infrastructure/fs`, `supabase/migrations/20261015100100_no_private_uploads.sql`, `admin-write-dev` ("video avvist") | `e2e-dev/admin-write-dev.spec.ts`, `e2e-dev/loop-disk-dev.spec.ts`, `e2e/hub-folder-nav.spec.ts` | kode+test | Mappedialogen (File System Access) kan ikke automatiseres; manuell test (MD-17) |
| R1-016 | 10-10 | Auth/security | Innlogging, MFA, roller, tilgangskontroll bevart mot ConnectHub; direkte URL-er/API-er beskyttet | `src/features/auth/SignIn.tsx`, `src/app/AuthGate.tsx`, `src/services/auth/auth-service.ts`, `src/features/admin/access.ts`, `supabase/migrations/*` | `src/features/auth/SignIn.test.tsx`, `src/services/auth/auth-service.test.ts`, `e2e-dev/access-dev.spec.ts`, `staff-dev`, `church-access-dev`, `supabase/tests/rls_test.sql` | kode+test | Kjørt mot connecthub-dev 2026-10-17; produksjonsrøyk `e2e-prod/3-access.spec.ts` |
| R1-017 | 10-11 | Loop | Lyst tema i Loop Studio som følger plattformens tema | `src/features/loop-studio/*` (EditorView tema), `src/shared/fx` | `e2e/loop-fx-theme.spec.ts` "lyseffektene følger fargetemaet" | kode+test | Test dekker lyseffekter; utseende generelt i lys modus i Loop ikke separat funnet |
| R1-018 | 10-11 | Loop | Claude-bildegjenkjenning (`window.claude.complete`) dokumenteres som forskjell, ingen falsk implementasjon | `docs/gjenoppretting.md` LE-03c, `docs/feature-parity.md` LE-03; ingen treff på `window.claude` i `web/src` | n/a | kode, ingen test | Dokumentert; sluttet "beslutning" i feature-parity åpne spørsmål 2. Bruker tesseract |
| R1-019 | 10-11 | Motion | Uprøvde Motion-funksjoner registreres: AI-undertekster, voiceover, prosjektmappe, fellesmappe, 1080p60/4K | `src/features/motion-design/*` | `e2e-real/motion-subs.spec.ts` (Whisper, ekte Chrome), `e2e/motion-ai.spec.ts`, `motion-export-4k60.spec.ts`, `motion-audio.spec.ts`, `e2e-dev/sources-dev.spec.ts` | kode+test | Norsk tale og ekte mikrofon ikke prøvd; mappedialog kun manuelt |
| R1-020 | 10-11 | Hub/admin | PLT-03/04/05/07/08/17/21: knappefelt, oppdateringsvarsel, selvreparasjon, PWA, forhåndslasting, lokale data per bruker, tilbakemeldingsknapp | `src/app/AccountMenu.tsx`, `UpdateNotice.tsx`, `update.ts`, `heal.ts`, `pwa.ts`, `LocalData.tsx`, `Feedback.tsx` | `e2e/platform.spec.ts` (PLT-04/05/07), `heal.test.ts`, `update.test.ts`, `pwa.test.ts`, `LocalData.test.tsx`, `e2e-dev/local-data-dev.spec.ts`, `feedback-dev.spec.ts` | kode+test | |
| R1-021 | 10-11 | Hub/admin | PLT-16 testrolle (rollebytter) og PLT-19 enhetsvalg | `src/app/TestRole.tsx`, `test-role.ts`, `src/domain/test-role.ts`; enhetsvalg `shared/units` | `e2e-dev/test-role-dev.spec.ts`, `src/app/TestRole.test.tsx`, `src/domain/test-role.test.ts`, `e2e/units.spec.ts` | kode+test | PLT-19 kun i Thumbnail (px/%) og Loop (%/x); mm ikke nevnt |
| R1-022 | 10-11 | Infra/release | Dokumenter gammel/ny PWA-identitet (`id`, `start_url`, `scope`), ikke endre ennå | `docs/pwa-identitet.md`, `web/public/manifest.webmanifest` | `src/app/pwa.test.ts` | kode+test | Beslutning 10-17 "A med omdirigering" (/home -> /app/); gjennomført i publisering (PLT-07-id) |
| R1-023 | 10-11 | Auth/security | Kontomeny: varsler, "Konto og sikkerhet", passordbytte, eksport av egne data, kontosletting m. bekreftelse | `src/app/AccountMenu.tsx`, `src/services/account.ts`, `docs/konto-sletting.md` | `src/app/AccountMenu.test.tsx` (varsler, last ned mine data, bytt passord, slett kontoen), `e2e-dev/account-dev.spec.ts`, `admin-ops-dev.spec.ts` | kode+test | |
| R1-024 | 10-11 | Hub/admin | Admin-seksjoner (Brukere, Menigheter, Invitasjoner, Filer, Samarbeid, Abonnement, Logg, Tilbakemeldinger, Opprydning, Forespørsler, Mail) flyttes | `src/features/admin/*` (Folders, Churches, Inbox, Subs, Log, Cleanup, Requests, Mail ...) | `src/features/admin/Sections.test.tsx`, `AdminPage.test.tsx`, `e2e-dev/admin-dev.spec.ts` (alle 12 seksjoner), `admin-write-dev`, `admin-ops-dev` | kode+test | Sletting av menighet/e-postmaler/opprydning testet i `admin-ops-dev`; ikke alt dekket i detalj |
| R1-025 | 10-11 | Sharing/collab | SHR/Fellesmappe: fellesressurser, samarbeidsgrupper, felles grunnoppsett, samtidige endringer (SHR-07) | `src/services/collab.ts`, `src/features/admin/Folders.tsx`, `supabase/migrations/*collab*`, `docs/plan-samarbeidsgrupper.md` | `e2e-dev/shared-setup-dev.spec.ts`, `sources-dev.spec.ts`, `loop-sharing-dev.spec.ts`, `src/features/admin/Folders.test.tsx` | kode+test | Rettet funn i kategorilisteflett (SHR-07) |
| R1-026 | 10-12 | Auth/security | Feil logo på innloggingssiden og e-post: skal være samme som favicon | `src/features/auth/SignIn.tsx` (bruker `/images/app-icon-192.png`), `media-lab/server/lib/mail.js` + `mail-logo-default.js` | ingen treff | uklart | Ikke bekreftet at logo = favicon; ingen test funnet. Mail-logo styrt av admin-mal |
| R1-027 | 10-12 | AI/image | Isolate: test i ekte Chrome med faktisk modell, bytte bilde under nedlasting, WebGPU-feil og CPU-reserve | `src/features/isolate-subject/engine/segmenter.ts`, `segment.worker.ts` | `e2e-real/isolate-models.spec.ts`, `isolate-images.spec.ts`, `e2e/isolate-subject.spec.ts` | kode+test | Objekt-modell byttet BiRefNet_lite -> ormbg (feilet i Chrome 154, TB-7BF5C1); ikke manuelt verifisert |
| R1-028 | 10-12 | Hub/admin | Kartlegg lokal servertest uten å lagre nøkler (`docs/lokal-servertest.md`) | `docs/lokal-servertest.md`, `web/e2e-dev/run-dev.mjs`, `e2e-dev/server-dev.spec.ts` | `e2e-dev/server-dev.spec.ts`, `access-dev.spec.ts` | kode+test | Resultater lagt inn i brukerens melding: server-dev lykkes etter nøkkel satt |
| R1-029 | 10-12 | AI/image | Bruk ormbg for AI-utklipp i Photo Design og Thumbnail Studio | `src/features/photo-design/engine/cutout.ts`, `src/features/thumbnail-studio/engine/cutout.ts` | `e2e-real/ai-tools.spec.ts`, `thumbnail-mask.spec.ts` | kode+test | |
| R1-030 | 10-12 | Photo | Fjern auto-sletting ved 60 filer i Dine medier, varsel ved stor samling, bevar manuell sletting | `src/features/media-library/format.ts` (LARGE_COUNT/LARGE_BYTES/QUOTA_WARN), `MediaLibrary.tsx` | `src/features/media-library/format.test.ts`, `e2e/media-scale.spec.ts` (300 filer) | kode+test | |
| R1-031 | 10-12 | Auth/security | Test vanlig bruker og Admin mot connecthub-dev; tilgang håndheves i DB, ikke bare UI | `supabase/migrations/*`, `src/features/admin/access.ts` | `e2e-dev/access-dev.spec.ts`, `admin-dev.spec.ts`, `server-dev.spec.ts` (resultater i brukerens melding: 4 passed/2 skipped) | kode+test | |
| R1-032 | 10-12 | AI/image | Pensel, grønn "Behold"-markering og flere SlimSAM-punkter testet med ekte modell | `src/features/isolate-subject/IsolateSubject.tsx`, `controller.ts`, `engine/segmenter.ts` | `e2e/isolate-mask-editor.spec.ts`, `isolate-mask-direct.spec.ts`, `e2e-real/isolate-tools.spec.ts`, `isolate-mask-direct.spec.ts`, `e2e-dev/mask-dev.spec.ts` | kode+test | `gjenoppretting.md`/`manuelle-tester.md` ber fortsatt om manuell sjekkliste for pensel/behold |
| R1-033 | 10-12 | Photo | Feil: "Bytt bilde" i Photo Design fungerer ikke / hvitt bilde; finn årsak og legg til regresjonstest | `src/features/photo-design/*` (Props.tsx, controller.ts) | `e2e-dev/photo-dev.spec.ts` (`ML_DEV_IMAGE`), `e2e/photo-library.spec.ts`, `docs/testlogg.md` l.1441 | ikke funnet | Dokumentert "ikke gjenskapt" (brukerens bilde ikke tilgjengelig, 10-17); ingen rettelse eller regresjonstest som reproduserer feilen |
| R1-034 | 10-12 | Hub/admin | Admin/innlogging/sikkerhet/tilbakemelding gjennomgang og testregister oppdatert | `docs/testlogg.md`, `docs/feature-parity.md`, `docs/gjenoppretting.md` | n/a | kode, ingen test | Rapportering |
| R1-035 | 10-12 | Infra/release | Vercel-preview av `feature/onepage-rebuild`, prod-migrasjonskontroll (lesing), `/app/` ved siden av gammel app | `docs/lansering.md`, `docs/publisering.md`, `media-lab/vercel.json`, `media-lab/vite.config.js` | `e2e/csp.spec.ts`, `e2e/platform.spec.ts` ("/home ... 307"), `e2e/site-pages.spec.ts`, `e2e-prod/*.spec.ts` | kode+test | |
| R1-036 | 10-12 | Sharing/collab | Menighetsadmin kan administrere brukere i egen menighet; maks 10 per menighet (aktive + ventende), atomisk i DB, overstyring (Developer/Moderator med MFA + begrunnelse, logges), reaktivering sperret | `supabase/migrations/20261018100000_member_limit.sql`, `src/features/admin/MemberLimit.tsx`, `member-limit.ts`, `src/services/admin.ts` | `src/features/admin/MemberLimit.test.tsx`, `e2e-dev/member-limit-dev.spec.ts`, `staff-dev.spec.ts`, `rls_test.sql` (972-984 databasetester inkl. samtidighet) | kode+test | Kjørt i dev 10-12; prod-migrering kjørt 10-17 (C3) per brukerens godkjenning |
| R1-037 | 10-17 | Sharing/collab | Gammel app skal vise korrekt teller og forståelige feilmeldinger for brukergrensen | `media-lab/src/services/admin.js` (`member_usage`); `media-lab/server/handlers/files.js` | ingen e2e for gammel app funnet (`web/e2e-dev/member-limit-dev.spec.ts` tester kun ny app) | kode, ingen test | Teller i gammel app ikke bekreftet testet |
| R1-038 | 10-17 | Templates | Standardinnhold for nye menigheter (Livets Ord-standarder), nye menigheter starter tom | `supabase/migrations/20261018110000_church_legacy_defaults.sql`, `src/domain/account.ts`, `docs/ny-menighet-standardinnhold.md`, `thumbnail-studio/ctrl-defs.ts` | `src/features/legacy-defaults.test.ts`, `Hub.test.tsx` | kode+test | Besluttet 10-17; innholdsvalg avklart i `gjenoppretting.md` ADM-03 |
| R1-039 | 10-17 | Feedback | Tilbakemeldingsflyt fra innsending til innboks, behandles (status, notat, arkiv) | `src/app/Feedback.tsx`, `src/services/feedback.ts`, `src/features/admin/Inbox.tsx`, `Feedback.tsx`, `src/shared/feedback` | `src/app/Feedback.test.tsx`, `e2e-dev/feedback-dev.spec.ts`, `feedback-cases-dev.spec.ts`, `e2e/feedback-verify.spec.ts`, `feedback-preview.spec.ts`, `admin/Inbox.test.tsx` | kode+test | |
| R1-040 | 10-17 | Auth/security | Developer/Moderator med MFA; admin-handlinger som endrer data (e-post, roller, opplasting, sletting) | `src/features/admin/*`, `src/services/admin.ts` | `e2e-dev/staff-dev.spec.ts`, `staff-session-dev.spec.ts`, `admin-write-dev.spec.ts`, `admin-ops-dev.spec.ts` | kode+test | Alle mot connecthub-dev med syntetiske kontoer |
| R1-041 | 10-17 | Auth/security | Sikkerhetsgjennomgang: SQL-injeksjon, XSS, RLS, SECURITY DEFINER/search_path, hemmeligheter, CSP | `supabase/checks/security_audit.sql`, `supabase/tests/rls_test.sql`, `web/vite.config.ts` (CSP), `docs/testlogg.md` | `supabase/tests/rls_test.sql` (injeksjonstester), `e2e/csp.spec.ts`, `src/features/admin/AdminPage.test.tsx` | kode+test | Ingen egen UI-testfil for SQL-injeksjon/XSS i tekstfelt funnet; lekkede passord krever Pro (akseptert av bruker) |
| R1-042 | 10-17 | Infra/release | Korte adresser (/home, /isolate, /thumbnailstudio, /photodesign, /admin ...) + 307 fra gamle sider; gamle lenker virker | `media-lab/vercel.json`, `media-lab/build/routes.js`, `docs/lansering.md` | `e2e/platform.spec.ts` "/home og gamle adresser sender til den nye appen (307)", `e2e/site-pages.spec.ts`, `e2e-dev/site-crawl-dev.spec.ts`, `e2e-prod/2-tools.spec.ts` | kode+test | |
| R1-043 | 10-17 | Auth/security | Lekkede-passord-beskyttelse i Supabase Auth | `docs/lansering.md` (veiledning) | `supabase db advisors` (dev) nevnt i testlogg | ikke funnet | Krever Supabase Pro; bruker aksepterte varselet på Free, ingen kode |
| R1-044 | 10-17 | Hub/admin | SHR-07, PLT-16, PLT-17 testes i dev, med opprydding; Motion-test stabiliteten | se R1-021/R1-025/R1-020 | `e2e-dev/shared-setup-dev.spec.ts`, `test-role-dev.spec.ts`, `local-data-dev.spec.ts`, `motion-dev.spec.ts` | kode+test | Spørsmål om versjon 16 til 37 i fellesoppsett (ikke endret) |
| R1-045 | 10-17 | Infra/release | Vercel-opprydding: ikke slett uten godkjenning; trygge/ må-beholdes lister | `docs/vercel-gjennomgang-2026-10-18.txt`, `docs/vercel-kandidater.txt`, `docs/vercel-slettelogg.txt`, `docs/vercel-lagring.md` | n/a | kode, ingen test | Slettelogg viser utførte slettinger (etter godkjenning); gevinst for lagring dokumentert i `vercel-lagring.md` |
| R1-046 | 10-17 | Infra/release | Produksjonsprosedyre B1-B3 (lese), C1 sikkerhetskopi, C2 tørrkjøring, C3 migrering, C4 verifisering, D1 merge + røyktest | `docs/lansering.md`, `docs/kjoreplan-migreringer-2026-10-18.md`, `supabase/checks/*`, `web/e2e-prod/run-prod.mjs` | `e2e-prod/*.spec.ts`, `e2e-prod/policy.test.ts` | kode+test | Utført 10-17; røyk 21/21 per brukerens melding |
| R1-047 | 10-17 | Infra/release | Automatisert produksjonstest av innlogget bruker/Admin uten opprettelse av kontoer | `web/e2e-prod/*`, `docs/produksjonstest.md` | `e2e-prod/1-read.spec.ts`, `3-access.spec.ts` | uklart | Avhenger av om en ekte testkonto i prod finnes; ikke kontrollert i koden |
| R1-048 | 10-17 | Photo | Import av gamle lokale prosjekter: Loop, Thumbnail, Photo, Motion, Mockups, Dine medier | `src/infrastructure/legacy-import/*`, `src/features/loop-studio/transfer.ts`, `src/features/mockups/useMockupLibrary.ts`, `src/app/workspace-factory.ts` | `e2e/legacy-import.spec.ts` (Photo, Thumbnail, Motion, Mockups+Dine medier, ugyldige data), `src/features/motion-design/transfer.test.ts`, `e2e-dev/local-data-dev.spec.ts` | kode+test | Loop-import testet i nettleser tidligere (`loop-*`); egen rad for Loop i legacy-import.spec ikke funnet |
| R1-049 | 10-17 | Hub/admin | Komplett gjennomgang gammel vs ny: slettet/mangler, funksjonsmatrise, uprøvde områder | `docs/feature-parity.md`, `docs/testlogg.md`, `docs/tilbakemeldinger-2026-10-18.md` | n/a | kode, ingen test | Matrise i dok; 'hvitt bilde' fortsatt åpent |
| R1-050 | 10-17 | Feedback | Behandle tilbakemeldingssaker én etter én (vedlagt dokument, ikke i fila) | `docs/tilbakemeldinger-2026-10-18.md`, `e2e-dev/feedback-cases-dev.spec.ts` | `e2e-dev/feedback-cases-dev.spec.ts` | uklart | Selve sakene står ikke i `req-1.md`; kan ikke avgjøres her |
| R1-051 | 10-17 | Auth/security | Kontoforespørsler, abonnement/kvoter, e-postmaler, opprydning, invitasjoner testet mot dev (syntetisk) | `src/features/admin/Requests.tsx`, `Subs.tsx`, `Mail.tsx`, `Cleanup.tsx`, `ChurchAccess.tsx` | `e2e-dev/admin-ops-dev.spec.ts`, `admin-write-dev.spec.ts`, `church-access-dev.spec.ts`, `lifecycle-dev.spec.ts` | kode+test | |
| R1-052 | 10-17 | Auth/security | Glemt passord med lenke fra e-post (kontrollert testpostkasse) | `src/features/auth/SignIn.tsx`, `src/services/auth/auth-service.ts` | `e2e-dev/account-dev.spec.ts`, `e2e-dev/admin-write-dev.spec.ts`, `SignIn.test.tsx` | kode+test | |

## Merknader

- Erstattet/endret underveis: hash-ruting (`#/mockups`) og `src/context`/`src/apps` fra første prompt ble erstattet av History API-ruter og `features/`-struktur etter meldingen 10-10 18:18/18:27. Kravet "ikke gjenbruk gammel kode" (18:18) ble overstyrt av "gjenopprett alt fra gammel MediaLab" (18:27 og 10-11 10:55).
- Instruksjonen 10-17 11:04 ("trygg lansering, ikke utvid omfang") ble overstyrt 11:13 ("alt skal ferdigstilles før lansering").
- Rene prosessregler (ikke merge/publisere, ikke endre prod, ingen hemmeligheter) er ikke egne rader.
- Passord-/nøkkellignende tekst i brukerens chat er ikke gjentatt her.

### Del 2
Stier: W = F:\ReactProjects\MediaLabReact\web, M = F:\ReactProjects\MediaLabReact\media-lab, S = F:\ReactProjects\MediaLabReact\supabase, D = F:\ReactProjects\MediaLabReact\docs.
Hurtigsjekk i kode (ingen tester kjørt). Ren drift (push/merge/deploy/ikke slett Vercel) er tatt med bare der det er et krav med spor i repoet.

| ID | dato | område | krav | kodebevis | testbevis | status | merknad |
|---|---|---|---|---|---|---|---|
| R2-001 | 10-18 | Hub/admin | TB-D9DE93 Varslinger: «Merk alle som lest», «Fjern leste», «Tøm loggen» (med bekreftelse, ingen falsk suksess ved feil) | W/src/app/AccountMenu.tsx (confirm ved tøm), W/src/services/account.ts, S/migrations/20261018120000_notifications_clear.sql | W/src/app/AccountMenu.test.tsx («varsler (TB-D9DE93)…», «varsler: feil gir feilmelding, ikke «lyktes»»); W/src/services/account.test.ts; S/tests/rls_test.sql | kode+test | Avbrutte forespørsler (abort) er ikke egen test |
| R2-002 | 10-18 | AI/image | TB-7BF5C1 Isolate Subject henger/laster flere ganger; ingen evig løkke, forståelig feil, ingen ekstra AI-kall | W/src/features/isolate-subject/controller.ts, engine/segmenter.ts, engine/segment-client.ts (StallError, stallGuard, delt nedlasting) | W/src/features/isolate-subject/engine/segmenter.test.ts («flere kjøringer … deler samme nedlasting», «GPU-kjøring som aldri svarer …», «stallGuard …», «mislykket nedlasting kan prøves på nytt»); W/e2e/isolate-subject.spec.ts | kode+test | controller.ts (feilmeldinger, token/avbryt) har ingen egen enhetstest; gjenskaping med ekte brukerbilde ikke dokumentert i kode |
| R2-003 | 10-18 | Sharing/collab | TB-596FE4 Loop Studio oppdateres ikke for andre brukere i samme menighet; test med to brukere + isolering | W/src/services/shared-setup.ts, W/src/features/loop-studio/bases.ts, LoopBases.tsx | W/src/features/loop-studio/bases.test.ts; W/src/services/shared-setup.test.ts; W/e2e-dev/loop-sharing-dev.spec.ts; W/e2e-dev/shared-setup-dev.spec.ts | kode+test | Ingen realtime-abonnement funnet (grep realtime/channel = 0); synk skjer via versjonssjekk ved åpning/lagring. To-bruker-testene krever dev-backend (ikke i vanlig CI) |
| R2-004 | 10-18 | Sharing/collab | TB-BB67CB Grunnoppsett og disk delt i menighet, konfliktkontroll (eldre kopi overskriver ikke), isolering | W/src/features/loop-studio/bases.ts, LoopBases.tsx; W/src/services/loop-disk.ts; S/migrations/20261018130000_loop_shared_disk.sql | bases.test.ts («felles: oppdatering lagrer … nyeste versjon», «finnes ikke … ingenting lagres»); W/e2e-dev/loop-base-load-dev.spec.ts; loop-disk-dev.spec.ts | kode+test | Dev-e2e kjører ikke i CI; ingen migrering av produksjonsdata (bevisst) |
| R2-005 | 10-18 | Hub/admin | TB-9AF961 Vis menighetens logo naturlig i Hub, reservevisning (forbokstaver), ingen lekkasje mellom menigheter, mobil/desktop | W/src/features/hub/Hub.tsx, Hub.module.css; W/src/shared/media/church-logo.ts | W/src/features/hub/Hub.test.tsx («viser logoen …», «uten logo: forbokstaver», «logoen kan ikke hentes», «uten menighet …») | kode+test | Mobil-layout ikke egen test; menighetsisolering ligger i RLS/dev-e2e (church-access-dev.spec.ts) |
| R2-006 | 10-18 | Feedback | TB-3C000C «xscsc»: ikke dikt opp feil, behold status | D/tilbakemeldinger-2026-10-18.md (konkluderer: ingen endring, status beholdt) | – | uklart | Ikke et kodekrav; historikk i produksjon ble aldri lest, så «ingen grunnlag» er dokumentert, ikke verifisert |
| R2-007 | 10-18 | Sharing/collab | Delt Loop-disk i tillegg til personlig: alle i menigheten leser/redigerer, bare Admin sletter, ikke video/musikk, test mellom to menigheter | W/src/services/loop-disk.ts, W/src/features/loop-studio/LoopSharedDisk.tsx; S/migrations/20261018130000_loop_shared_disk.sql | LoopSharedDisk.test.tsx (medlem uten slett, Admin sletter etter bekreftelse); loop-disk.test.ts («video fjernes …»); W/e2e-dev/loop-disk-dev.spec.ts; S/tests/rls_test.sql | kode+test | – |
| R2-008 | 10-18 | Infra/release | Kontroll av notifications_clear-migrering (sikkerhet/RLS) + kort kjøreplan | D/kjoreplan-migreringer-2026-10-18.md; S/migrations/20261018120000_notifications_clear.sql; S/checks/prod_precheck.sql, prod_postcheck.sql | S/tests/rls_test.sql | kode+test | Ingen rollback-skript for 20261018120000/130000 i S/checks (finnes bare for 17100000, 18100000, 18110000) |
| R2-009 | 10-18 | Infra/release | Skrivebeskyttet prod-sjekk, dry-run og kjøring av de to migreringene, push/merge/deploy, prodtest | D/publisering.md, D/lansering.md, D/produksjonsplan-trinn8.md; W/tools/release-*.mjs, ship-dev.mjs | W/tools/release-decide.test.ts | uklart | Operasjon mot produksjon; resultat ikke etterprøvbart fra kode |
| R2-010 | 10-18 | Infra/release | Ikke slett Vercel-deployments; vurdering av kandidater | D/vercel-gjennomgang-2026-10-18.txt, vercel-kandidater.txt, vercel-slettelogg.txt, vercel-lagring.md | – | uklart | Finnes en «slettelogg»: bør sjekkes at den ikke viser faktiske slettinger i strid med forbudet |
| R2-011 | 10-18 | Performance | Raskere logo/forside: cache-nøkkel per bruker/menighet, nedskalering, fallback, «Slett lokale data» fjerner kopien | W/src/shared/media/church-logo.ts, W/src/shared/media/useAssetUrl.ts, W/src/features/hub/Hub.tsx | Hub.test.tsx («logoen hentes én gang … ny logo hentes»); W/e2e-dev/hub-logo-cache-dev.spec.ts; hub-logo-perf-dev.spec.ts | kode+test | Rotårsaken til treghet ble aldri fastslått (eier: «ser ut til å laste normalt») |
| R2-012 | 10-18 | Infra/release | E-postmaler redigert i Admin brukes ved utsending (velkomst, glemt passord, forespørsel mottatt, ny forespørsel til stab); trygge lenker, escaping, tekstversjon, standardmal som reserve | M/server/lib/mail.js (egen mal brukes hvis templateProblem ok, ellers DEFAULT_TEMPLATES), M/src/shared/mail-render.js, M/server/handlers/mail.js, requests.js; W/src/features/admin/Mail.tsx | M/server/handlers/mail.test.js (auth.recover, invite.create, request.form/submit, request.approve, SMTP-adapter med logo); M/src/shared/mail-render.test.js; W/src/features/admin/Mail.test.tsx | kode+test | Mobilvisning av e-post ikke automatisk testet |
| R2-013 | 10-18 | Infra/release | SMTP-variabler (5 stk) i Vercel Production, aldri vise hemmeligheter | W/build/build-guard.test.ts (SMTP-passord stopper bygget), M/build/env-guard.js; D/epostoppsett.md | build-guard.test.ts; M/build/env-guard.test.js | uklart | Selve Vercel-innstillingen ligger utenfor repoet |
| R2-014 | 10-18 | Infra/release | E-posttest etter publisering med testpostkasse (invitasjon, glemt passord, forespørsel mottatt, stab-varsel) | W/e2e-prod/5-email.spec.ts, e2e-prod/policy.ts | W/e2e-prod/policy.test.ts («e-post: alt stoppes uten egen godkjenning …») | uklart | Skript og vern finnes; at ekte utsending faktisk ble kjørt og verifisert er ikke synlig i kode |
| R2-015 | 10-18 | Colors/themes | Light mode v1-v3: tydeligere kontrast, kort, kanter, knapper, ikoner, hjelpetekst (malvelger «Menighetens disk» / «Lagrede grunnoppsett»), offwhite #e4e1da beholdt, dark mode uendret | W/src/features/loop-studio/light-theme.ts, Home.module.css, W/src/shared/theme/theme.ts, W/src/shared/templates/Templates.module.css | W/src/features/loop-studio/light-theme.test.ts; theme-coverage.test.ts; W/e2e/loop-fx-theme.spec.ts; photo-design-theme*.spec.ts; templates-theme.spec.ts | kode+test | «Merkbar» visuell forbedring og at dark mode er pikselidentisk er ikke maskinelt verifisert; v3-meldingen er avkuttet midt i setning |
| R2-016 | 10-18 | Colors/themes | «Se demo (lagres ikke)»-knapp: diskret i light mode, dark uendret | W/src/features/loop-studio/Home.module.css (:root[data-theme='light'] [data-ch-demo-link]), HomeView.tsx | ingen funnet (light-theme.test.ts nevner ikke demo) | kode, ingen test | Inline stil på lenken (oransje kant) overstyres av CSS; ingen test beviser det |
| R2-017 | 10-18 | Other | Fjerne svart URL-forhåndsvisning nederst til venstre på hover | ingen kode funnet | – | ikke funnet | Er nettleserens statuslinje; kan ikke fjernes fra sidekode (eierens egen regel 2: forklar bare). Ingen dokumentert svar i repoet |
| R2-018 | 10-18 | Other | Mockups: «Legg til logo» (fra Fellesmappe + SVG/PNG-opplasting, forhåndsvisning, flytt, proporsjonal skalering, SVG som vektor til eksport, bytt/fjern, relative koordinater) | W/src/features/mockups/engine/logo.ts, Mockups.tsx | W/src/features/mockups/engine/logo.test.ts; W/e2e/mockups-logo.spec.ts; W/e2e-dev/mockups-cloud-logo-dev.spec.ts («logo fra Fellesmappe …») | kode+test | Fellesmappe-testen kjører bare mot dev med innlogging |
| R2-019 | 10-18 | Other | Mockups: rotér 90°, vend, tilbakestill, fri vinkel; logo følger ikke rotasjon; med i eksport og lagring | W/src/features/mockups/engine/place.ts, render.ts | place.test.ts («rotasjon …», «bildehjørnene følger speiling og rotasjon»); W/e2e/mockups-rotate.spec.ts | kode+test | – |
| R2-020 | 10-18 | Other | Mockups: naturlige fingerkanter (telefon/kort i hånd), ikke klassifisere skygge som hud, vurdere analyseoppløsning | W/src/features/mockups/engine/detect.ts (occlusionMask, shadowMin) | engine.test.ts («maske med okklusjon …», «mørkt kort: … ingen svart stripe») | kode+test | Visuell 1:1-kvalitet er ikke automatisk bevist; kun syntetiske tester |
| R2-021 | 10-18 | Other | Alle 12 mockups individuelt: riktige hjørner/perspektiv (homografi), lit/shadowMin bakoverkompatible | W/src/features/mockups/engine/catalog.ts (config: lit, shadowMin, inset, occl, keepHoles), geometry.ts | engine.test.ts («homografien …», «innfelling fra config.json»); W/e2e/mockups.spec.ts | kode+test | Ingen test som går over alle 12 malene hver for seg med hjørnesjekk |
| R2-022 | 10-18 | Export/save | Last ned / Kopier / Lagre i Dine medier gir samme resultat (design, rotasjon, logo, oppløsning) | W/src/features/mockups/Mockups.tsx, engine/render.ts | W/e2e/mockups-verify.spec.ts («Kopier og Lagre i Dine medier: samme resultat som Last ned …») | kode+test | – |
| R2-023 | 10-18 | Other | Mockups: «Flytt og skaler design»-modus, slider, dobbeltklikk for hele designet, klikk utenfor avslutter, tilbakestill, lagring per mockup | W/src/features/mockups/Mockups.tsx, engine/place.ts | place.test.ts; W/e2e/mockups-place.spec.ts (dblclick) | kode+test | Touch-støtte ikke eksplisitt testet |
| R2-024 | 10-18 | Other | Mockups: 8 håndtak, Shift-fri flytting av hjørne/side, hjelpelinjer, magnetisk snap, ikke i eksport | W/src/features/mockups/engine/place.ts, Mockups.tsx | place.test.ts («magnetisk justering», «gyldige frie former …»); mockups-place.spec.ts («presis redigering …») | kode+test | – |
| R2-025 | 10-18 | Other | Backspace sletter valgt objekt, Tilbake/Angre-knapp, tall i alle slidere kan skrives inn | W/src/features/mockups/Mockups.tsx; W/src/shared/ui/NumField.tsx | W/e2e/mockups-undo.spec.ts (3 tester); W/src/shared/ui/NumField.test.ts; W/e2e/num-field.spec.ts | kode+test | Gjelder Mockups; «alle slidere» i andre verktøy dekkes av num-field.spec.ts |
| R2-026 | 10-18 | Other | Mockups: sidehåndtakene dra siden fritt, motsatt side i ro, også skjevt; nettlesertest per håndtak | place.ts | place.test.ts («sidehåndtak: …»); mockups-place.spec.ts («sidehåndtakene flytter sin side …») | kode+test | – |
| R2-027 | 10-18 | Infra/release | GitHub-godkjenningsport: PR kreves til main, CI påkrevd, godkjenning, branch protection | .github/workflows/ci.yml (jobbene checks og e2e på PR mot main), release.yml, release-verify.yml; D/publisering.md | – | uklart | Branch protection-regler er GitHub-innstilling, ikke i repoet; ikke verifisert her |
| R2-028 | 10-19 | Hub/admin | Knapp «Åpne ConnectHub produksjon ↗» i dev-Utvikler-kortet (kun Developer), synlig i preview | W/src/features/admin/AdminPage.tsx (PROD_SITE / __CH_PROD_SITE__), M/build/env-guard.js | W/src/features/admin/AdminPage.test.tsx (3 tester); W/e2e-dev/admin-prodlink-dev.spec.ts | kode+test | Committet e2e har kjent MFA-begrensning på Vercel |
| R2-029 | 10-19 | Other | Reparer syntaksfeil i F:\ReactProjects\media-lab-react\src\data\tools.ts (isolate-subject, mockups, objektavslutning) | F:\ReactProjects\media-lab-react\src\data\tools.ts (slutter nå med gyldig funksjon; oppføringer isolate-subject og mockups finnes) | ingen | kode, ingen test | Egen mappe utenfor hovedprosjektet; typekontroll ikke kjørt her |
| R2-030 | 10-19 | Photo | Photo Design: rett maler som ikke lastes, + 10 nye maler | W/src/features/photo-design/engine/templates/index.ts | engine/templates.test.ts («de 9 eksisterende og 10 nye malene …»); W/e2e/photo-design.spec.ts («de 10 nye malene åpnes …», «alle malene vises … etter hverandre») | kode+test | – |
| R2-031 | 10-19 | Colors/themes | Fargepalettvelger over malene i Photo Design, samme som Thumbnail Studio | W/src/features/photo-design/Colors.tsx, W/src/shared/templates/ThemePicker.tsx | W/e2e/photo-design.spec.ts («fargepalett over malene …») | kode+test | – |
| R2-032 | 10-19 | Performance | Fargevelger lagger ved dragging (samme-løsning for mus og touch) | W/src/shared/ui/ColorSpectrum.tsx | photo-design.spec.ts («fargevelgeren under dragging …») | kode+test | Ingen målt bildefrekvens; touch ikke eksplisitt testet |
| R2-033 | 10-19 | Colors/themes | Tre egne farger per mal (bakgrunn/tekst/støtte), popup for rekkefølge, hurtigvalg, per-mal bevaring, lagring i prosjekt | W/src/features/photo-design/Colors.tsx, engine/palette.ts | templates.test.ts («rekkefølgen kan byttes fritt», «fellesfarger, egne farger per mal …»); photo-design.spec.ts («egne farger …», «farger i prosjektet …») | kode+test | – |
| R2-034 | 10-19 | Other | Mockups: Mac-skjerm fyller aktivt område innenfor svart ramme; håndholdt kort uten svarte glipper; fiks deteksjon, ikke masker | W/src/features/mockups/engine/detect.ts (innfelling/inset) | engine.test.ts («innfelling i perspektiv …», «innfelling fra config.json …», «mørk skjerm …»); mockups-rotate.spec.ts («skjermkvalitet …») | kode+test | Visuelt estetikk (Apple-logo, sølvkant) ikke automatisk verifisert |
| R2-035 | 10-19 | Auth/security | KRITISK: Moderator/Developer kan ikke gjøre seg selv til Admin når menigheten har Admin; direkte tilgang bare uten Admin; håndhevet i server/database | S/migrations/20261020100000_temporary_admin_access.sql, 20261020110000_staff_admin_only_by_request.sql; W/src/features/admin/ChurchAccess.tsx | S/tests/rls_test.sql («Midlertidig Admin: …» flere feil-tester); ChurchAccess.test.tsx; W/e2e-dev/church-access-dev.spec.ts | kode+test | – |
| R2-036 | 10-19 | Hub/admin | Egen Admin-seksjon: ventende forespørsler (navn/rolle/menighet/tid), grønn hake/rød X, varighet 1d/30d/6m/1år/ubestemt, status, tilbaketrekking, fjern tilgang; gjenopprett forsvunne forespørsler | W/src/features/admin/ChurchAccess.tsx, Subs.tsx, W/src/services/admin.ts; S/migrations/20261020120000_my_admin_access_rejected.sql, 20261020150000_withdraw_admin_request.sql | ChurchAccess.test.tsx («Admin: seksjonen viser ventende …», «godkjenning … varighet», «Trekk tilbake forespørsel», «Fjern tilgang» m.fl.); church-access-dev.spec.ts | kode+test | Gjenoppretting av faktisk forsvunnet produksjonsdata er ikke etterprøvbar |
| R2-037 | 10-19 | Loop | «+ Bilde» i Loop Studio fungerer ikke (rotårsak, regresjonstest) | W/src/features/loop-studio/controller.ts, W/src/infrastructure/api/server.ts, S/migrations/20261020130000_direct_uploads.sql | W/e2e-dev/loop-pip-dev.spec.ts; W/e2e/loop-studio-pip.spec.ts | kode+test | «Test som feiler før rettingen» ikke verifiserbar; produksjonsinnlogget test avhenger av testkonto |
| R2-038 | 10-19 | Infra/release | Opplastingsgrenser: 30 MB bilder/filer, 10 MB logoer, 512 KB e-postlogo; filtypekontroll beholdes | W/src/services/files.ts, W/src/features/admin/lib.ts, W/src/infrastructure/api/server.ts; S/migrations/20261020130100_supabase_storage_30mb.sql; M/server/handlers/files.js, mail.js | W/src/services/files.test.ts («godtar … opp til 30 MB», «for store filer avvises»); M/server/handlers/files.test.js; mail.test.js («bare PNG/JPG under 512 kB»); W/e2e-dev/upload-limits-dev.spec.ts | kode+test | 4,5 MB funksjonsgrense er løst via direkteopplasting; Vercel-plattformgrense ikke testet i CI |
| R2-039 | 10-19 | Infra/release | Admin-tilgang sluttest i produksjon (testkontoer/testmenighet, ikke røre eksisterende forespørsel) | W/e2e-prod/3-access.spec.ts, e2e-prod/guard.ts, policy.ts | e2e-prod/policy.test.ts («Admin-tilgang: bare testmenigheten …») | uklart | Faktisk prod-kjøring ikke synlig i kode |
| R2-040 | 10-19 | Other | Full funksjonstest av hele nettstedet (alle sider/roller, uten innlogging/MFA-test), krawling mot Dev | W/e2e-dev/site-crawl-dev.spec.ts, e2e-dev/run-dev.mjs; W/e2e/site-pages.spec.ts | site-crawl-dev.spec.ts («hele nettstedet: sider, verktøy og admin-seksjoner …»); e2e/site-pages.spec.ts | kode+test | Safari/Firefox/fysiske enheter ikke dekket (eierens egen merknad) |
| R2-041 | 10-20 | Other | Gjør ustabile tester robuste; ignorer bare eksakt vercel.live-CSP i forhåndsvisning | W/e2e-dev/preview-noise.ts, run-dev.mjs | W/e2e-dev/preview-noise.test.ts (4 tester); loop-pip-dev.spec.ts | kode+test | Årsak til øvrige ustabile Mockups/Photo-tester «dokumenter hvis ukjent» – ikke funnet noen egen merknad i kode |
| R2-042 | 10-20 | Other | Mockups: ingen unødvendig 404 når bildemappen er tom | W/src/features/mockups/engine/catalog.ts | engine.test.ts («tom egen mappe: config.json hentes ikke (ingen 404 i nettverket)») | kode+test | – |
| R2-043 | 10-20 | Infra/release | Produksjonstestskript med vern (kun testkontoer/testmenighet, ingen service-nøkkel, stopper ved feil prosjekt, e-post kun godkjent); docs/produksjonstest.md | W/e2e-prod/guard.ts, policy.ts, run-prod.mjs, 1-read…5-email.spec.ts; D/produksjonstest.md | W/e2e-prod/policy.test.ts (7+ tester) | kode+test | Ikke kjørt mot produksjon uten godkjenning; Motion AI-test og ekte e-postlevering er åpne |
| R2-044 | 10-30 | Auth/security | Brukere logges stadig ut; «Husk meg» 30 dager: rotårsak, tokenfornyelse, samtidige refresh, midlertidige nettfeil, regresjonstester | W/src/infrastructure/supabase/client.ts (persistSession, autoRefreshToken, storageKey), W/src/services/auth/auth-service.ts, me-cache.ts; S/config.toml (ingen sesjonsvarighet satt) | auth-service.test.ts (innlogging, utlogging, nettfeil ved oppstart) men ingen tester for refresh/samtidige kall/30 dager | uklart | Ingen dokumentert rotårsak eller 30-dagers konfigurasjon funnet; regresjonstestene eieren ba om (refresh, samtidige auth-kall, utløpt/tilbakekalt) ikke funnet |
| R2-045 | 10-30 | Infra/release | LightCraft/FilmCraft-pakker skal lagres i repoet («Legges i repoet») | D/avansert-editor.md §4: «Valgt: selvstendig implementasjon», ingen pakker i repoet | – | erstattet | Senere samme dag (spesifikasjon 19:59) velger eier selvstendig implementasjon; pakker/zip finnes ikke i web/ |
| R2-046 | 10-30 | Photo | Photo Design Standard vs Avansert tydelig adskilt; modusbytte mister ingen data | W/src/features/photo-design/Props.tsx, Editor.tsx | W/e2e/photo-design-advanced.spec.ts («Standard viser bare grunnleggende justeringer …»); W/e2e/advanced-toggle.spec.ts | kode+test | – |
| R2-047 | 10-30 | Photo | Avansert: hvit/svartpunkt, vibrance, klarhet, tekstur, skarphet, støy, auto-tone, histogram, før/etter, HSL, fargegradering, lineære/radiale masker, flekkfjerning, perspektiv, HDR, EXIF, kopier/lim inn | W/src/features/photo-design/engine/develop.ts, exif.ts, Props.tsx | engine/develop.test.ts (8+ tester); W/e2e/photo-develop-tools.spec.ts; photo-design-advanced.spec.ts | kode+test | – |
| R2-048 | 10-30 | Photo | Penselmaskering og motiv-/AI-masker som lokale justeringer | ingen pensel-lokalmaske funnet (kun lineær/radial i develop.ts; «Finjuster masken» gjelder utklipp); D/avansert-editor.md: AI-masker holdt utenfor | W/e2e/photo-mask-editor.spec.ts (utklippsmaske, ikke lokal justering) | ikke funnet | Delvis: gradientmasker finnes, pensel og motivvalg ikke |
| R2-049 | 10-30 | Photo | Objektivkorreksjon, panorama, kloning/retusj | spot/kloning i W/src/features/photo-design/Props.tsx («+ Flekkfjerning»); D/avansert-editor.md: objektivkorreksjon og panorama «Ikke» | develop.test.ts («flekkfjerning …») | ikke funnet | Panorama og objektivkorreksjon bevisst ikke implementert (dokumentert); kloning dekket av flekkfjerning |
| R2-050 | 10-30 | Photo | Virtuelle kopier / variantbehandling | D/avansert-editor.md: «Ikke (bevisst)», Dupliser dekker behovet | – | erstattet | Eier ba senere eksplisitt om ikke å bygge virtuelle kopier i batchflyten |
| R2-051 | 10-30 | Photo | Forbedre kurveeditor/histogram/fargevisning, tydelige kanalfarger, store håndtak, lesbart i lys/mørk | W/src/features/photo-design/Props.tsx, PhotoDesign.module.css, engine/engine.test.ts (kurve) | photo-design-advanced.spec.ts («kanalkurver som virker på bildet og lagres»); photo-design-theme-scan.spec.ts | kode+test | Visuell tydelighet og «ikke bare farge» er ikke maskinelt målt |
| R2-052 | 10-30 | Photo | Batch-redigering: import av mange bilder, filmstrip, forrige/neste, egne innstillinger, batchhandlinger, «Eksporter alle som ZIP», 100+ bilder, lagring | W/src/features/photo-design/engine/batch.ts, controller.ts | engine/batch.test.ts (5 tester); W/e2e/photo-design-batch.spec.ts (import/ZIP, mobil, 120 bilder, slett) | kode+test | – |
| R2-053 | 10-30 | Motion | Motion Avansert: mediebibliotek, fleresporet tidslinje, flytt/trim/del/slett, undo/redo, lagring/gjenoppretting, forhåndsvisning (leveranse 1) | W/src/features/motion-design/Advanced.tsx, Timeline.tsx, engine/edit.ts | engine/edit.test.ts; W/e2e/motion-design-advanced.spec.ts («Avansert tidslinje …», «Avansert på mobil …»); motion-timeline-nav.spec.ts | kode+test | – |
| R2-054 | 10-30 | Motion | Motion Avansert videre: effekter, overganger, keyframes, hastighet, lyd/fade, eksport som respekterer alt | W/src/features/motion-design/engine/fx.ts, kf.ts, export.ts, audio.ts | fx.test.ts; kf.test.ts; W/e2e/motion-effects/keyframes/speed/audio/export.spec.ts | kode+test | Overganger finnes (Advanced.tsx, render.ts), men egen overgangs-e2e ikke funnet |
| R2-055 | 10-30 | Other | Verktøysøk i Avansert, kontekstmenyer, Escape lukker popover, tastaturnavigasjon | W/src/shared/ui/ContextMenu.tsx; motion-design/Panels.tsx | W/e2e/motion-context-menus.spec.ts; motion-ux.spec.ts («dialoger og menyer: Escape, fokus …») | kode, ingen test | Selve verktøysøket ble ikke funnet (grep verktøysøk = 0); kontekstmenyer og Escape er testet |
| R2-056 | 10-30 | Other | Funksjonsmatrise med statuser (implementert/delvis/mangler/ikke relevant), holdt oppdatert | D/avansert-editor.md §5 «Funksjonsmatrise for #170 (status 2026-11-14)» | – | kode, ingen test | Dokument, ikke testbart |

### Del 3
| ID | dato | område | krav | kodebevis | testbevis | status | merknad |
|---|---|---|---|---|---|---|---|
| R3-001 | 10-31 | Hub/admin | «← TILBAKE» på SoMe-oversikten skal gå til hovedmenyen, ikke inn i appen (hash, refresh, history) | features/hub/Hub.tsx, shared/lib/workspace-nav.ts | e2e/hub-folder-nav.spec.ts («fra hovedmenyen: åpne SoMe, ← Tilbake…», «direkte på #some…»), e2e/some-nav.spec.ts | kode+test | dekket inkl. refresh og nettleser tilbake/fram |
| R3-002 | 10-31 | Motion | Effektpanel: legg til, juster, rekkefølge, av/på, fjern, angre, lagring, fade | features/motion-design/Advanced.tsx, engine/model.ts, engine/render.ts | e2e/motion-effects.spec.ts («effekter: legg til, juster, av/på, rekkefølge, fade, fjern, angre og lagring») | kode+test | eksportlikhet dekkes i motion-export.spec.ts |
| R3-003 | 10-31 | Motion | Tekst/undertekster som tidslinjeelement (overlay-spor, tid, plassering, lagrekkefølge) | engine/model.ts (TrackKey text/subs), Panels.tsx, texts.ts | e2e/motion-text.spec.ts; e2e-real/motion-subs.spec.ts; engine.test.ts (SRT) | kode+test | SRT import/eksport i Advanced.tsx/controller.ts |
| R3-004 | 10-31 | Motion | Keyframes: legg til/flytt/slett, interpolering, følger klipp ved flytt/trim, lagring | engine/model.ts, Timeline.tsx, controller.ts | e2e/motion-keyframes.spec.ts | kode+test | |
| R3-005 | 10-31 | Motion | Lydredigering: flere spor, volum, fade, trim/del/slett, demp, numerisk start | Advanced.tsx, controller.ts, engine | e2e/motion-audio.spec.ts; motion-music-sync.spec.ts | kode+test | |
| R3-006 | 10-31 | Motion | Bølgeform for lydklipp («gjerne») | ingen treff på waveform/peaks i features/motion-design | ingen | ikke funnet | valgfritt i spec («gjerne»); mangler |
| R3-007 | 10-31 | Motion | Hastighetskontroll på klipp (effektiv varighet, keyframes skaleres, undo, lagring); ikke antyde tonehøydebevaring | Advanced.tsx:386-408, controller.ts:1012, fields.ts:70 | e2e/motion-speed.spec.ts | kode+test | tonehøyde endres, UI sier det ærlig |
| R3-008 | 10-31 | Export/save | Faktisk MP4-rendering (video, effekter, keyframes, tekst, hastighet, lyd), filen kontrolleres; prosjektvarighet respekteres; tydelig melding ved manglende kodek | features/motion-design/engine (render), e2e/mp4.ts | e2e/motion-export.spec.ts, motion-export-fallback.spec.ts (VP9/Opus, MediaRecorder), motion-export-4k60.spec.ts, motion-templates-export.spec.ts | kode+test | tester kontrollerer filen |
| R3-009 | 10-31 | Motion | Eksportdialog: format, oppløsning, fps, kvalitet, område | Editor.tsx/Advanced.tsx, controller.ts | motion-export-4k60.spec.ts («4K·60», uten støtte → 4K·30 med beskjed) | kode+test | bitrate/lydinnstillinger ikke verifisert i spec |
| R3-010 | 10-31 | Motion/Mobile | Bevar topp-/bunnlinje (← MEDIA LAB, skjold, DESIGN BY…), ingen overlapp; editoren fyller høyden uten siderulling (1920/1366/1280, nettbrett, mobil) | app/AppShell.tsx (shield), motion-design | e2e/workspace-layout.spec.ts («arbeidsflaten fyller w×h uten siderulling»), motion-responsive.spec.ts | kode+test | «DESIGN BY» i AppShell ikke funnet som tekst her, kun i Loop (EditorView/HomeView); sjekk om bunnlinjen er der |
| R3-011 | 10-31 | Motion | Standardmodus uendret, modusbytte taper ikke data | Advanced.tsx, Editor.tsx | e2e/advanced-toggle.spec.ts; motion-design-advanced.spec.ts («modusbytte og Standard uendret») | kode+test | |
| R3-012 | 10-31 | Motion | Bakoverkompatible prosjektdata, trygge standardverdier, feilmeldinger ved manglende media | engine/model.ts, transfer.ts | transfer.test.ts, engine.test.ts, legacy-defaults.test.ts | kode+test | |
| R3-013 | 10-31 | AI/image | Isolate: delt maskeeditor i Thumbnail Studio («Finjuster utklippet») og Photo Design («Finjuster masken»), lagring, undo/redo, save/reload | shared/mask/MaskEditor.tsx, features/*/ | e2e/photo-mask-editor.spec.ts; isolate-mask-editor.spec.ts; e2e-real/thumbnail-mask.spec.ts | kode+test | |
| R3-014 | 10-31 | AI/image | Maskekvalitet på ekte bilder: hår, briller, fingre, mikrofon/ledninger, lilla scenelys, uten å trekke med bakgrunn | features/isolate-subject/engine | e2e/isolate-thin.spec.ts; e2e-real/isolate-images, isolate-person, isolate-tools, isolate-models | kode+test | e2e-real krever ekte modeller/bilder, ikke i vanlig CI; «faktisk problembilde» uverifisert |
| R3-015 | 10-31 | Feedback | «Send tilbakemelding»: kategoritilpassede spørsmål, hjelpetekster, validering, tekst bevares ved kategoribytte | shared/feedback/form.ts, feedback-core.ts, views.ts | shared/feedback/feedback-core.test.ts; e2e/feedback-preview.spec.ts; e2e-dev/feedback-dev.spec.ts | kode+test | mobilvisning/innsending i Dev kun e2e-dev (krever backend) |
| R3-016 | 10-31 | Infra/release | Release-gate/-decide: SHA-binding, nyeste kjøring, kansellering, PR-head/base, prod-verifisering, atomisk ff av connecthub | tools/release-gate.mjs, release-decide.mjs, release-lib.mjs, .github/workflows/release.yml, release-verify.yml | tools/release-decide.test.ts (ca. 30 it-tester, bl.a. «velger nyeste kjøringen», «head endret mellom kontrollene → moved», «prefikset passer flere commits → ambiguous») | kode+test | GitHub/Vercel-atferd kun kodegjennomgått |
| R3-017 | 10-31 | Infra/release | Dokumentere publisering, rollback, GitHub-innstillinger, aktiveringsplan | docs/publisering.md (217 linjer) | n/a | kode, ingen test | dokumentasjon; ikke testbar |
| R3-018 | 10-31 | Infra/release | Behold menneskelig godkjenning, ikke aktivere AUTO_MERGE/RELEASE_PR uten ok; ikke omgå branch protection | release.yml | release-decide.test.ts (delvis) | uklart | GitHub-innstillinger ikke verifiserbare fra kode |
| R3-019 | 10-31 | AI/image | Bug: hinttekst «Trykk eller dra en firkant…» havnet i eksporterte piksler; feil kildebilde (704×1468 skjermbilde vs 1440×1800 original) | features/isolate-subject/IsolateSubject.tsx, shared/lib/paste.ts | e2e/image-paste-guard.spec.ts («hinteksten er bare grensesnitt – eksporten har motivets piksler»), shared/lib/paste.test.ts | kode+test | rotårsak (innliming erstattet bildet) fikset; produksjon ikke funksjonelt verifisert |
| R3-020 | 10-31 | AI/image | Innliming i felt/dialoger erstatter ikke bildet; Isolate spør før erstatning; «Nytt bilde» som før; Thumbnail/Mockups/Photo bruker felles sperre | shared/lib/paste.ts | image-paste-guard.spec.ts (5 tester) | kode+test | |
| R3-021 | 11-01 | Performance | Vercel Deployment Storage over 10 GB: undersøk og rydd trygt | docs/vercel-lagring.md, docs/vercel-slettelogg.txt, vercel-kandidater.txt | n/a | kode, ingen test | ops-oppgave; dokumentert, tall avhenger av Vercel-dashboard |
| R3-022 | 11-01 | Templates/Colors | Skarpe effektforhåndsvisninger (Gylden time, Solstråler…) uten oppskalering/uklarhet, WebP i kortstørrelse × dpr | shared/fx/fx.ts:1018-1130 | e2e-dev/preview-noise.test.ts, e2e/photo-design-advanced.spec.ts (delvis) | kode, ingen test | ingen test som måler skarphet; eierens godkjenning var visuell |
| R3-023 | 11-01 | AI/image | Bug: bildet forsvinner når man går rett til «Finjuster masken»; bildet vises ved bytte pensel/former/lasso/Velg objekt | shared/mask/MaskEditor.tsx | e2e/isolate-mask-direct.spec.ts («Finjuster masken rett etter opplasting») | kode+test | |
| R3-024 | 11-01 | AI/image | Mask-editor: presis flytting/zoom (mus, styreflate, knip), tegner aldri ved navigering | MaskEditor.tsx, shared/lib/useStageNav.ts | isolate-mask-direct.spec.ts («flytting og zoom: mus, styreflate, knip, midtknapp, mellomrom og to fingre tegner aldri») | kode+test | |
| R3-025 | 11-01 | Performance | Mask-editor lagg: rAF-batching, mindre React-rerender, evt. Worker; måle før/etter | MaskEditor.tsx (requestAnimationFrame linje 165/331/552); ingen Worker | ingen ytelsesmåling i tester | kode, ingen test | ingen målt før/etter funnet; Worker ikke brukt (valgfritt) |
| R3-026 | 11-01 | Colors/themes | Midlertidige visningsbakgrunner (svart, grå, hvit, magenta, cyan, grønn, sjakk) i maskeeditor, aldri i eksport | MaskEditor.tsx | isolate-mask-editor.spec.ts («visningsbakgrunnen… endrer ikke masken»), isolate-mask-direct.spec.ts («arbeidsbakgrunn: alle farger») | kode+test | |
| R3-027 | 11-01 | Other | Full samhandlingsoppgradering: hjul=zoom på arbeidsflater, pinch, mellomrom/midtknapp-pan, høyreklikk-menyer (tastatur/Shift+F10/Esc), snarveipanel, panelfokus, ikke global fangst | shared/lib/useStageNav.ts, shared/ui/ContextMenu.tsx, ShortcutsPanel, docs/samhandling.md | e2e/workspace-nav.spec.ts, interaction.spec.ts, interaction-more.spec.ts, motion-context-menus.spec.ts, motion-timeline-nav.spec.ts, shared/lib/workspace-nav.test.ts | kode+test | Mockups/Isolate/Loop dekning varierer; docs/samhandling.md har oversikt |
| R3-028 | 11-01 | Other | Alle tallverdier direkte redigerbare (Enter/Esc, komma, synk med slider) | shared/ui/NumField.tsx | NumField.test.ts; e2e/num-field.spec.ts (Photo, Loop); units.spec.ts | kode+test | Thumbnail/Motion/Mockups-felt ikke bekreftet i spec |
| R3-029 | 11-01 | Other | Dra og slipp gjennomarbeidet (terskel, snapping, målmarkering, avbryt påvirker ikke prosjekt) | shared/lib/snap.ts | e2e/snap.spec.ts; interaction.spec.ts («Escape under draing legger laget tilbake») | kode+test | indikatorer/mål-markering på tvers av apper ikke bekreftet |
| R3-030 | 11-02 | Motion | Motion export-test («Motion-eksporttesten som mangler») kjøres før publisering | n/a | e2e/motion-export.spec.ts | kode+test | prosessinstruks; testen finnes |
| R3-031 | 11-02 | Motion | Bug: «beskjær» (crop) funker ikke ved dra; lås/beskjæring i høyreklikkmenyen virker ikke; menyen for usynlig | features/motion-design/Editor.tsx, engine/model.ts + render.ts (crop), Advanced.tsx | motion-context-menus.spec.ts dekker lås; ingen treff på crop/beskjær i motion e2e eller engine.test.ts | kode, ingen test | ingen regresjonstest for beskjær-drag i Motion |
| R3-032 | 11-02 | Motion | Gjør forhåndsvisningen/«denne» større | uklar referanse (muligens forhåndsvisning/fullskjerm) | motion-fullscreen.spec.ts | uklart | uklart hva «denne» er |
| R3-033 | 11-02 | Motion | Kontroller auto-skjules når pekeren er borte, komprimer knapper/tidslinje slik at video er i fokus (fullskjerm) | features/motion-design/FullBar.tsx (data-md-idle) | e2e/motion-fullscreen.spec.ts (linje 57: linjen skjules og kommer tilbake) | kode+test | |
| R3-034 | 11-02 | Mobile | Mobil: alle funksjoner på én side uten blaing; første side uten rulling; desktop uendret | shared/ui/MobileDock.tsx, shared/ui/dock.ts, MoreButton | e2e/dock.ts, mobile-touch.spec.ts, mobile-workflows.spec.ts, workspace-layout.spec.ts | kode+test | «første side (hub) uten rulling» ikke tydelig i en spec (site-pages.spec.ts dekker bare innhold) |
| R3-035 | 11-02 | Infra/release | Push alt til main/dev; automatisk push ved ferdig | tools/ship-dev.mjs, release.yml | release-decide.test.ts | uklart | prosess; hos eier-godkjenning |
| R3-036 | 11-02 | Colors/themes | Gjenopprett fargekurve-gradient-bakgrunnsverktøyet (lage bakgrunner), eget verktøy ved siden av RGB-kurver, plassering ikke på kurvestedet | shared/fill/CurveGradient.tsx, CurvePad.tsx, fill.ts, FillEditor.tsx | e2e/photo-gradient.spec.ts («toveis med kurven, retning…, lagring, eksport og angre») | kode+test | brukerens avklaring om plassering endret flere ganger (R3-037) |
| R3-037 | 11-02 | Colors/themes | Plassering: «begge skal ligge der» (flytt/kurver) → rettet «helt feil, skal ikke ligge der» | Photo Props.tsx / Editor.tsx | photo-gradient.spec.ts | erstattet | siste instruks gjelder: gradientverktøy som egen bakgrunnsgenerator, ikke ved kurven |
| R3-038 | 11-02 | Colors/themes | Fargene for svake: sterkere/bedre forhåndsvalg | shared/fill/fill.ts (presets), CurveGradient | photo-gradient.spec.ts (delvis) | uklart | subjektivt; ingen test |
| R3-039 | 11-02 | Colors/themes | Flere retninger/former (kryss, diamant, rund, vinkel…) i rullegardin og 4 nye profesjonelle bakgrunnsfarger | fill.ts CURVE_SHAPES (linear, mirror, cross, diamond, square, radial, conic) + FILL_MODES | photo-design... «Photo Design: fargekurve-gradienten (forhåndsvalg, form, retning)» i advanced-adjust.spec.ts | kode+test | «4 nye farger» ikke bekreftet |
| R3-040 | 11-02 | Colors/themes | Bakgrunnsfargevelger (RGB/HEX/preview/reset) som felles komponent i alle bilde-/videoapper; kurver og svartpunkt/vibrance/klarhet delt | shared/ui/BgColor.tsx (Photo Props, Thumbnail Controls, Motion Props), shared/image/AdvAdjust.tsx | e2e/advanced-adjust.spec.ts («Thumbnail: justering per bildelag», «Loop: bare sliden»), feedback-verify.spec.ts (TB-FC418D) | kode+test | Mockups/Isolate bruker ikke BgColor (grep); Loop bruker egen implementasjon (ikke shared BgColor) |
| R3-041 | 11-02 | Mobile | Bakgrunnsfargevelger/gradient brukbar på mobil (touch, skuff) | PhotoDesign Props | photo-gradient.spec.ts («mobil: egne farger… i Rediger-skuffen») | kode+test | bare Photo mobil dekket |
| R3-042 | 11-02 | Other | Full funksjonskontroll av alle apper: import/eksport/lagring/gjenoppretting, feilhåndtering, mobil | alle features/* | export-import-all.spec.ts (Photo, Thumbnail, Motion, Loop), import-invalid.spec.ts, mockups-*.spec.ts, legacy-import.spec.ts | kode+test | Mockups-eksport og Isolate-eksport dekkes av egne spec; Dine medier/forsiden i site-pages |
| R3-043 | 11-02 | Mobile | Mobil berøringsmål ≥44px, pointercancel/touch-action, kontekstmenyer uten høyreklikk («⋯») | MobileDock, MoreButton, ContextMenu | mobile-touch.spec.ts («⋯»…menyvalgene er fingerstore»; PC uten «⋯») | kode+test | ikke fysisk enhet |
| R3-044 | 11-03 | Infra/release | Undersøk de 140 hoppede nettlesertestene (skip-regler, mobil/PC-prosjekter), kjør på riktig enhet, tsc -b, lint | web/playwright.config.ts, playwright.iphone.config.ts (WebKit iPhone 15, ikke i CI) | n/a (konfigurasjon) | kode, ingen test | docs/testlogg.md viste ingen treff «140»; resultatet må sjekkes i siste kjøring |
| R3-045 | 11-03 | Other | Bekreft total testdekning per app/funksjon (PC+mobil), skille testet/ikke testet/krever backend | docs/testing.md, docs/manuelle-tester.md | alle spec | uklart | eierforespørsel om rapport; admin/innlogging/skylagring kun i e2e-dev/e2e-prod (krever ekte backend) |
| R3-046 | 11-03 | Infra/release | Fiks gjenstående feil, commit/push connecthub, merge release-PR, deploy produksjon | release.yml, release-verify.yml | release-decide.test.ts | uklart | prosess, ikke kode |

### Del 4
Stier er relative til F:\ReactProjects\MediaLabReact\web (docs/ = F:\ReactProjects\MediaLabReact\docs). Siste melding (full revisjon) er hoppet over.

| ID | dato | område | krav | kodebevis | testbevis | status | notat |
|---|---|---|---|---|---|---|---|
| R4-001 | 11-03 | Infra/release | Rapport om 143 hoppede tester (hvilke, hvorfor, risiko, CI) | docs/testlogg.md (hopp over: dev-mobil, server-dev not_configured, 28/13 planlagte) | ingen (rapportoppgave) | uklart | Ingen egen oversikt over nøyaktig 143 funnet; bare spredte "hoppet over"-linjer i testlogg |
| R4-002 | 11-03 | Motion | 4K · 60 fps som eget valg, 4K·30 og andre beholdt, fallback, verifisert 3840x2160 @60 | src/features/motion-design/Editor.tsx (EXP), controller.ts (canEncode, fallback ~l.4209) | e2e/motion-export-4k60.spec.ts («4K · 60 fps: eget valg ... 3840 × 2160 i 60 fps», «uten støtte ... 4K · 30 fps med beskjed»); e2e/motion-export-fallback.spec.ts | kode+test | Filmetadata sjekkes via mp4.ts/media-probe |
| R4-003 | 11-03 | Infra/release | Sluttkontroll funksjonsdekning alle apper (admin, innlogging, skylagring, Loop-lagring, mobil, Photo-kurve) | e2e-dev/* (admin-dev, access-dev, loop-disk-dev, photo-dev), docs/testlogg.md | e2e-dev/*.spec.ts; e2e/mobile-*.spec.ts | kode+test | Oppgave er revisjon; dekningen finnes, men krever dev-DB (hoppes over uten) |
| R4-004 | 11-03 | Mobile | iPhone/Android-emulering, mobilarbeidsflyter, ærlig rapport om emulering | playwright.iphone.config.ts (WebKit iPhone 15), playwright.config.ts (Pixel 7 «mobil») | e2e/mobile-touch.spec.ts, e2e/mobile-workflows.spec.ts, mobil-tester i hver app-spec | kode+test | Ikke ekte iOS Safari/fysisk enhet; iPhone-config ikke med i CI (egen merknad i filen) |
| R4-005 | 11-03 | Loop | Testhull Loop: tekstfarger, QR-plassering, fritt plasserte elementer, paletter, skrifter, lysstripe, tom tidslinje | src/features/loop-studio/*; e2e/loop-fx-theme.spec.ts | loop-studio*.spec.ts (vignett, stilpakke, logo, overlegg, bakgrunn), loop-fx-theme.spec.ts, fonts.spec.ts (Loop-skrift), qr-codes.spec.ts (bare Thumb/Photo/Motion) | kode, ingen test | Ingen funnet test for QR-plassering i Loop, fritt plasserte elementer eller tom tidslinje |
| R4-006 | 11-03 | Thumbnail | Testhull: flytte paneler, lagkobling, bakgrunn, vignett | src/features/thumbnail-studio/* | e2e/thumbnail-studio.spec.ts (lag, mobil), thumbnail-place.spec.ts; ingen eksplisitt panelflytt/vignett | uklart | Panelflytting og lagkobling ikke funnet som egen test |
| R4-007 | 11-03 | Motion | Testhull: tekstanimasjoner, looks, transformhåndtak | src/features/motion-design/* | e2e/motion-text.spec.ts, motion-effects.spec.ts, motion-manual-features.spec.ts, motion-anchor.spec.ts | kode+test | Transformhåndtak-test ikke eksplisitt verifisert |
| R4-008 | 11-03 | Other | Mockups: forgrunn, F5-handling, dobbeltklikk-tilbakestill | src/features/mockups/* | e2e/mockups*.spec.ts (place, rotate, undo, load, logo, verify) | uklart | Ikke grepet etter F5/dobbeltklikk-reset spesifikt |
| R4-009 | 11-03 | Photo | Testhull: blandingsmoduser, looks, vignett, RGB-kurve persistens etter omlasting | src/features/photo-design/engine/*; src/shared/fill/curve.ts | e2e/photo-design-advanced.spec.ts (kanalkurve), photo-develop-tools.spec.ts, feature-gaps*.spec.ts | uklart | Persistens-etter-omlasting av RGB-kurve ikke bekreftet |
| R4-010 | 11-03 | Mobile | Delte kontroller på mobil: Photo tekstkontroller, Motion grønnskjerm, Loop-brytere | src/shared/ui/MobileDock.tsx | e2e/mobile-workflows.spec.ts, mobile-touch.spec.ts, motion-responsive.spec.ts | uklart | Grønnskjerm/Loop-brytere ikke eksplisitt funnet |
| R4-011 | 11-03 | Export/save | Import/eksport: filformater og at eksport inneholder forventet resultat | e2e/png.ts, mp4.ts, media-probe.ts | e2e/export-import-all.spec.ts, import-invalid.spec.ts, legacy-import.spec.ts, motion-export*.spec.ts | kode+test | |
| R4-012 | 11-03 | Infra/release | Auto commit/push/merge etter fiks; sjekk forside og undersider | – | e2e/site-pages.spec.ts, e2e-dev/site-crawl-dev.spec.ts | kode+test | Git-flyt er prosess, ikke kode |
| R4-013 | 11-07 | Hub/admin | TB-7AA909/946F91: Kopier alle saker = alle uløste; knapper for arkiverte (Arkiv-fane), under behandling, trenger info | src/features/admin/Feedback.tsx (data-fb-copy) | src/features/admin/Feedback.test.tsx («Kopier alle saker» tar alle uløste; egne knapper under behandling/ekstra info; arkiverte bare i Arkiv) | kode+test | |
| R4-014 | 11-07 | Feedback | TB-53E3CF: forhåndsvisning av hele siden med gul markering, uten personinnhold | src/shared/feedback/LayoutPreview.tsx, LivePreview.tsx, layout.ts | e2e/feedback-preview.spec.ts; src/shared/feedback/layout.test.ts, feedback-core.test.ts | kode+test | |
| R4-015 | 11-07 | Sharing/collab | TB-09177E: send produkt/mal til annet medlem, varsel, godta ✓/avslå ✕ | src/features/thumbnail-studio/controller.ts, repo.ts | src/features/thumbnail-studio/sharing.test.ts («send», «✓ godta ... ✕ avslå»); e2e-dev/loop-sharing-dev.spec.ts | kode+test | Varselsvisning i UI ikke egen e2e |
| R4-016 | 11-07 | Thumbnail | TB-F7323D: beskjæring skal samsvare med valgt område | src/features/thumbnail-studio/engine (crop) | src/features/thumbnail-studio/crop.test.ts (Fyll/contain/rotasjon) | kode+test | Kun enhetstest, ikke e2e av popup |
| R4-017 | 11-07 | Thumbnail | TB-7EB53A/TB-FC418D: Isolate Subject/fjern bakgrunn tilgjengelig for vanlig bilde; legge til bakgrunn bak motiv | thumbnail-studio/Controls.tsx, Dialogs.tsx, controller.ts | e2e/feedback-verify.spec.ts («TB-FC418D: farge bak motivet ...»); e2e/thumbnail-place.spec.ts | kode+test | TB-7EB53A (knappen vises for enkelt bilde) ikke egen test funnet |
| R4-018 | 11-07 | Feedback | TB-ED697B: mindre/flyttbar instruksjon, markere inne i skjema, brukerknapp, hurtigtast | src/app/Feedback.tsx, AccountMenu.tsx | src/app/Feedback.test.tsx (Alt+Shift+M, flyttbar instruksjon); e2e/feedback-preview.spec.ts («Alt+Shift+M markerer ... i kontomenyen») | kode+test | Test sier «ingen egen knapp i skjemaet» (endret løsning) |
| R4-019 | 11-07 | Loop | TB-1591A7: mindre informasjonsbanner (data-ch-base-banner) | src/features/loop-studio/LoopStudio.tsx | e2e/feedback-verify.spec.ts («TB-1591A7 ... én lav linje») | kode+test | |
| R4-020 | 11-07 | Sharing/collab | TB-143BF7: bilder/innhold følger med i delte Loop-prosjekter | loop-studio (ch:-referanser, item_shares) | e2e-dev/loop-sharing-dev.spec.ts, loop-base-load-dev.spec.ts | kode+test | Kun dev-DB-tester (hoppes over uten dev) |
| R4-021 | 11-07 | Sharing/collab | TB-A43E52: felles grunnoppsett på tvers av medlemmer, publiser/privat, lavt lagringsbruk | supabase/migrations/20261108100000_item_shares.sql; thumbnail sharing; loop | e2e-dev/shared-setup-dev.spec.ts, loop-sharing-dev.spec.ts; sharing.test.ts; supabase/tests/rls_test.sql | kode+test | Andre «relevante apper» (Photo shared-tpls.test.ts finnes) ikke vurdert i dybden |
| R4-022 | 11-07 | Loop | TB-B4A133: se andre medlemmers grunnoppsett | loop-studio, item_shares | e2e-dev/loop-sharing-dev.spec.ts | kode+test | |
| R4-023 | 11-07 | Motion | TB-349A3E: tekst går ut av knapper (Legg til/Overlegg) | motion-design/Panels.tsx | e2e/feedback-verify.spec.ts («TB-349A3E ...») | kode+test | |
| R4-024 | 11-07 | Motion | TB-66E8B2: dra medier fra mediapool til tidslinje; lagtyper; egne lag med navn/type | motion-design/Timeline.tsx («+ Nytt lag»), engine/edit.ts, model.ts | engine/edit.test.ts (lagnavn flyttes) | uklart | «+ Nytt lag» og typer finnes; DRA fra mediapool til tidslinje ikke funnet (Editor.tsx tar bare fil-drop, Panels.tsx draggable=false); ingen e2e |
| R4-025 | 11-07 | Photo | TB-D8AE3F: kurveverktøy gir feil effekt | shared/fill/curve.ts | shared/fill/curve.test.ts (TB-D8AE3F) | kode+test | |
| R4-026 | 11-07 | Photo | TB-6D1979: glider nullstilling (dobbeltklikk, ↺, skriv tall) | shared/ui/NumField.tsx | e2e/num-field.spec.ts («TB-6D1979»); NumField.test.ts | kode+test | |
| R4-027 | 11-07 | Photo | TB-7204A6: velg flere lag, «Slett alle» | photo-design/Editor.tsx (data-pd-del-all) | e2e/num-field.spec.ts («TB-7204A6») | kode+test | |
| R4-028 | 11-07 | Infra/release | Additive DB-migreringer, ingen destruktive endringer | supabase/migrations/20261108100000_item_shares.sql | supabase/tests/rls_test.sql | kode+test | Kjøring på dev/prod kan ikke verifiseres fra koden |
| R4-029 | 11-08 | Feedback | TB-7D30CC: scrolling i skjema under markeringsmodus, verdier bevares | src/app/Feedback.tsx | e2e/feedback-preview.spec.ts («skjemaet kan scrolles under markering ...»); Feedback.test.tsx | kode+test | Safari ikke direkte testet (iPhone-WebKit bare lokal config) |
| R4-030 | 11-08 | Infra/release | PROJECT_CONTEXT.md + CLAUDE.md-instruks; oppdater løpende | F:\ReactProjects\MediaLabReact\PROJECT_CONTEXT.md; CLAUDE.md l.5 | – | kode, ingen test | Dokument, ingen test nødvendig |
| R4-031 | 11-08 | Infra/release | Kjøre item_shares-migrering på dev, passord-reset dev, merge PR #36/#37 | migrasjon finnes | e2e-dev/*; PROJECT_CONTEXT.md notat om verifisering 2026-11-08 | uklart | Prosess/miljø; kan ikke bekreftes fra kode |
| R4-032 | 11-09 | Feedback | Realistisk forhåndsvisning (ekte React-komponenter, anonymisert, lite lagring, alle apper inkl. admin, PC/mobil, forstørre) | shared/feedback/LivePreview.tsx, LayoutPreview.mount.tsx, layout.ts | e2e/feedback-preview.spec.ts («forhåndsvisningen viser den ekte siden ... uten å kunne endre noe», skjermstørrelser); layout.test.ts | kode+test | Dekning av alle apper/admin-sider ikke fullt bekreftet |
| R4-033 | 11-09 | Performance | Raskere LivePreview (måle før/etter, lasteindikator) | shared/feedback/LivePreview.tsx | e2e/feedback-preview.spec.ts (delvis); ingen målingstest; testlogg har ingen LivePreview-måling | uklart | Måling før/etter ikke funnet |
| R4-034 | 11-10 | AI/image | Isolate: «Fyll med omgivelsene» = ekte inpainting (ikke blur); Blur separat; angre/lag; original urørt | isolate-subject/engine/inpaint.ts, lama.ts, fill.ts, blur.ts, fill.worker.ts | e2e/isolate-fill.spec.ts (Fyll + Angre/Gjør om; «Gjør uskarp er eget valg»); engine/engine.test.ts; e2e-real/isolate-images.spec.ts | kode+test | e2e-real krever ekte modeller (ikke i vanlig CI); visuell kvalitet bare delvis automatisk |
| R4-035 | 11-11 | Photo | Gradientverktøy: flere farger, kurve toveis, retning/plassering, styrke/transparens, av/på/fjern/tilbakestill, ingen auto-opprettelse, lagring, eksport | shared/fill/FillEditor.tsx, CurveGradient.tsx, curve.ts, fill.ts | e2e/photo-gradient.spec.ts (PC + mobil); shared/fill/curve.test.ts | kode+test | |
| R4-036 | 11-11 | Photo | Zoom/zoom ut-knapper dekker over bildet | photo-design/Editor.tsx (zoom-kontroll l.146–150) | ingen | uklart | Uklart hvilken app; ingen test/fiks funnet |
| R4-037 | 11-11 | Performance | RAM-/minneoptimalisering alle apper (lekkasjer, cleanup, mål før/etter) | e2e-mem/*; src/shared/media/useAssetUrl.ts, lib/idle.ts | e2e-mem/memory.spec.ts, detached.spec.ts, snapshot.spec.ts, pieces.spec.ts | kode+test | Safari-RAM ikke målt (bare Chromium-heap); målinger bare delvis i testlogg |
| R4-038 | 11-11 | Fonts | Felles fontbibliotek, fontvelger, dynamisk lasting, lisensfiltrering, ekte snitt B/I, fallback, bruk i Photo/Thumb/Motion/Loop | shared/fonts/{catalog.ts,loader.ts,FontPicker.tsx,catalog.json}; docs/fontkatalog.json | shared/fonts/catalog.test.ts; e2e/fonts.spec.ts (alle 4 apper + mobil) | kode+test | |
| R4-039 | 11-11 | Fonts | Alle ~300 aktuelle fonter inkludert; Google-fonter selvdrevet | build/vendor-fonts.json (203 Google); docs/maler-og-fonter.md l.68, 134 | catalog.test.ts | kode+test | Delvis: 142 «Last ned selv»-fonter ikke med (mangler fontfil+lisensfil), dokumentert i docs/fonter-ikke-med.json |
| R4-040 | 11-11 | Thumbnail | Filtersystem F01–F13 (stable, av/på, lagres, eksport) | thumbnail-studio/engine, Controls.tsx | e2e/thumbnail-filters.spec.ts (PC, mobil, alle 13) | kode+test | |
| R4-041 | 11-11 | Templates | 150 Thumbnail-maler (6 kategorier, 1,5x skalering, BILDE/UTKLIPT, fargeroller, popup) | docs/maler-katalog.json; thumbnail-studio | e2e/thumbnail-library.spec.ts (velg/bytt bilde/lagre/eksporter, skisser for alle maler); thumbnail-slots.spec.ts | kode+test | Visuell likhet mot original bare delvis målt; antall bør dobbeltsjekkes mot docs |
| R4-042 | 11-11 | Photo | Nye editorfunksjoner: korn, slitt tekst, loddrett tekst, klippemasker, glød, tekstur i tekst, sirkeltekst, strekkode | photo-design/engine | e2e/photo-features.spec.ts (glød, slitt, sirkelbane, bilde i tekst, mønster, skygge); photo-design-advanced.spec.ts | uklart | Korn, loddrett tekst, klippemasker og strekkode ikke funnet i testnavn |
| R4-043 | 11-11 | Templates | 100 Photo Design-maler (5 kategorier, formater, fargeroller, BILDE) | docs/maler-katalog.json; photo-design/* | e2e/photo-library.spec.ts; photo-design-categories.spec.ts; fonts-justify.spec.ts (061/062/100) | kode+test | |
| R4-044 | 11-14 | Thumbnail | trl-22: fylle alle 12 bildefelt, andre maler beholder grense 5 | thumbnail-studio | e2e/thumbnail-slots.spec.ts («trl-22: alle 12 ...», «andre maler beholder grensen på 5») | kode+test | |
| R4-045 | 11-14 | Photo | Mal 062 (og 061, 100): text-align justify, bryter, eksport = forhåndsvisning | photo-design engine (justify, jw); docs/maler-og-fonter.md l.133 | e2e/fonts-justify.spec.ts («Photo-mal ... blokkjustert, bryteren virker, eksporten er lik forhåndsvisningen») | kode+test | |
| R4-046 | 11-14 | Fonts | Bagnard/Bagnard Sans/Ostrich Sans: manglende ÆØÅ håndteres, lisens korrekt | fonts catalog + FontPicker varsel; docs l.140 | e2e/fonts-justify.spec.ts («Bagnard (uten ÆØÅ) ...»); fonts.spec.ts | kode+test | |
| R4-047 | 11-14 | Motion | Analyse av 13 referansevideoer og mal per unik type + 3 originale premiummaler | docs/motion-referansemaler.md; motion-design/engine | e2e/motion-reference-templates.spec.ts (13 maler, PC+mobil, eksport = forhåndsvisning); motion-templates*.spec.ts | uklart | 13 referansemaler finnes; de 3 originale premiummalene og «visuell likhet gjennom hele videoen» ikke bekreftet |
| R4-048 | 11-14 | Motion | Funksjoner bak malene også manuelt (tekstanimasjon, overganger, effekter, keyframes) | motion-design/* | e2e/motion-manual-features.spec.ts, motion-keyframes.spec.ts, motion-effects.spec.ts, motion-text.spec.ts | kode+test | |
| R4-049 | 11-14 | Motion/Mobile | Responsiv Motion Studio PC+mobil, alle breakpoints 320–1536+ | motion-design/*.css | e2e/motion-responsive.spec.ts (parametrisert w×h) | kode+test | Faktiske bredder dekket ikke verifisert mot alle 7 intervall |
| R4-050 | 11-14 | Performance | Ytelse for hele økosystemet (RAM, bundle, lazy loading, måling før/etter, desktop+mobil) | vite.config.ts; lazy imports; shared/lib/idle.ts | e2e-mem/*; e2e-dev/hub-logo-perf-dev.spec.ts | uklart | Målinger før/etter for alle apper og mobil ikke funnet samlet |
| R4-051 | 11-14 | Templates | Felles malbibliotek: «Alle maler», kategorier, søk, sortering i Thumb/Photo/Motion/Loop; Thumbnail som referanse | shared/templates/TemplateLibrary.tsx, TemplatePicker.tsx, filter.ts | e2e/templates-theme.spec.ts (alle 4 apper); shared/templates/theme.test.ts | kode+test | «Ny mal» vs «Egne maler» separasjon ikke eksplisitt testet |
| R4-052 | 11-14 | Colors/themes | Felles fargevelger: Standard, 10 temaer, egendefinerte; Standard gjenoppretter originalen | shared/templates/ThemePicker.tsx, theme.ts, shared/theme/theme.ts | shared/templates/theme.test.ts; e2e/templates-theme.spec.ts; photo-design-theme*.spec.ts | kode+test | |
| R4-053 | 11-15 | Colors/themes | Photo bruker den felles fargevelgeren (kontrastsikring, rollefarger bevart) | photo-design/Colors.tsx | e2e/templates-theme.spec.ts («Photo: egne farger i den felles fargevelgeren ... Standard gir malens farger tilbake») | kode+test | |
| R4-054 | 11-15 | Loop | Dekorative lyseffekter (gnister, lysstriper) følger fargetemaet | loop-studio (fx), shared/fx/fx.ts | e2e/loop-fx-theme.spec.ts | kode+test | |
| R4-055 | 11-15 | Motion | Bilde-i-bilde-rammer som redigerbare former | motion-design (ramme) | e2e/motion-frame.spec.ts | kode+test | |
| R4-056 | 11-15 | Motion | Ankerpunkt styrer skalering av klipp | motion-design | e2e/motion-anchor.spec.ts (rotasjon + skalering, keyframes, lagring) | kode+test | |
| R4-057 | 11-15 | Motion | Referanseopptak/fargeflater ikke permanent erstatning for ekte medier | motion-design templates (plassholdere) | e2e/motion-reference-templates.spec.ts («alle felt byttes med eget bilde/video») | kode+test | |
| R4-058 | 11-15 | Motion | Music Sync: BPM/beats/intensitet/drops/tempoendringer, felles timing-motor, malprofiler, av/på, manuell overstyring | motion-design/engine (sync), controller.ts | e2e/motion-music-sync.spec.ts (sakte/rask/drop, per mal, lagring, eksport) | kode+test | Test dekker «tempoendringer» uklart; ekte musikk-variasjon begrenset til syntetiske spor |
| R4-059 | 11-03 | QR | QR-funksjonalitet (kontrollert i revisjon) | shared/qr/qr.ts, QrFields.tsx | shared/qr/qr.test.ts; e2e/qr-codes.spec.ts (Thumbnail, Photo, Motion) | kode+test | Ikke Loop |

## Oppfølging 3 – iPhone (Motion-miniatyr, fullskjerm, mobilgjennomgang)

**Testgrunnlag:** ingen ekte iPhone tilgjengelig (ingen kostnader). Verifisert med Playwright **WebKit iPhone 15-emulering**
(`playwright.iphone.config.ts`, Safari-motoren på Windows) og Chrome mobilemulering (Pixel 7). Alt nedenfor er derfor
**IKKE VERIFISERT PÅ EKTE iPHONE** – se testplanen nederst.

| Funn | Årsak | Retting | Test | Status |
|---|---|---|---|---|
| Motion: prosjektkortet et stort svart felt | Miniatyren ble tatt ved spillehodet (ofte et svart bilde: mange maler starter på svart, og på iPhone er videoene ikke dekodet før de spilles); prosjekter uten miniatyr fikk svart bakgrunn | Miniatyren velges blant flere tidspunkter (første med innhold), ellers miniatyren av første bilde/video; kortet viser en reserve (ikon, format, varighet) når miniatyren mangler eller er mørk – også for eldre prosjekter | `e2e/motion-mobile-iphone.spec.ts` (PC, Chrome mobil, WebKit iPhone): mal som starter på svart får miniatyr med innhold; tomt prosjekt og eldre svart miniatyr viser reserve | Implementert, emulert ✔ |
| Motion: fullskjerm gjorde ingenting på iPhone | Safari på iPhone har ikke Fullscreen API for andre elementer enn video; `el.requestFullscreen?.()` avbrøt stille | Ekte fullskjerm der den finnes (PC, Android, iPad med webkit-prefiks); ellers «Fyll skjermen»: forhåndsvisningen over hele skjermflaten (`100dvh`, safe areas, over appens navigasjon), avspillingslinjen og «Lukk visningen». Kalles ikke fullskjerm. Esc lukker; på berøringsskjerm henter første trykk fram den skjulte linjen (uten å starte avspillingen) | Samme spec: dekker skjermen i portrett og landskap, ingenting fra appen over, lukk-knapp via trykk, editoren tilbake | Implementert, emulert ✔ |
| Alle editorer: filtre, uskarphet, svart-hvitt, metning m.m. uten virkning på iPhone | Safari har ikke `filter` på 2D-lerret (31 bruk i Photo, Thumbnail, Motion, Isolate, effekter) – ignoreres stille | `shared/platform/canvas-filter.ts`: installeres bare der `filter` mangler; `drawImage` med filter gjøres som pikseloperasjoner (uskarphet, svart-hvitt, sepia, metning, fargetone, lysstyrke, kontrast, invertering, opasitet) i det tegnede området; `save/restore` tar filteret med. Chrome/PC uendret | Enhetstester (5); `thumbnail-filters` (svart-hvitt på personbildet) består nå i WebKit | Implementert, emulert ✔ (ikke i Web Workers – Isolates maskekanter) |
| Photo/Thumbnail: eksport og lesing av lerretet feilet med «slitt tekst» og kornfilter | SVG-teksturer med `feTurbulence` forurenser lerretet i Safari («The operation is insecure») | `shared/lib/noise-texture.ts`: SVG-et brukes der lerretet forblir lesbart (Chrome, uendret), ellers samme type støy laget direkte på lerret | Enhetstester (3); designsamlingens mal «001» og fargetema-testen i Photo består i WebKit | Implementert, emulert ✔ |
| Thumbnail: malforhåndsvisningene kom aldri på iPhone | IntersectionObserver meldte bare ett kort synlig i den rullbare malpopupen i WebKit | `TemplateLibrary` regner også ut synlige kort direkte (start, rulling, størrelse) | Malbibliotek-testene for Thumbnail og Motion består i WebKit | Implementert, emulert ✔ (én kategori i `thumbnail-library` feiler fortsatt i WebKit – under arbeid) |
| Tekstfelt: iOS zoomer inn ved fokus (felt under 16 px) | iOS-adferd | `maximum-scale=1` bare på iOS (brukeren kan fortsatt knipe-zoome; Android uendret) | Enhetstest (iOS/iPadOS/Mac/Android) | Implementert, IKKE VERIFISERT (krever ekte iPhone) |
| Dialoger og menyer kunne havne bak Safaris verktøylinje | `100vh` = høyden uten Safaris linjer | `dvh` etter hver `vh` (13 steder) og i Loops innebygde stiler; Loops fullskjermreserve bruker `dvh` | Regresjon | Implementert, IKKE VERIFISERT på ekte enhet |
| Snarveimenyen: «Fullskjerm» gjorde ingenting på iPhone | som over | Valget vises bare der nettleseren har fullskjerm | – | Implementert |

**WebKit iPhone-emulering, hele mobilsuiten:** før 69 bestått / 43 feilet → etter 76 / 23 (deretter flere rettet). Gjenstående
feil i WebKit er under arbeid i neste runde: mange er tidsavbrudd (WebKit på Windows er tregere), fingerdrag av lag i
Photo/Thumbnail (emulert berøring), fargetester etter temabytte, Loop-tester. **Skilles fra appfeil i neste runde.**

### Testplan for deg på ekte iPhone (Safari, ca. 10 min)
1. Motion → åpne et prosjekt → «Lagre» → tilbake til prosjektene: kortet viser et bilde eller en reserve (ikke svart).
2. Motion → «Fyll skjermen» (knappen ved tidskoden): videoen fyller skjermen i både stående og liggende; trykk én gang
   viser avspillingslinjen; «Lukk visningen» tar deg tilbake til editoren.
3. Thumbnail → «Ny mal»: forhåndsvisningene kommer når du ruller; velg en mal med filter (f.eks. svart-hvitt) → bildet
   endrer seg → Eksporter → bildet lastes ned.
4. Photo → designmal «001» (søk «001») → Eksporter: bildet lastes ned med slitt tekst.
5. Trykk i et lite tallfelt (f.eks. størrelse): siden skal ikke zoome inn.
6. Photo → «Bytt bilde» med et bilde fra kameraet (gjerne 48 MP): bildet vises, og eksporten har det.
