# Plan: maks 10 brukere per menighet

Status 2026-10-12: **plan, ikke implementert.** Ingen kode, migrering eller database er endret. Godkjente regler (fra deg):

- Grensen gjelder **per menighet**: 10 brukere.
- **Teller:** aktive medlemmer + ventende invitasjoner. Menighetsadministratoren teller som én bruker.
- **Teller ikke:** deaktiverte og fjernede medlemmer, tilbakekalte og utløpte invitasjoner. Et deaktivert medlem kan ikke aktiveres igjen når grensen er nådd.
- **Overstyring:** autorisert stab kan heve grensen for en menighet i dokumenterte særtilfeller; overstyringen logges med begrunnelse.
- **Over grensen fra før:** menigheten beholder alle, men kan ikke legge til flere før den er under grensen.

## 1. Hvordan det telles (én definisjon, i databasen)

`app.member_count(church)` = antall **ulike personer** i menigheten:

1. aktive medlemskap (`memberships.status = 'active'`), pluss
2. ventende invitasjoner til menigheten (`invitations.status = 'pending'`, `expires_at > now()`, rolle `user` eller `church_admin`) **for e-postadresser som ikke allerede er aktive medlemmer**, telt én gang per adresse.

Punkt 2 hindrer dobbelttelling: når en invitasjon godtas, blir personen aktivt medlem, og invitasjonen til samme adresse teller ikke lenger. Samme person med både en bruker- og en admin-invitasjon teller én gang.

## 2. Håndheving (atomisk, alle veier)

Som regelen «én menighet per bruker» (CH001, `20261005100000_single_church.sql`): **triggere** på tabellene, så alle veier stoppes – også direkte skriving via API og veier vi glemmer.

| Tabell | Når triggeren slår til |
|---|---|
| `memberships` | `INSERT` med status `active`, eller `UPDATE` der status går fra noe annet til `active` (reaktivering) |
| `invitations` | `INSERT` med status `pending`, eller `UPDATE` til `pending`, når `church_id` er satt |

Triggeren:
1. tar en transaksjonslås for menigheten: `pg_advisory_xact_lock(hashtextextended('ch:church-members:' || church_id, 0))`. Alle som legger til i samme menighet, står i kø; ulike menigheter påvirker ikke hverandre. Låsen slippes ved commit/rollback.
2. teller `N_før` (uten den nye raden) og `N_etter` (med den).
3. avviser bare når `N_etter > grense` **og** `N_etter > N_før` – altså bare når antallet faktisk øker. Derfor:
   - Å godta en invitasjon (som allerede teller) øker ikke antallet → alltid lov, også i menigheter over grensen.
   - Menigheter over grensen beholder alle; bare nye tillegg stoppes.
4. avvisning: `raise exception … using errcode = 'CH013'` med teksten «Menigheten har nådd grensen på {grense} brukere ({N} inkl. ventende invitasjoner)».

**Låsrekkefølge (unngå vranglås):** medlemskapstriggeren for én menighet per bruker tar i dag lås per bruker. Den nye triggeren tar lås per menighet. Triggere kjøres i navnerekkefølge; den nye får et navn som sorterer etter (`memberships_zz_member_limit`), så rekkefølgen alltid er bruker → menighet. Invitasjoner tar bare menighetslås.

**Veiene dette dekker:**

| Vei | Funksjon | Hva skjer ved grensen |
|---|---|---|
| Admin inviterer (gammel og ny app) | `create_invitation` (server: `invite.create`) | CH013 → «grensen er nådd» |
| Send invitasjon på nytt | `invite.resend` (gammel tilbakekalles, ny lages i samme transaksjon) | antallet øker ikke → lov |
| Stab godkjenner kontoforespørsel til eksisterende menighet | `approve_account_request` | CH013 |
| Stab godkjenner forespørsel med **ny** menighet | samme | ny menighet har 0 → lov |
| Personen godtar invitasjonen | `accept_invitation` | antallet øker ikke → lov (fanger CH013 som `{ok:false,error:'member_limit'}` for sikkerhets skyld, som CH001 i dag) |
| Stab melder inn direkte | `add_membership` | CH013 (stab kan heve grensen først, se 3) |
| Admin/stab aktiverer et deaktivert medlem | direkte `UPDATE memberships` (RLS) | CH013 |

Gratis bivirkning: funksjonene trenger ingen egen telling – triggeren er eneste sted regelen står.

## 3. Overstyring (stab, logget)

- Ny kolonne `churches.member_limit int not null default 10 check (member_limit between 1 and 1000)`.
- `public.set_member_limit(p_church uuid, p_limit int, p_reason text)`: bare **Developer og Moderator** (`app.is_staff()`) med MFA (`app.mfa_ok()`); begrunnelse påkrevd (10–500 tegn); skriver `audit_logs` (`church.member_limit`, gammel og ny grense, begrunnelse). Admin og User får 42501.
- `public.member_usage(p_church)` → `{count, limit, pending}` for menighetens medlemmer og stab, til visning i grensesnittet.
- Å senke grensen under dagens antall er lov (ingen blir fjernet); menigheten kan da ikke legge til før den er under.

**Avklaring:** Er «autorisert stab» både Developer og Moderator, eller bare Developer? Planen bruker begge (som andre stabshandlinger).

