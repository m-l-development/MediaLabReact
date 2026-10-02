# Plan: «Glemt passord», forespørsler om konto, e-post og Mail-fanen, kontovelger og passordbytte

Status: **forslag til godkjenning. Ingenting er implementert.** Alt arbeid skal gjøres i dev på `connecthub`. `main`, produksjonsdatabasen og produksjonsinnstillingene røres ikke.

Rekkefølgen følger prioriteringen din (kapittel 1–6). Kapittel 7 har det tekniske felles grunnlaget, kapittel 8 testene, og kapittel 9 beslutningene som må tas før start.

---

## 0. Hva som finnes i dag (undersøkt)

| Område | I dag |
|---|---|
| **Innlogging** | `src/pages/login/LoginPage.jsx` har en visning per tilstand: innlogging, MFA, oppsett av MFA, «Glemt passord», «Velg passord», invitasjonsfeil og «ikke koblet». Lenker fra e-post håndteres av `auth.completeFromUrl` (PKCE-kode, `token_hash` eller tokens i fragmentet). |
| **Autentisering** | Supabase Auth via `src/services/adapters/supabase/` (PKCE, økten i `localStorage` `ch.auth`). Passordkrav: minst 10 tegn, med bokstaver og tall (klient og Auth). |
| **Auth-innstillinger** | `secure_password_change = true` (passordbytte krever fersk innlogging). MFA (TOTP) er påkrevd for Developer og Moderator. |
| **E-post** | Supabase Auth sender alle e-poster. **Produksjon:** egen Gmail-SMTP, satt i Supabase. **Dev:** Supabases innebygde avsender, som bare sender til prosjektets teammedlemmer og har svært lav grense. |
| **E-postmaler** | Norske maler ligger i `supabase/templates/`, men er ikke i bruk. Dev tillater ikke maler uten egen SMTP, og produksjonen har ikke fått dem. |
| **Invitasjoner** | `invite.create` → `create_invitation` (rolle, menighet, MFA, én menighet om gangen, høyst én fast Admin) → Supabase `/auth/v1/invite` sender e-posten → `accept_invitation`. Lokalt kan e-posten fanges i fil (`CH_TEST_MAILBOX`). |
| **Rollemodell** | `app.may_invite`: User og Admin krever menighet. Developer og Moderator har ingen menighet og inviteres bare av Developer. |
| **Mønster vi kan gjenbruke** | Tilbakemeldingssystemet: tabeller med RLS uten policyer, funksjoner bare for stab med MFA, hendelseshistorikk, rensing av hemmeligheter og en egen innboks i admin. |
| **Server** | Alle API-handlinger krever innlogging (Bearer). Kjører i Node 22 på Vercel, så SMTP er mulig. Det finnes ingen handlinger før innlogging i dag. |
| **Sikkerhetshoder** | `Referrer-Policy: strict-origin-when-cross-origin`, så tokens i adressen lekker ikke videre. CSP uten eksterne skript. |

---

## 1. «Glemt passord»: årsak og retting (prioritet 1)

### 1.1 Funn
Gjenskapt i dev, se `docs/testlogg.md`.

**Årsak 1 (hovedfeilen): PKCE-lenken virker bare i nettleseren som ba om den.**
- «Glemt passord» bruker `resetPasswordForEmail` med PKCE. En hemmelig kode-verifikator lagres i *den* nettleseren (`ch.auth-code-verifier`).
- Åpnes lenken et annet sted, finnes ikke verifikatoren. Det gjelder for eksempel e-post på mobilen, Gmail-appens innebygde nettleser eller en annen PC.
- Supabase gir da feilkoden `pkce_code_verifier_not_found`. Den har ingen norsk tekst hos oss.
- Resultatet er nøyaktig det du ser: «Noe gikk galt. Prøv igjen.», innloggingssiden og ikke noe passordskjema.
- **Gjenskapt:** `login.dc.html?code=…&flow=recovery` i en ren nettleser gir akkurat dette.

