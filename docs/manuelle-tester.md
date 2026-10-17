# Det som krever deg – korte steg og forventet resultat

Alt annet er automatisert (se `docs/testlogg.md`). Ingen av punktene under endrer produksjonen.

## 1. Photo Design «hvitt bilde» – bare bildet ditt trengs

Du trenger ikke teste selv. Legg bildet (eller bildene) som ble hvite i en mappe på PC-en, f.eks. `F:\testbilder\`, og gi meg stien. Jeg kjører da den innloggede testen mot connecthub-dev med akkurat det bildet (`ML_DEV_IMAGE`). Bildet blir bare i testens midlertidige nettleser og lastes ikke opp.

Hvis du heller vil teste selv (forhåndsvisningen eller lokalt):

| Steg | Forventet |
|---|---|
| 1. Photo Design → mal «Bilde med tittel» (eller den du brukte) | Redigeringsvisningen åpnes |
| 2. Legg inn bildet på samme måte som da det ble hvitt (knapp, dra-og-slipp eller lim inn) | Bildet vises med farger, ikke hvitt |
| 3. Hvis hvitt: noter format, omtrent størrelse, hvordan det ble lagt inn, nettleser, og ta skjermbilde | Send meg dette – da kan feilen gjenskapes |

## 2. Prosjektmappe i Motion design (MD-17) – Chrome eller Edge på PC, ca. 5 min

Selve mappedialogen kan ikke styres av en automatisk test. Alt etter valget er testet automatisk.

| Steg | Forventet |
|---|---|
| 1. Lag en tom mappe, f.eks. `Dokumenter\ML-test` | – |
| 2. Motion design → «Nytt prosjekt» → velg format og mal | Redigering åpnes |
| 3. Legg til et kort videoklipp | Klippet ligger i tidslinjen |
| 4. Trykk «Prosjektmappe» øverst → «Kopier til prosjektmappe …» → velg mappen fra steg 1 → tillat tilgang | Ingen feilmelding; mappen i Utforsker inneholder prosjektfilene og videoen |
| 5. Lukk fanen, åpne Motion design igjen og prosjektet | Prosjektet åpnes; ber nettleseren om tilgang, trykk «Gi tilgang til mappen» – videoen spilles |
| 6. (Valgfritt) Startsiden → «Åpne prosjektmappe» → velg samme mappe | Samme prosjekt åpnes |

Feil å se etter: dialogen åpnes ikke, video mangler etter ny åpning, eller feilmelding.

## 3. Norsk tale i AI-undertekster (MD-11) – ca. 5 min

Engelsk tale er testet automatisk (5 av 5 ord riktig). Maskinen har ingen norsk stemme, så norsk må høres på.

| Steg | Forventet |
|---|---|
| 1. Ta opp 20–30 sekunder norsk tale med mobilen (eller bruk et eksisterende klipp) | – |
| 2. Motion design → nytt prosjekt → legg inn klippet | Klippet i tidslinjen |
| 3. Fanen «Undertekst» → «Norsk» → modell «Rask» → «Lag undertekster med AI» | Første gang lastes modellen (~80 MB). Deretter «… undertekster er laget» |
| 4. Les tekstene og spill av | Teksten er forståelig og følger talen i tid |
| 5. (Valgfritt) Samme med «Nøyaktig» | Bedre norsk, tar lengre tid (~250 MB første gang) |

Send meg gjerne en vurdering («godt nok», «mange feil», «tok X minutter»).

## 4. Vercel-forhåndsvisningen – kritiske punkter først

Forhåndsvisningen er beskyttet med Vercel-innlogging. Den automatiske kontrollen trenger derfor en hemmelighet som bare du kan lage.

**A. Automatisk (anbefalt, 2 minutter for deg):**

1. Vercel → prosjektet `media-lab-react-vyef` → **Settings → Deployment Protection → Protection Bypass for Automation** → lag en hemmelighet (ikke del den med meg).
2. I din egen terminal (PowerShell):
   ```
   $env:VERCEL_AUTOMATION_BYPASS_SECRET = '<hemmeligheten>'
   cd F:\ReactProjects\MediaLabReact\media-lab
   npm run check:preview -- https://media-lab-react-vyef-hb425ecr1-media-lab3.vercel.app --commit 7798aa5
   ```
3. Forventet: «Alt i orden». Skriptet kontrollerer riktig commit, `/app/` og `/login`, alle 24 korte og gamle adresser (307 til riktig side), sikkerhetshoder og CSP for forhåndsvisning, hurtigbuffer og manifest, og at `/api` krever innlogging. Lim inn resultattabellen til meg (den inneholder ingen hemmeligheter).

Nyeste forhåndsvisning for grenen finnes i Vercel → Deployments (filter `feature/onepage-rebuild`) eller i GitHub ved commiten.

**B. Manuelt, i nettleseren mens du er innlogget i Vercel (ca. 10 min), viktigste først:**

| # | Kontroll | Forventet |
|---|---|---|
| 1 | Åpne forhåndsvisningen → `/home` | Sendes til `/app/` og innloggingen |
| 2 | Logg inn med **din** konto (dev-prosjektet; MFA hvis du har stab-rolle) | Media Lab-forsiden i den nye appen |
| 3 | Photo Design: åpne en mal, legg inn et bilde, lagre | Bildet vises, «Prosjektet er lagret» |
| 4 | Admin → menighetens innstillinger | Telleren «Brukere i menigheten: X av 10» |
| 5 | `/fellesmappe` | Admin → Filer → Fellesmappe |
| 6 | Logg ut og inn igjen | Virker; ingen feilmeldinger |
| 7 | Mobil (eller smalt vindu): forsiden og ett verktøy | Leselig, ingen vannrett rulling |

Feil: noter adresse, hva du gjorde og skjermbilde.

## 5. Beskyttelse mot lekkede passord (Supabase Auth)

Funksjonen sjekker nye passord mot Have I Been Pwned og avviser kjente lekkede passord. **Den finnes bare på Supabase Pro og høyere.** Er prosjektet på Free, vises den som utilgjengelig. Da er valget å oppgradere (kostnad, din beslutning) eller å akseptere varselet. Passordkravene i appen (lengde og tegn) gjelder uansett.

Aktivere (gjør det først i **connecthub-dev**, deretter produksjonen etter egen vurdering):

1. supabase.com/dashboard → prosjektet (dev: `uatpdmhnwwjgzlxaucsx`, produksjon: `cmuienhheklcgtfmpvbe`).
2. **Authentication → Sign In / Providers → Email** (i noen versjoner: **Authentication → Attack Protection** eller **Passwords**).
3. Slå på **«Prevent use of leaked passwords»** og trykk **Save**.

Verifisere:

- **Dashboard:** Advisors → Security Advisor → «Refresh». Varselet `auth_leaked_password_protection` («Leaked Password Protection Disabled») skal være borte.
- **Dev (jeg kan gjøre det etterpå):** `npx supabase@latest db advisors --linked --project-ref uatpdmhnwwjgzlxaucsx` – varselet skal mangle. Jeg kan også prøve å sette et kjent lekket passord på en syntetisk testkonto i dev. Det skal avvises som svakt passord, og kontoen får uansett et nytt tilfeldig passord ved neste testkjøring.
- **Produksjonen:** sjekk Security Advisor i dashbordet (jeg kobler ikke til produksjonen uten egen godkjenning).

Kilde: [Supabase – Password security](https://supabase.com/docs/guides/auth/password-security).