## 4. Server (begge appene bruker samme)

- `media-lab/server/lib/http.js`: `CH013 → 409 member_limit` (som CH001).
- `invite.create`, `invite.resend`, `request.approve`: feilen sendes uendret videre; ingen e-post sendes når invitasjonen avvises (invitasjonen lages før utsendingen, og transaksjonen rulles tilbake).
- `invite.accept`: `member_limit` vises på innloggingssiden som egen melding (skal i praksis ikke skje, se 2.3).

## 5. Grensesnitt

**Ny app (`web/`):** `services/errors.ts` CH013 → `member_limit`; meldinger på norsk og engelsk:
- «Menigheten har nådd grensen på 10 brukere (aktive medlemmer og ventende invitasjoner). Fjern en bruker eller trekk tilbake en invitasjon før du inviterer flere.»
- Admin → Brukere og Invitasjoner viser «7 av 10 brukere (inkl. 2 ventende invitasjoner)»; «Ny invitasjon» og «Aktiver» er sperret med forklaring når grensen er nådd (serveren avgjør uansett).
- Stab: Menigheter → menighet → Innstillinger: «Brukergrense» med begrunnelse.

**Dagens app (`media-lab/`):** samme melding og teller i `connecthub-admin` (`members.js`, `sections.jsx`) og på innloggingssiden for invitasjoner. Nødvendig fordi dagens admin brukes parallelt ved myk lansering.

## 6. Tester

| Nivå | Hva |
|---|---|
| Database (`supabase/tests/rls_test.sql`, PGlite + connecthub-dev, alt rulles tilbake) | 10 aktive → invitasjon nr. 11 avvist (CH013); 9 aktive + 1 ventende → nr. 11 avvist; utløpt og tilbakekalt invitasjon teller ikke; to invitasjoner til samme adresse teller én; godta invitasjon ved 10/10 → lov, antallet fortsatt 10; deaktivert teller ikke, men reaktivering ved 10/10 avvist; fjerne en bruker frigjør plass; menighet med 12 fra før beholder alle, men nr. 13 avvises og godta en eldre ventende invitasjon er lov; `add_membership` og `approve_account_request` ved grensen avvist, ny menighet lov; `set_member_limit`: Admin/User 42501, stab uten MFA avvist, stab med MFA + begrunnelse → ny grense og loggrad; direkte `UPDATE memberships` via API avvist ved grensen |
| Samtidighet (ekte, to databaseøkter mot connecthub-dev) | Som testen for CH001: en testmenighet med 9; økt 1 inviterer nr. 10 og holder transaksjonen; økt 2 inviterer en annen nr. 10 og må vente på låsen; økt 1 committer → økt 2 får CH013. Variant: begge ruller tilbake. Krever en egen testmenighet i dev (se 7) og databasepassordet i terminalen |
| Server (`npm test` i media-lab) | `http.js` CH013 → 409 `member_limit`; `invite.create` sender ikke e-post ved avvisning (falsk e-post) |
| Ny app (Vitest + Playwright) | feilmeldingen, telleren, sperrede knapper; falsk server |
| Dagens app (`npm test`) | `members.js`: telleren og meldingen |
| Mot connecthub-dev (e2e-dev, bare lesing) | `member_usage` for egen menighet; Admin kan ikke kalle `set_member_limit` |

## 7. Menigheter som allerede har over 10

1. Før migreringen: én lesende spørring i dev (og, med godkjenning, i produksjonen) som lister menigheter med `member_count > 10` – så vi vet hvem som berøres. Ingen endring.
2. Migreringen endrer ingen medlemskap eller invitasjoner, og triggeren slår bare til ved nye tillegg.
3. Testes i `rls_test.sql` med en menighet med 12 (rulles tilbake), og ved behov i dev med testmenigheten.

**Testdata i dev (krever din godkjenning):** én testmenighet «CH-test Grense» med 9 syntetiske medlemmer (`ch-test-grense-1…9@example.com`, ingen innlogging trengs) for samtidighetstesten. Kan fjernes etterpå.

## 8. Rekkefølge og godkjenninger

| Steg | Hva | Godkjenning |
|---|---|---|
| 1 | Migrering `20261018100000_member_limit.sql` + tester, kjøres i PGlite lokalt | – |
| 2 | `supabase db push --dry-run` mot connecthub-dev, så `db push` | **Ja** (endrer dev-databasen) |
| 3 | `rls_test.sql` i dev, testmenighet + samtidighetstest | **Ja** (testdata i dev) |
| 4 | Server, ny app, dagens app; full kontroll; e2e-dev | – |
| 5 | Produksjon: lesende telling av menigheter over 10, sikkerhetskopi, `migration list`, `db push --dry-run`, `db push` – **før** koden publiseres (gammel kode tåler migreringen: den får bare en ny feil ved grensen) | **Ja**, hvert steg |

**Tilbakeføring:** en ny migrering som fjerner de to triggerne og funksjonene; kolonnen `member_limit` kan bli stående. Ingen data går tapt.

**Omfang:** migrering og databasetester ca. ½ dag; server og begge grensesnittene ca. ½ dag; samtidighetstest og dev-kontroll når nøkler og godkjenninger er på plass.