**Årsak 2 (rammer deg som Developer, selv når årsak 1 er rettet): MFA.**
- Når kontoen har totrinnsbekreftelse, krever Supabase en økt med MFA (`aal2`) for å endre passordet.
- Etter en tilbakestillingslenke har økten bare `aal1`. Lagringen vil da feile med `insufficient_aal`, som heller ikke har noen tekst i dag.
- Flyten må derfor be om koden fra autentiseringsappen før det nye passordet lagres.

**Årsak 3 (svakhet): utløpte, brukte og ugyldige lenker.**
- Disse gir riktig melding, men brukeren havner på innloggingssiden uten en direkte måte å be om ny lenke.

**Mulig årsak 4:** e-postskannere (Outlook/Gmail) kan åpne lenken før brukeren og bruke den opp. Supabases standardlenke brukes opp ved første åpning.

### 1.2 Løsning
1. **Lenke som virker i alle nettlesere.** Tilbakestillingslenken peker til vår side med `token_hash`:

   ```
   /login.dc.html?flow=recovery&token_hash=…&type=recovery
   ```

   - `completeFromUrl` støtter allerede dette (`verifyOtp`).
   - Ingen verifikator trengs, så lenken virker på mobil og i e-postapper.
   - Lenken lages av serveren, ikke i nettleseren (se 1.3).
2. **Bruker må trykke før lenken brukes opp.** Siden viser først «Fortsett for å velge nytt passord», og lenken brukes først når brukeren trykker. Da kan ikke e-postskannere bruke den opp.
3. **Egen side for nytt passord** (visningen `?flow=recovery`, med egen overskrift):
   - Hvis kontoen har MFA: kode fra autentiseringsappen først (`aal2`).
   - Feltene «Nytt passord» og «Bekreft nytt passord», hver med vis/skjul-knapp inne i feltet.
   - Krav vises og kontrolleres løpende: lengde, bokstaver og tall, og at feltene er like.
   - Knappen «Lagre nytt passord».
   - Ved suksess: «Passordet er endret». Alle økter logges ut, og «Til innlogging» åpner innloggingen med e-posten fylt ut.
4. **Feilsider med vei videre.** Utløpt, brukt, ugyldig eller manipulert lenke gir «Lenken virker ikke lenger», med forklaring og skjemaet «Send ny lenke» ferdig utfylt. Nettverks- og tidsavbrudd gir «Prøv igjen» uten at lenken brukes opp. Alle kjente Supabase-koder får norsk og engelsk tekst, og ingen tekniske detaljer vises.
5. **Ingen lekkasje.**
   - Adressen renskes (`history.replaceState`) med en gang lenken er lest.
   - Lenker og passord skrives aldri til logg, konsoll, tilbakemeldingssystemets feilliste (`feedback-errors.js` får et filter) eller revisjonslogg.
   - Svaret er alltid det samme, så ingen kan finne ut om en e-postadresse finnes.

### 1.3 Hvordan lenken lages: to alternativer (beslutning B1)
- **A (anbefalt, felles med kapittel 3): ConnectHub sender e-posten selv.**
  - Ny serverhandling `auth.recover`, tilgjengelig før innlogging og med strenge grenser (7.3).
  - Den henter en engangslenke fra Supabase med servernøkkelen (`admin/generate_link`, type `recovery`). Supabase sender da ingen e-post.
  - Serveren bygger vår `token_hash`-lenke og sender e-posten med malen «Nytt passord» fra Mail-fanen.
  - Krever SMTP-oppsett på serveren (7.2).
- **B (rask midlertidig retting i produksjon): endre Supabases e-postmal for «Reset password».**
  - Lenken settes til `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`.
  - Krever ingen kode utover punkt 3–5, men er en endring i produksjonsinnstillingene (egen godkjenning). Den kan ikke testes i dev, der Supabase ikke tillater egne maler uten SMTP.
  - Erstattes av A senere.

**Ingen databaseendringer** for kapittel 1, bortsett fra én valgfri loggrad (`account.password_reset`) via eksisterende revisjonslogg.

