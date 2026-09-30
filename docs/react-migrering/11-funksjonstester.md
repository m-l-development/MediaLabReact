# Funksjonstester (alle funksjoner som ikke var dekket)

Hver test kjører originalen (`legacy-dc/`, på `/_original/…`) og React side om side med ekte filer, og sammenligner etter hvert steg: synlig tekst, feltverdier, lenker, localStorage, rulleposisjon (advarsel), skjermbilde og nedlastede filer. Testfilene ligger i `tests/fixtures/` og lages av `node tests/fixtures/lag.mjs`: ukeprogram som .txt/.csv/.png, musikk med takt, norsk tale, video med lyd, .srt og et bilde på 8,6 MB.

| Fil | Dekker | Resultat |
|---|---|---|
| `funksjoner-felles.spec.js` | NO/EN og lys/mørk på tvers av alle 10 sider; PWA-installasjon (vises, installer, «Ikke nå» i 14 dager) på forsiden, Photo og Motion | likt, desktop + mobil |
| `funksjoner-admin.spec.js` | oppsettkode (feil/riktig), 4,4 MB-grensen, admin- og brukerrolle (ulike faner), logg/system «Oppdater» | likt, desktop + mobil (simulert API) |
| `funksjoner-deling.spec.js` | «Send til …» fra Isolate Subject til Photo, Thumbnail, Mockups og Motion; delt mappe (legg i/hent fra); egne mockup-bilder etter ny innlasting; send fra Mockups | likt |
| `funksjoner-loop.spec.js` | ukeprogram fra .txt og .csv, **tekstgjenkjenning fra bilde**, lydbibliotek + **takt-analyse**, takt-synk av/på, finjuster; **spiller-HTML**, **MP4 1080p og 4K** | likt; HTML byte for byte, video 0 % avvik |
| `funksjoner-thumbnail.spec.js` | kobling av lag, **AI-utklipp (Person)**, fjern tomme kanter, lagre mal, **gjennomsiktig PNG**, JPG 4K, kopier, autolagring, **grunnoppsett**, **sikkerhetskopi → gjenoppretting**, + 40 tilfeldige handlinger | likt |
| `funksjoner-photo.spec.js` | avansert modus: **alle 13 effekttyper, alle looks, 8 paletter × 3 styrker**, favoritter, nylig, **eksport/import av egne forhåndsvalg**; **alle 1920 forhåndsvalg** tegnet med MLFX.thumb (0 ulike); **AI-maske med pensel**, inverter, fjern maske, angre/gjør om; **utfallende 3 mm, bakside, PDF trykk (CMYK)**, PNG 2×, JPG, kopier, autolagring | likt; PDF-strømmer innenfor avrunding (≤ 4/255) |
| `funksjoner-motion.spec.js` | grønnskjerm, farge, **RGB-kurver** (alle/rød/blå, nullstill), **kopier/lim inn farge og lyd**, musikk, **lydmikser med ducking og utjevning**, **.srt inn og ut**, **.motion lagre og åpne**, **eksport 1080p60 og 4K30**, autolagring; **voiceover** (simulert mikrofon) | likt; .srt/.motion byte for byte, video 0 % avvik, voiceover ≈ 3 s i begge |

De nye funksjonstestene for Loop, Thumbnail, Photo, Motion og deling kjøres på desktop. Funksjonene er samme kode på mobil, og mobiloppsettet dekkes av compare-, flyt- og utforskningstestene.

## Toleranser (varierer også når originalen kjøres mot seg selv)
- **Video (WebCodecs):** ulike bytes; sammenlignes på oppløsning, varighet (±0,2 s for sanntidsopptak) og dekodede bilder (10/50/90 %).
- **PNG:** ved ulike bytes sammenlignes piksler, med avrunding ≤ 4 per kanal. **JPG:** ≤ 30 per piksel og under 0,01 % ulike piksler (komprimering med tap). **PDF:** strømmene pakkes ut; bildedata ≤ 4 per verdi.
- **AI-modeller** (ONNX/WebAssembly med tråder) kan gi små avrundingsforskjeller i kantene når maskinen er presset. Alene er resultatene like.
- **Tid:** `Date.now` og `new Date()` er låst i testene (tidsstempler i filer og sikkerhetskopier).

## Ikke testet automatisk
- **Whisper (AI-undertekster)** og **BiRefNet (Objekt)**: også originalen krasjer i headless Chrome (minne). Whisper-testen kan kjøres manuelt med `WHISPER=1`. Prøv begge i en vanlig nettleser.
- **Ekte API/Blob** (tilgangskontroll på serveren, varig lagring), **JS-feil til Admin-loggen** (krever https) og **Safari/Firefox**.

## Endringer i appen underveis (for å være lik originalen)
- Elementene har fått **`data-dc-tpl`** som i originalen, så DOM-strukturen er identisk (kontrollert på alle 9 sider).
- **Lys modus + engelsk ved oppstart:** i originalen ble elementer som bare inneholder tekst laget på nytt når i18n.js hadde oversatt dem, og de slapp dermed font-særheten. `runtime-quirks.js` tar nå hensyn til dette (malteksten per element kommer fra `export const inline` i hver `template.jsx`).

## Siste fulle kjøring

129 passert, 15 hoppet over (mobilvarianter og Whisper), 2 med pikselavvik på mobil. Begge skyldes kappløp i den gamle runtimen etter navigering (siden hentes fra hurtigbufferen):
- Footer-teksten under skjermkanten er skjult i originalen (se 05-loop-studio.md). Den maskeres nå i skjermbildene, fordi footeren har en egen test.
- Lys modus: knapper med `font`-kortform (f.eks. «Nytt bilde», «Last ned sikkerhetskopi») mister fet skrift i originalen bare når andre kompilering vinner over asynkron innlasting. React følger oppførselen ved første besøk. Det er et kosmetisk avvik i originalen, ikke en funksjonsfeil.
