# Maskering (Isolate Subject og felles maskeredigering)

Status 2026-10-31, connecthub `5d7789d` (Dev). Produksjon (`main`) er ikke endret.

## Felles kode

| Del | Fil | Innhold |
|---|---|---|
| Motor | `web/src/shared/mask/ops.ts` | pensel (hardhet, «Følg kantene»), rektangel, ellipse, lasso, kombinasjon, «Velg objekt»-opprydding (`keepConnected`), «Fjern løse flekker», invertering, kantutjevning langs bildet (guided filter), angre/gjør om med lapper |
| Morfologi | `web/src/shared/mask/morph.ts` | utvid / trekk inn / myking (separable filtre) |
| Redigering | `web/src/shared/mask/MaskEditor.tsx` | verktøylinje, Behold/Fjern, størrelse i bildepiksler med omriss, zoom/panorering, visning (rutemønster, svart, hvitt, original med rødt), hurtigtaster |
| AI | `web/src/features/isolate-subject/engine/segmenter.ts` | MODNet («Person»), ormbg («Objekt»), SlimSAM («Velg objekt», hele objektet) |

## Applikasjoner

| Applikasjon | Maskering | Status |
|---|---|---|
| Isolate Subject | Person/Objekt/Logo/Tekst, «Merk i bildet», «Finjuster masken» (felles redigering) | Oppdatert. Standard etterbehandling uten innstramming (smale detaljer ble fjernet). |
| Thumbnail Studio | AI-utklipp (Person/Objekt) + «Finjuster utklippet» (felles redigering, ny versjon i Dine medier) | Oppdatert. Fast innstramming fjernet. |
| Photo Design | AI-utklipp på bildelag, enkel pensel, inverter + «Finjuster masken …» (felles redigering, skrives til laget med angre) | Oppdatert. Den enkle penselen er beholdt. |
| Mockups | Automatisk okklusjonsmaske (fingre foran skjermen i mockup-fotoene) | Annen funksjon, ikke brukerredigert. Ikke endret. |
| Motion Design | «mask» er en overgangstype (wipe) | Ikke maskering av motiv. Ikke endret. |
| Loop Studio, Dine medier | Ingen maskering; bilder sendes til / fra Isolate Subject | Ikke endret. |

## Målt med ekte modeller (prosjektets egne bilder)

`web/e2e-real` (`npx playwright test -c e2e-real`):

- `isolate-images.spec.ts` (68 punkter, tre bilder): Person mister hender/fingre (tirsdag) og noen personer i scenebilder (fredag); Objekt tar med gjenstander (tallerkener, appelsiner, trelist, pute). Begge 10/10 på hendene (torsdag).
- `isolate-tools.spec.ts`: Person + 2 klikk «Velg objekt» + penselstrøk + «Fjern» med «Følg kantene» på lilla scenelys + «Fjern løse flekker» → 39/39 punkter riktige.
- `thumbnail-mask.spec.ts`: «Finjuster utklippet» lagres i utklippet laget bruker.

## Begrensninger

- De automatiske modellene gjør feil på scenebilder med flere personer; riktig resultat krever da «Velg objekt» og pensel.
- Mørkt mot mørkt (hår/skulder mot mørk bakgrunn): ingen modell eller kantfølging skiller dem; penselen maler der den går.
- «Følg kantene» bruker fargen der strøket starter; glød i en annen tone trenger et eget strøk. En tynn kantrand kan bli igjen.
- Ingen testbilder med mikrofon- eller headsetledning mot bakgrunn i prosjektet; tynne ledninger er testet syntetisk (`e2e/isolate-thin.spec.ts`).
- En kombinasjon av MODNet og ormbg for «Person» ble målt og forkastet (ingen bedring, én ny feil).