---

## 2. Forespørsel om brukerkonto (prioritet 2)

### 2.1 Innloggingssiden
- **Knapp:** under innloggingsskjemaet kommer knappen **«Send forespørsel om opprettelse av bruker»**. Den erstatter dagens tekst «Kontoer opprettes bare ved invitasjon».
- **Panel:** trykk åpner et panel under innloggingsfeltet. Kortet vokser nedover, og designet er det samme.
- **Felt:**
  - Navn: 2–100 tegn
  - Telefonnummer: 8–20 tegn, tall, `+`, mellomrom
  - E-postadresse: samme kontroll som invitasjoner
  - Menighet / annet: 2–200 tegn
  - Et skjult felle-felt for roboter
- **Send:** knappen «Send forespørsel». Etterpå vises «Takk! Forespørselen er mottatt …». Teksten er den samme uansett om adressen finnes fra før.
- **Lukk:** knappen «Lukk» skjuler panelet.
- Fungerer på PC og mobil, med samme stil som dagens innloggingskort.

### 2.2 Lagring og flyt
1. Skjemaet går til den nye serverhandlingen `request.submit`, som er tilgjengelig før innlogging.
2. Serveren:
   - kontrollerer feltene
   - sjekker felle-feltet og at skjemaet ikke er sendt inn urealistisk raskt (signert tidsstempel)
   - sjekker grensene (7.3)
   - kaller databasefunksjonen `submit_account_request`, som bare serveren har tilgang til
3. Databasen:
   - Lagrer forespørselen med status **Ny** og en hendelse «Mottatt».
   - Varsler Developer og Moderator i ConnectHub, i kontomenyens varselliste (`notifications`, ny type `request`).
   - **Duplikat:** finnes det en åpen forespørsel med samme e-post, lages det ingen ny rad. Den eksisterende får hendelsen «Sendt inn på nytt» og et teller-felt.
   - Ingen konto opprettes.
4. **E-post** (kapittel 3): bekreftelse til avsenderen og varsel til stabens adresser. Forespørselen er lagret *før* e-post sendes, så den går aldri tapt.

### 2.3 Innboksen «Forespørsler» (bare Developer og Moderator, med MFA)
- **Plassering:** ny seksjon i ConnectHub Admin (`#/foresporsler`), med tall for nye. Den bygger på samme mønster som Tilbakemeldinger.
- **Liste:**
  - kolonnene navn, e-post, telefon, menighet/annet, mottatt og status
  - filtrene Ny, Under behandling, Godkjent, Avslått og Alle
  - søk
  - merke for duplikat, og for at e-posten allerede har en konto
- **Detalj:** alle feltene og historikken (hvem gjorde hva, og når), med interne notater.
- **Handlinger:**
  - Sett «Under behandling»
  - Avslå: begrunnelse kreves, og avsenderen får en nøytral e-post bare hvis du velger det
  - Notat
  - **Opprett bruker** (2.4)
  - Slett nå: for spam, med bekreftelse
- **Tilgang håndheves i databasen.**
  - Tabellene har RLS uten policyer og ingen tilgang for `anon` eller `authenticated`.
  - Alt går gjennom funksjoner som krever `app.is_staff()` (Developer eller Moderator med MFA).
  - Serverhandlingen for innsending bruker en servernøkkel og kan bare *legge til*, aldri lese.
  - Admin og User får 403 eller tomt svar fra alle veier: side, API og direkte databasekall.

### 2.4 «Opprett bruker» fra en forespørsel
Dialogen har tre valg. Alt skjer i **én databasetransaksjon** (`approve_account_request`): menighet, invitasjon og status lages samlet, eller ingenting.

| Valg | Hva skjer | Rolle |
|---|---|---|
| **A. Ny menighet** | Ny menighet med navnet du skriver (forslag: «Menighet / annet»), og invitasjon til den | Admin (den faste) eller User |
| **B. Eksisterende menighet** | Velg fra lista, invitasjon til den | User, eller Admin hvis menigheten ikke har en fast Admin |
| **C. Uten menighet** | Invitasjon uten menighet | Bare Developer eller Moderator, og bare når Developer gjør det (dagens modell). Se beslutning B4 |

