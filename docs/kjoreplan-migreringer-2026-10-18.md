# Kjøreplan – migreringer for varsler og menighetens disk (2026-10-18)

**Status:** begge migreringene er kjørt og testet i dev (`uatpdmhnwwjgzlxaucsx`). **Ingen av dem er kjørt i produksjonen**, og planen under er ikke utført. Hvert steg mot produksjonen (`cmuienhheklcgtfmpvbe`) krever egen godkjenning.

## 1. Sikkerhetsgjennomgang av `20261018120000_notifications_clear.sql`

| Punkt | Vurdering |
|---|---|
| Hva den gjør | Legger til to funksjoner: `mark_my_notifications_read()` og `clear_my_notifications(p_only_read)`. Ingen tabell, kolonne, policy eller rad endres når migreringen kjøres. |
| Hvem kan bruke den | Bare innloggede (`authenticated`). Rettigheten er fjernet for `public` og `anon`, og funksjonene avviser kall uten innlogget bruker (42501). |
| Hvilke rader | Bare egne: `where user_id = app.current_user_id()`. Ingen parameter angir bruker eller menighet, så andres varsler kan ikke velges. |
| SECURITY DEFINER | Nødvendig, fordi brukerne ikke har sletterettighet på `notifications`. `search_path = ''` og fullt kvalifiserte navn hindrer kapring via søkestien. |
| RLS | Uendret: lese og oppdatere `read_at` bare for egne varsler. Direkte sletting er fortsatt ikke tillatt. |
| Avhengigheter | Ingen fremmednøkler eller triggere peker på `notifications`, så sletting gir ingen følgeeffekter. |
| Tester | 14 RLS-tester (egne og andres varsler, «fjern leste» lar uleste stå, anonym avvist) og dev-E2E i en egen testmenighet. |
| Risiko for produksjonsdata | Lav. Migreringen endrer ingen data. Etterpå kan hver bruker slette **sine egne** varsler, og det er permanent. Produksjonen er på Supabase Free uten sikkerhetskopier, så slettede varsler kan ikke hentes tilbake. «Tøm varslingsloggen» krever bekreftelse; «Fjern leste» gjør ikke det (fjerner bare leste). |
| Merknader | Ingen hastighetsgrense og ingen logg i `audit_logs`. Det vurderes som akseptabelt, fordi handlingen bare gjelder egne data. `create or replace` erstatter en funksjon med samme navn hvis den finnes i produksjonen – **ikke verifisert**, men den finnes ikke i noen tidligere migrering. |

## 2. `20261018130000_loop_shared_disk.sql` (menighetens disk)

- **Nytt:** tabellen `loop_disk` og funksjonene `loop_disk_save` og `loop_disk_delete`. Ingen eksisterende tabeller eller rader endres.
- **Tilgang:**
  - Medlemmer kan bare lese (RLS `app.is_member`).
  - All skriving går gjennom funksjonene, med medlemskapskontroll. Sletting krever Admin, og alt logges i `audit_logs`.
- **Vekst:** høyst 30 looper × 512 KB per menighet, det vil si 15 MB per menighet i verste fall. Se databasegrensen på Free (500 MB).
- **Sletting av menigheten:** sletter også dens looper (`on delete cascade`). Dette er tilsiktet.

## 3. Rekkefølge og steg (krever godkjenning for hvert steg mot produksjonen)

Migreringene må kjøres i produksjonen **før** koden som bruker dem publiseres. Uten dem viser knappene og menighetens disk bare en feilmelding; ingen data går tapt.

1. **Forberedelse (ikke i produksjonen):**
   - Kontroller at `connecthub` er gjennomgått.
   - Kontroller at RLS-testene består lokalt og i dev (1018/1018).
2. **Tørrkjøring mot produksjonen** (bare lesing):

   ```
   npx supabase@latest db push --linked --project-ref cmuienhheklcgtfmpvbe --dry-run
   ```

   - Listen skal vise de migreringene som mangler.
   - **Ikke verifisert:** om `20261018100000_member_limit.sql` og `20261018110000_church_legacy_defaults.sql` allerede er kjørt i produksjonen. Står de på listen, må de godkjennes særskilt, eller planen stoppes.
3. **Kjøring:** samme kommando uten `--dry-run`. Migreringene kjøres i rekkefølge, og hver migrering i én transaksjon. Feiler en migrering, blir den ikke stående halvveis.
4. **Kontroll etterpå** (bare lesing):
   - Funksjonene finnes: `mark_my_notifications_read`, `clear_my_notifications`, `loop_disk_save` og `loop_disk_delete`.
   - `loop_disk` har RLS slått på og 0 rader.
   - Supabase-rådgiveren (security advisors) viser ingen nye advarsler.
5. **Publisering av koden** (egen godkjenning): merge til `main` og produksjonsdeploy i Vercel.
6. **Tilbakerulling:**
   - **Kode:** tidligere produksjonsdeploy i Vercel.
   - **Database:** `drop function` for de fire funksjonene og `drop table public.loop_disk`. Dette sletter looper som brukerne har lagret på menighetens disk, og krever derfor egen godkjenning.
   - Varsler som brukerne selv har slettet, kan ikke gjenopprettes.
