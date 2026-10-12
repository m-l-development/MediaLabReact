# Ny menighet: hva den starter med

Krav (2026-10-12): En ny menighet starter **tom** – egne maler, grunnoppsett, Faste bilder og Felles ressurser fyller den selv. De **generelle standardmalene og demoinnholdet** i verktøyene er der for alle. **Livets Ords innhold hører til Livets Ord**, og **alle menigheter som finnes i dag, beholder sine logoer, filer og grunnmaler**.

## Status i koden (kontrollert 2026-10-12)

| Del | Hvor det ligger | Ny menighet i dag | Oppfyller kravet |
|---|---|---|---|
| Faste bilder, Felles ressurser, Fellesmappe | `files` per `church_id` i databasen; `CloudPicker` filtrerer på aktiv menighet både i spørringen og i svaret | Tom | **Ja** (komponenttest `features/cloud-picker/CloudPicker.test.tsx`) |
| Menighetens egne maler og grunnoppsett (Thumbnail Studio, Loop Studio, Photo Design) | `church_settings` per `church_id` (`services/shared-setup.ts`) | Ingen rader → tom | **Ja** (databasen oppretter ingenting ved ny menighet; ingen trigger eller seed) |
| Generelle standardmaler og demo (Photo Design-malene, Loop Studio Ukeprogram/Søndagsmøte/Ungdomsmøte/Tom, Motion-maler, Mockups-bildene) | Innebygd i appen | Vises | **Ja** (skal vises for alle) |
| **Livets Ord-innhold**: logoene «Livets Ord-symbol», «Kveldsbibelskole» og «Word of Life» (`thumbnail-studio/engine/model.ts`), grunnoppsettet og kategorien «Kveldsbibelskole» (`engine/layouts.ts`, `engine/backup.ts`), standardkategoriene Søndagsmøte/Kveldsbibelskole/Ungdomsmøte i Photo Design (`photo-design/controller.ts`, `DEFAULT_CATS`) | Innebygd i appen, brukes når menigheten ikke har lagret egne | **Vises også for nye menigheter** | **Nei** |

## Forslag (venter på godkjenning)

Mål: Livets Ord-innholdet vises bare for menigheter som fantes før endringen, og aldri for nye. Ingen eksisterende menighet mister noe.

1. **Databasen (connecthub-dev først):** `whoami` returnerer også `created_at` for hver menighet (ren lesing, ingen data endres). Alternativt et eget felt `legacy_defaults boolean` på `churches`, satt til `true` for alle menigheter som finnes i dag og `false` som standard for nye – tydeligere og uavhengig av dato.
2. **Appen:** Livets Ord-logoene, «Kveldsbibelskole» og Photo Design-kategoriene brukes bare når menigheten har `legacy_defaults` (eller er opprettet før skjæringsdatoen). Nye menigheter får bare de generelle standardmalene og tomme kategorier.
3. **Eksisterende menigheter:** uendret. Det de har lagret selv, ligger i `church_settings` og `files` og røres ikke; de innebygde Livets Ord-standardene fortsetter å gjelde for dem.
4. **Tester:** enhetstester for begge tilfeller (gammel menighet ser Livets Ord-standardene, ny ser dem ikke) og en nettlesertest; deretter kontroll mot connecthub-dev.

**Trenger din beslutning:** (a) felt `legacy_defaults` eller dato, (b) godkjenning av migreringen i connecthub-dev, (c) senere godkjenning for produksjon. Ingenting av dette er gjort.