**Detaljer:**
- **Konto og passord:** brukerkontoen opprettes først når personen åpner den sikre invitasjonslenken og velger sitt eget passord, slik som i dag. Det gir ingen halvferdige kontoer.
- **Gjenbruk:** eksisterende regler gjelder uendret (`create_invitation`, `may_invite`, én menighet om gangen og én fast Admin).
- **Velkomstmail:** serveren sender den etter transaksjonen. Feiler e-posten, er invitasjonen likevel laget, forespørselen står som «Godkjent – e-post ikke sendt», og knappen «Send invitasjon på nytt» bruker eksisterende `invite.resend`.
- **E-post som allerede finnes:** dialogen viser «Har allerede konto (navn, menighet)». Det tilbys ingen ny konto, bare en lenke til brukerens side. Der kan du legge brukeren til i en menighet med eksisterende funksjoner.
- **Logg:** `requests.submit`, `requests.status`, `requests.note`, `requests.reject`, `requests.approve` (med valg, rolle og menighet), `requests.delete` og `requests.notify_failed`. Ingen telefonnumre eller e-postadresser i `meta`; de ligger bare i forespørselen.

### 2.5 Personvern og oppbevaring
- Personopplysningene ligger bare i `account_requests`, som har RLS og bare kan leses av stab via funksjoner.
- Teksten renses for kode og kontrolltegn. Hemmeligheter fanges av det eksisterende rensefilteret.
- **Oppbevaring (beslutning B6):** avslåtte og spam slettes etter 30 dager. Godkjente anonymiseres etter 90 dager: navn, telefon og e-post fjernes, mens historikken beholdes.
  - Sletting skjer med funksjonen `app.purge_account_requests()`, kjørt manuelt eller planlagt, samme mønster som oppbevaringstiden for loggen.
- Avsenderens IP lagres bare som hash med en daglig salt, for grensene, og slettes etter 7 dager.

---

## 3. E-postvarsling og Mail-fanen (prioritet 3)

### 3.1 E-postsystemet (felles for 1, 2 og 3)
**ConnectHub sender e-postene selv** via SMTP fra serveren. Det er den samme Gmail-kontoen som produksjonen bruker i Supabase i dag.

**Bare servermiljøet kjenner tilgangen:** `CONNECTHUB_SMTP_HOST/PORT/USER/PASSWORD` og `CONNECTHUB_MAIL_FROM_NAME`.
- Du legger inn verdiene selv i Vercel (beslutning B2). Jeg ser dem aldri, og de står aldri i kode, logg eller rapport.
- `build/env-guard.js` utvides, så bygget stopper hvis de havner i nettleserkoden.

**Ny modul `server/lib/mail.js`** (leverandørnøytral), med adapteren `server/adapters/smtp.js` (nodemailer, MIT, bare på serveren).
- I tester og lokalt fanges e-postene i fil, som i dag (`CH_TEST_MAILBOX`).

**E-poster ConnectHub sender selv:**

| Mal | Når | Lenke |
|---|---|---|
| **Velkomst** | Invitasjon (ny bruker) | Supabase-engangslenke via `generate_link` (type `invite`, eller `magiclink` hvis kontoen finnes) → vår side med `token_hash` |
| **Nytt passord** | «Glemt passord» | `generate_link` (`recovery`) → `token_hash` |
| **Forespørsel mottatt** | Til avsender | Ingen |
| **Ny forespørsel** | Til stab | Lenke til innboksen (ingen hemmelighet) |
| **Forespørsel avslått** (valgfri) | Til avsender | Ingen |

Supabase sender fortsatt bare de sjeldne e-postene: bytte av e-post og reautentisering.

