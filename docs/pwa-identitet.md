# PWA-identitet: dagens app og den nye appen

Status 2026-10-17: **besluttet – A med omdirigering.** Den nye appen har egen identitet (`id`/`start_url`/`scope` = `/app/`). Ved lanseringen sendes `/`, `/home`, `/media-lab.dc.html` og de andre korte adressene og gamle sidene videre (307) til den nye appen (`media-lab/build/routes.js`, `vercel.json`), så en allerede installert app åpner den nye appen i det gamle vinduet. Dagens app har ingen service worker som kan holde igjen gamle sider. Ikke publisert ennå.

## Manifestene

| Felt | Dagens app (`media-lab/public/manifest.webmanifest`) | Ny app (`web/public/manifest.webmanifest`) |
|---|---|---|
| Adresse | `/manifest.webmanifest` | `/app/manifest.webmanifest` |
| `id` | `/media-lab.dc.html` | `/app/` |
| `start_url` | `/media-lab.dc.html` | `/app/` |
| `scope` | `/` | `/app/` |
| `name` / `short_name` | Media Lab / Media Lab | Media Lab / Media Lab |
| `display` | `standalone` | `standalone` |
| Ikoner | `/images/app-icon-192.png`, `-512.png`, `-maskable-512.png` | Samme filer |
| Farger | `#000000` / `#000000` | Samme |

Ruting i dag (`media-lab/vercel.json`): `/media-lab.dc.html` sendes videre til `/home` (midlertidig omdirigering), og
`/home` vises med `/media-lab.dc.html`. Den installerte appen åpner altså `/media-lab.dc.html` → `/home`.

## Hvordan identiteten bestemmes

Nettleseren kjenner en installert web-app på `id`, løst mot opprinnelsen (`https://<domene>/media-lab.dc.html` i dag).
Uten `id` brukes `start_url`. To manifest med ulik `id` er to ulike apper, selv med samme navn og ikoner.

## Hva som skjer med eksisterende installasjoner (med manifestet slik det er nå)

1. **Så lenge dagens app ligger ute:** Ingen endring. Den installerte appen åpner `/media-lab.dc.html` → `/home` som før.
   Omfanget er `/`, så sider under `/app/` åpnes også inne i det installerte vinduet hvis man navigerer dit.
   Installasjonskortet i den nye appen vises ikke der (det skjules når appen kjører som installert).
2. **Den nye appen kan installeres i tillegg**, som en egen app («Media Lab», samme ikon). En bruker kan da få to like
   ikoner. Det er den største ulempen med dagens valg.
3. **Når dagens app tas ned:** Den gamle installasjonen åpner fortsatt `/media-lab.dc.html`. Uten en omdirigering dit
   får brukeren en feilside. Med en omdirigering `/media-lab.dc.html` → `/app/` åpnes den nye appen i det gamle vinduet
   (innenfor omfanget `/`). Navn og ikon er de samme, så det merkes ikke.
4. **iPhone/iPad (Legg til på Hjem-skjerm):** Safari lagrer adressen ved installasjon og bruker ikke `id`. Samme regel
   som punkt 3: det som betyr noe, er at `/media-lab.dc.html` (og `/home`) fortsatt leder et sted.

## Alternativer

| | Hva | Fordeler | Ulemper |
|---|---|---|---|
| **A** (slik det er nå) | Egen identitet `/app/` | Ingen påvirkning på dagens installasjoner før dagens app tas ned; enkelt å rulle tilbake | Mulig to like ikoner i overgangen; gamle installasjoner må omdirigeres når dagens app fjernes |
| **B** | Samme `id` som i dag (`/media-lab.dc.html`), `start_url: /app/`, `scope: /` | Én app; nettleseren kan oppdatere eksisterende installasjoner til ny startadresse | Omfanget må være `/` (dekker også dagens sider); oppdatering av `start_url` for installerte apper avhenger av nettleser og må prøves i Chrome/Edge/Android før det stoles på; vanskeligere å rulle tilbake |
| **C** | Ny app på roten (`/`) når dagens app fjernes, med dagens `id` | Ren overgang, én app, samme adresser | Krever at hele publiseringen flyttes samtidig (Vercel-ruting, CSP, mellomvare) |

## Anbefaling

Behold **A** mens begge appene ligger ute. Når dagens app skal tas ned, velg **C**, eller A med en fast omdirigering
`/media-lab.dc.html` og `/home` → `/app/`. **B** bør bare velges etter en prøve i Preview med en installert app i
Chrome, Edge og Android, fordi oppførselen ved oppdatering av installerte apper ikke er kontrollert her.

## Ikke kontrollert

- Hvordan Chrome, Edge og Android faktisk oppdaterer en installert app når `start_url` eller `scope` endres (gjelder B).
- Installasjon av den nye appen i en ekte nettleser (bare testet med en simulert installasjonshendelse, se PLT-07).
