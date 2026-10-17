# Ny menighet: hva den starter med

Krav (2026-10-12): En ny menighet starter **tom** – egne maler, grunnoppsett, Faste bilder og Felles ressurser fyller den selv. De **generelle standardmalene og demoinnholdet** i verktøyene er der for alle. **Livets Ords innhold hører til Livets Ord**, og **alle menigheter som finnes i dag, beholder sine logoer, filer og grunnmaler**.

## Status i koden (kontrollert 2026-10-12)

| Del | Hvor det ligger | Ny menighet i dag | Oppfyller kravet |
|---|---|---|---|
| Faste bilder, Felles ressurser, Fellesmappe | `files` per `church_id` i databasen; `CloudPicker` filtrerer på aktiv menighet både i spørringen og i svaret | Tom | **Ja** (komponenttest `features/cloud-picker/CloudPicker.test.tsx`) |
| Menighetens egne maler og grunnoppsett (Thumbnail Studio, Loop Studio, Photo Design) | `church_settings` per `church_id` (`services/shared-setup.ts`) | Ingen rader → tom | **Ja** (databasen oppretter ingenting ved ny menighet; ingen trigger eller seed) |
| Generelle standardmaler og demo (Photo Design-malene, Loop Studio Ukeprogram/Søndagsmøte/Ungdomsmøte/Tom, Motion-maler, Mockups-bildene) | Innebygd i appen | Vises | **Ja** (skal vises for alle) |
| **Livets Ord-innhold**: logoene «Livets Ord-symbol», «Kveldsbibelskole» og «Word of Life» (`thumbnail-studio/engine/model.ts`), grunnoppsettet og kategorien «Kveldsbibelskole» (`engine/layouts.ts`, `engine/backup.ts`), standardkategoriene Søndagsmøte/Kveldsbibelskole/Ungdomsmøte i Photo Design (`photo-design/controller.ts`, `DEFAULT_CATS`) | Innebygd i appen, brukes når menigheten ikke har lagret egne | **Vises også for nye menigheter** | **Nei** |

## Gjennomført (beslutning 2026-10-17: felt i databasen)

| Del | Endring | Test | Status |
|---|---|---|---|
| Database | Migreringen `supabase/migrations/20261018110000_church_legacy_defaults.sql`: `churches.legacy_defaults boolean not null default false`; alle menigheter som finnes når migreringen kjøres, settes til `true`; `whoami` returnerer feltet per menighet | `supabase/tests/rls_test.sql` (nye menigheter får `false`, eksisterende `true`, feltet i `whoami`; 984/984 lokalt). Kjørt i connecthub-dev etter tørrkjøring: alle 3 dev-menigheter `true` | Dev: ja. Produksjon: **ikke kjørt** (steg C i `docs/lansering.md`) |
| Ny app | `legacyDefaults(me)` i `services/shared-setup.ts` (manglende felt = Livets Ord-innhold, så en eldre database aldri skjuler noe). Thumbnail Studio: grunnoppsettet og standardkategorien «Kveldsbibelskole» bare med `legacy_defaults`. Photo Design: standardkategorien «Kveldsbibelskole» likeså | `services/shared-setup.test.ts`, `features/legacy-defaults.test.ts` (eksisterende menighet ser Kveldsbibelskole; ny menighet ser bare Søndagsmøte/Ungdomsmøte og de øvrige grunnoppsettene) | Ja |
| Logoene (Livets Ord-symbol, Kveldsbibelskole, Word of Life) | Tilbys ikke lenger i noen meny (bare vist i maler som allerede bruker dem); ingen standardmal inneholder dem | Gjennomgang av `engine/layouts.ts`, `engine/backup.ts` og logomenyene | Ja |
| Eksisterende menigheter | Uendret: `legacy_defaults = true`; lagrede kategorier og maler i `church_settings` røres ikke | Som over | Ja |

Tilbakeføring: `supabase/checks/rollback_20261018110000.sql` (gir `whoami` tilbake uten feltet; appen viser da Livets Ord-innholdet for alle som før).