**Utsendingslogg `email_outbox`:**
- Én rad per e-post: type, mottaker, tilknyttet forespørsel eller invitasjon, status (`pending`/`sent`/`failed`), forsøk og feilkode.
- **Aldri lenker eller tokens.** Ved nytt forsøk lages en ny lenke.
- Feil vises i innboksen med «Send på nytt».
- Admin-oversikten får et varsel ved mislykkede utsendinger siste døgn.
- Mottakeradresser slettes fra loggen etter 30 dager.

### 3.2 Varsel ved nye forespørsler
- **Mottakere:** avsenderadressen (Gmail-kontoen ConnectHub bruker) og opptil 3 ekstra adresser. Ekstraadressene settes i Mail-fanen under «Varslingsadresser».
- **Innhold:** navn, menighet/annet og mottakstidspunkt, med lenken «Åpne i ConnectHub». Telefon og e-post står ikke i e-posten; personopplysningene vises bare i ConnectHub (beslutning B7).
- **Begrensning:** høyst ett varsel per 10 minutter. Flere forespørsler samles i ett varsel («3 nye forespørsler»), så innboksen ikke fylles ved spam.

### 3.3 Mail-fanen (bare Developer og Moderator, med MFA)
**Ny seksjon `#/mail`** med tre deler:

**1. Maler:** de fem malene over.

**Editoren er blokkbasert,** ikke fri HTML. Det hindrer injisering av HTML og skript.
- **Blokktyper:**
  - Overskrift
  - Avsnitt: tekst med **fet**, *kursiv* og linjeskift
  - **Lenkeboks:** fast plassholder. Bare knappeteksten kan endres, aldri adressen. Påkrevd i Velkomst og Nytt passord.
  - Logo
  - Skillelinje
  - Liten tekst
- **Flytting:** blokkene dras opp og ned. På mobil og med tastatur brukes pil-knapper.
- **Flettefelt:** bare fra en fast liste, `{navn}`, `{menighet}` og `{rolle}`, og de settes inn som ren tekst.
- **Forhåndsvisning:** ved siden av editoren på PC og som egen fane på mobil. Samme gjengivelse som serveren bruker, i en sandkasset `iframe`, med en eksempellenke og eksempelnavn.
- **Lagre og standard:**
  - «Lagre» gjelder bare e-poster som sendes etterpå.
  - «Gjenopprett standard» gir tilbake standardmalen fra koden.
  - «Send test til meg» sender til egen adresse.

**2. Logo:**
- Last opp eller bytt: PNG eller JPG, høyst 512 kB og 1000×1000 piksler. Kontrolleres på bytene, som andre bilder.
- Lagres i den private bøtta (`mail/logo-<id>`).
- Legges inn i e-posten som innebygd vedlegg (CID). Den trenger altså ingen offentlig adresse.
- «Bruk standard» gir MediaLab-symbolet fra repoet.

**3. Varslingsadresser:**
- Avsenderadressen vises skrivebeskyttet, fra servermiljøet.
- Ekstra mottakere: opptil 3, kontrollert format.
- Knapp for å sende testvarsel.

**Lagring:**
- `email_templates`: nøkkel, emne, blokker (JSON), versjon og endret av/når.
- `mail_settings`: én rad med ekstra adresser, logo og avsendernavn.
- **Kontrollen skjer i databasefunksjoner**, i tillegg til i gjengivelsen:
  - bare tillatte blokktyper og lengder
  - nøyaktig én lenkeboks der den kreves
  - gyldige adresser

**Logg** med gammel og ny verdi: `mail.template_update`, `mail.template_reset`, `mail.logo_update` og `mail.settings_update`.

### 3.4 Kostnader og begrensninger
- **Gmail-SMTP er gratis.**
  - **Grense:** omtrent 500 mottakere per døgn for vanlig Gmail, og omtrent 2 000 for Google Workspace. Det er langt over behovet.
  - **Pålitelighet:** e-post sendes fra Gmail-adressen, med Googles egen signering, slik at den sjelden havner som spam.
  - **Krav:** et app-passord på Gmail-kontoen, med totrinnsbekreftelse på Google-kontoen.
