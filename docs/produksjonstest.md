# Produksjonstest (innloggede arbeidsflyter)

Status 2026-10-20: skriptet er prøvd mot connecthub-dev (`node e2e-dev/run-dev.mjs --only=prodtest`: 9/9 bestått).
**Ikke kjørt mot produksjonen**; ingen testressurser finnes der. Hvert steg som skriver eller sender e-post krever eierens
godkjenning av det konkrete steget.

## Filer

- `web/e2e-prod/run-prod.mjs` – plan og kontroller (standard, ingen nettleser), eller kjøring med `--run=… --ja-produksjon`.
- `web/e2e-prod/policy.ts` – skrivesperre for hver forespørsel nettleseren gjør (enhetstestet i CI: `policy.test.ts`).
- `web/e2e-prod/guard.ts` – sperren rundt hver nettleserkontekst, identitetskontroll, innlogging.
- `web/e2e-prod/1-read … 5-email.spec.ts` – stegene i fast rekkefølge; stopper ved første feil.

## Sikkerhet

- Låst til `https://media-lab-react-vyef.vercel.app` og prosjekt `cmuienhheklcgtfmpvbe`; stopper hvis produksjonsbygget
  peker et annet sted eller ikke har en publiseringsnøkkel.
- Ingen service-nøkkel, Supabase-CLI eller databasetilkobling: bare testkontoenes egne økter (RLS gjelder).
- Kontoer må ha «e2e» i adressen, testmenigheten må hete «E2E …». `whoami` kontrolleres før noe skrives: Bruker bare
  medlem av testmenigheten, Admin bare Admin der, stab er Developer/Moderator og ikke Admin i ekte menigheter.
- Skrivesperren: lesing går gjennom; alt ukjent stoppes. Admin-tilgang bare i testmenigheten og bare for testkontoenes
  forespørsler (id-er læres fra svarene). Andre Supabase-prosjekter og andre auth-kall enn innlogging/oppfrisking/utlogging
  stoppes. E-post stoppes, unntatt én godkjent `mail.test` til godkjent mottaker. `church.purge` og `privacy.delete_me`
  slås aldri på av skriptet. Steg 1 har en sperretest (tre forbudte skrivinger må stoppes i nettleseren).
- Innlogging og MFA testes ikke. Stabsøkten lager eieren selv (`--save-staff-session=<fil utenfor repoet>`); slett filen etterpå.

## Steg

| Steg | Produksjonsskriving | Innhold |
|---|---|---|
| read | nei (bare innlogging) | identitet, sperretest, alle sider og admin-seksjoner PC/mobil, serverkontroller som leser |
| tools | nei (lagres i nettleseren) | Loop Studio «+ Bilde»/lagring/gjenåpning, Mockups last ned/kopier/Dine medier, Photo Design bytt bilde/tekst/lagre/åpne |
| access | **ja** | Admin-tilgang: avslag, tilbaketrekking, godkjenning 1 dag, fjerning (forespørsler, rolle, revisjonslogg, varsler; ingen e-post) |
| cleanup | **ja** | fjerner rester av ventende/aktiv Admin-tilgang for stabskontoen |
| email | **én e-post** | «Send test til meg» til stabskontoens adresse |

## Må opprettes av eieren

1. Testmenighet «E2E Testmenighet» (`ML_E2E_CHURCH_ID`, `ML_E2E_CHURCH_NAME`).
2. Testkontoer med «e2e» i adressen: Admin og Bruker i testmenigheten; stab (Developer/Moderator, MFA). Passord bare i terminalen.
3. Stabsøkten (`ML_E2E_STAFF_STORAGE`).

## Godkjenninger

G1 testmenighet · G2 testkontoer · G3 `read,tools` · G4 `access,cleanup` (`ML_E2E_APPROVED_STEPS=access`) ·
G5 `email` (`ML_E2E_EMAIL_APPROVED=JA`, `ML_E2E_EMAIL_TO`) · G6 sletting av testmenighet/testkontoer (egen, manuell handling).

## Opprydding

Etter G4 har ingen testkonto Admin-tilgang (cleanup kontrollerer). Historikk (forespørsler, fjernet rolle, revisjonslogg,
varsler) blir stående i testmenigheten. Helt fjernet med G6: slett testmenigheten i ConnectHub, «Slett kontoen min» for
hver testkonto, slett stabsøktfilen. Ekte forespørsler (f.eks. 2026-10-19 kl. 23:49) kan ikke røres av sperren.