- **Dev:** dev har ingen SMTP i dag. Enten legges samme eller en egen test-Gmail inn i Vercel Preview (beslutning B2), eller så testes e-post bare lokalt med filfangst.
- **Nye pakker:** bare `nodemailer`, på serveren. Ingen nye CDN-er eller CSP-domener.
- **Andre kostnader:** ingen endring i Supabase-plan eller Vercel-plan.

---

## 4. Kontovelger på innloggingssiden (prioritet 4)
- **Avkrysning:** på innloggingsskjemaet står «Husk denne kontoen på denne enheten». Den er av som standard og lagres etter vellykket innlogging.
- **Lagres lokalt** (`localStorage` `ch.accounts`): bare `{ e-post, navn, initialer, sist brukt }`, for høyst 5 kontoer.
  - Aldri passord, tokens eller rolle.
  - Innloggingsøkten er uendret: Supabase har som før én aktiv økt, og den slettes ved utlogging.
- **Visning:**
  - **Ikoner:** runde ikoner med initialer og navn øverst i kortet.
  - **Valg:** trykk markerer kontoen med tydelig ramme og bakgrunn, fyller inn e-posten (vist som «Logger inn som Navn – e-post») og setter markøren i passordfeltet. Valg av en annen konto flytter markeringen.
  - **Ny konto:** «Bruk en annen konto» tømmer feltet.
  - **Fjern:** × på hvert ikon (med bekreftelse) fjerner kontoen fra enheten.
- **Sikkerhet:**
  - Passordet må alltid skrives inn.
  - Velgeren gir ingen innlogging og ingen tilgang. Alt går gjennom dagens innlogging, MFA og port.
  - Sletting av egen konto fjerner den fra lista på enheten.
  - Teksten forklarer at e-post og navn blir synlige for andre som bruker enheten.
- Fungerer med tastatur, skjermleser og berøring.

## 5. Vis/skjul passord og «Bytt passord» (prioritet 5)

**Felles komponent `PasswordInput`:**
- Knapp inne i feltet med øye-ikon.
- `aria-pressed` og etiketten «Vis passord»/«Skjul passord». Skjult som standard.
- Brukes på innlogging, «Nytt passord» og «Bytt passord».
- Hvert felt har sin egen knapp.

**«Bytt passord»** ligger i kontomenyen under Konto, for Developer, Moderator og Admin. Beslutning B5 avgjør om den også skal gjelde User.
- **Felt:** «Gammelt passord», «Nytt passord» og «Bekreft nytt passord», med vis/skjul i hvert.
- **Kontroll:**
  1. Lengde og bokstaver/tall, og at de to nye feltene er like. Dette vises i dialogen før sending.
  2. **Gammelt passord** kontrolleres med en ny innlogging med e-post og gammelt passord. Det oppfyller også Supabases krav om fersk innlogging (`secure_password_change`).
  3. Har kontoen MFA, ber dialogen om koden (`aal2`), slik Supabase krever.
  4. Passordet lagres med eksisterende `updateUser`.
  5. Andre økter logges ut (beslutning B8).
- **Feilmeldinger:** «Det gamle passordet er feil», «Det nye passordet må ha …», «Passordene er ikke like», «Velg et annet passord enn det gamle», «Feil kode» og «For mange forsøk».
- **Bekreftelse:** «Passordet er endret».
- **Logg:** loggraden `account.password_change` uten detaljer. Ingen databaseendring utover den ene loggfunksjonen.

## 6. Tester, kvalitetssikring og regresjon (prioritet 6)
Se kapittel 8.

---

## 7. Teknisk fellesgrunnlag

### 7.1 Databaseendringer (dev først, egen godkjenning for produksjon)
| Migrering | Innhold |
|---|---|
| `…_account_requests.sql` | `account_requests`, `account_request_events` og `anon_rate_limits` (nøkkelhash, vindu, antall). Funksjoner:<br>• `submit_account_request` (bare server)<br>• `account_requests_list` / `_events_for` / `set_account_request_status` / `add_account_request_note` / `reject_account_request` / `delete_account_request` (stab med MFA)<br>• `approve_account_request` (én transaksjon, bruker reglene i `create_invitation`)<br>• `app.purge_account_requests`<br>Ny varseltype `request`. |
| `…_mail.sql` | `email_templates`, `mail_settings` og `email_outbox`. Funksjoner for lesing og lagring (stab med MFA), og for serverens lesing av maler og registrering av utsendinger. |
| `…_password_log.sql` (liten) | `log_password_event('change'/'reset')`: egen loggrad, ingen detaljer. |

**Felles for alle:**
- Alle tabeller har RLS uten policyer, og ingen direkte tilgang for `anon` eller `authenticated`.
- Ingen eksisterende tabeller eller rader endres.
- Testes med RLS i PGlite og i dev.

### 7.2 Server
**Handlinger før innlogging** (eksplisitt liste i `handle()`; alle andre krever innlogging som før):
- `request.submit`
- `auth.recover`
- `request.form_token`: et signert tidsstempel som brukes av sjekken for urealistisk rask innsending

**Handlinger som krever innlogging** (stab med MFA via databasen):
- `request.approve`: transaksjon + velkomstmail
- `request.notify_retry`
- `mail.preview`
- `mail.test`
- `mail.logo`

**Endringer i eksisterende handlinger:**
- `invite.create` og `invite.resend` sender med egen mal når SMTP er satt opp. Ellers brukes Supabase som i dag, så dagens invitasjoner aldri brytes.

**Feilhåndtering:**
- Data lagres alltid før e-post.
- E-postfeil gir aldri 500 til brukeren. De registreres i `email_outbox` og vises i innboksen.

### 7.3 Spam og misbruk
Uten nye eksterne tjenester:
- felle-felt
- sjekk av at skjemaet ikke sendes urealistisk raskt (signert tidsstempel, minst 3 sekunder, høyst 2 timer)
- grenser per IP-hash: 5 forespørsler og 10 «Glemt passord» per time
- grense per e-post: 3 per døgn
- samlet tak: 200 forespørsler per døgn, med varsel til stab ved tak

**Valgfritt (beslutning B3):** Cloudflare Turnstile.
- Gratis, men krever et nytt domene i CSP (`challenges.cloudflare.com`) og en ny hemmelig nøkkel.

### 7.4 Sikkerhet oppsummert
- Ingen hemmeligheter i kildekoden eller nettleseren. Bygget stopper hvis SMTP-variabler havner der.
- Passord sendes aldri i e-post. Brukeren velger det selv via en sikker engangslenke.
- Lenker kan ikke endres i malene, og malene er strukturert JSON som gjengis med escaping.
- Tilgang håndheves i databasen og på serveren, ikke bare i grensesnittet.
- Alt loggføres uten passord, tokens eller lenker.

### 7.5 Avhengigheter og rekkefølge
1. **Steg 1 – «Glemt passord»:**
   - **1a:** visninger, MFA-steg, feilsider og vis/skjul i passordfeltene. Kun klientkode, og kan bli ferdig først.
   - **1b:** lenke som virker i alle nettlesere. Alternativ A krever e-postsystemet (3.1) og SMTP. Alternativ B krever en endring i produksjonsinnstillingene.
2. **Steg 2 – e-postsystem og utsendingslogg** (3.1), med filfangst lokalt og eventuelt SMTP i Preview.
3. **Steg 3 – forespørsler:** skjema, innboks og opprettelse (2), med e-post via steg 2.
4. **Steg 4 – Mail-fanen** (3.3).
5. **Steg 5 – kontovelger** (4).
6. **Steg 6 – «Bytt passord»** (5).
7. **Steg 7 – full test og regresjon** (8).

Anslag: steg 1a og 5–6 er små (timer), steg 2–4 er store (flere økter hver).

---

## 8. Tester (alle i dev, PC 1440 og mobil 390)
- **RLS:**
  - **Forespørsler:** innsending bare via server, stab med MFA kan alt, Admin, User og stab uten MFA avvises, duplikater, grenser, `approve` er én transaksjon for A, B og C, regler for Admin og menighet, eksisterende e-post og oppbevaring.
  - **Mail:** lagring, kontroll av blokker, lenkeboks påkrevd, standard og logg.
  - **Logg:** `log_password_event`.
- **Server:**
  - Handlinger før innlogging har riktige grenser og avviser andre handlinger.
  - E-postfeil gir lagret forespørsel og `failed` i utsendingsloggen.
  - Lenker kommer aldri i svar eller logg.
  - Gjengivelsen escaper HTML og skript.
  - Bygget stopper ved SMTP-variabler i klienten.
- **Nettleser:**
  - **«Glemt passord»:**
    - Gyldig lenke åpnet i *en annen nettleser* enn den som ba om den, med og uten MFA.
    - Utløpt, brukt og manipulert lenke, og nettverksfeil.
    - Krav, ulike passord og vis/skjul.
    - Etter endringen virker innlogging med nytt passord og ikke med gammelt.
  - **Forespørsel:** felt, felle-felt, urealistisk rask innsending, grenser og kvittering.
  - **Innboks:** Developer og Moderator kan; Admin og User får avvisning, også ved direkte adresse og API.
  - **Opprett bruker:** A, B og C, eksisterende e-post og duplikat. Invitasjonslenken virker, og rolle og medlemskap blir riktige.
  - **Mail:** redigere, flytte blokker, forhåndsvise, lagre, standard, logo, testmail og varslingsadresser.
  - **Kontovelger:** flere kontoer, markering, fjerning, ingen tokens eller passord i `localStorage`, og passord alltid påkrevd.
  - **«Bytt passord»:** riktig og feil gammelt passord, MFA, krav og bekreftelse.
- **Regresjon:** alle admin-sider og verktøy for alle roller, invitasjoner, samarbeidsgrupper, filer, tilbakemeldinger og ekstra Admin.
- **E-post** testes med filfangst lokalt. Med SMTP i Preview testes også ekte levering til en test-innboks.

---

## 9. Beslutninger før start
| # | Spørsmål | Forslag |
|---|---|---|
| **B1** | Retting av lenken i «Glemt passord»: A (ConnectHub sender selv) eller B (rask endring av Supabase-malen i produksjon, så A senere)? | **A** for dev nå. **B** i produksjon som rask retting hvis du ikke vil vente, med egen godkjenning. |
| **B2** | SMTP for dev: hvilken Gmail-konto, og godkjenner du at **du** legger inn `CONNECTHUB_SMTP_*` i Vercel Preview (og senere Production)? | Egen test-Gmail for dev, og samme konto som i dag for produksjon. Du legger inn verdiene selv. |
| **B3** | Turnstile mot spam? | Nei i første versjon. Vurder ved misbruk. |
| **B4** | Valg C «uten menighet»: dagens modell tillater bare Developer og Moderator uten menighet. Skal en vanlig bruker kunne opprettes uten menighet (og vente på menighet)? | Behold modellen: C bare for Developer og Moderator, og bare Developer kan gjøre det. |
| **B5** | «Bytt passord» også for User? | Ja, for alle roller. Det er like enkelt og like sikkert. |
| **B6** | Oppbevaring av forespørsler? | Avslått og spam: 30 dager. Godkjent: anonymiseres etter 90 dager. IP-hash: 7 dager. |
| **B7** | Telefon og e-post i varslings-e-posten til stab? | Nei, bare navn og menighet/annet, med lenke til ConnectHub. |
| **B8** | Logge ut andre økter etter passordbytte og tilbakestilling? | Ja. |
| **B9** | Varsle avsenderen ved avslag? | Valgfritt per sak, standard av. |

Ingen produksjonsendringer inngår i planen. Publisering planlegges og godkjennes separat, med migreringsrekkefølge, kontrollpunkter og tilbakeføring som sist.
