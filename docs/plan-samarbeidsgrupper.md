# Plan: samarbeidsgrupper med tre eller flere menigheter

Status: **forslag til godkjenning.** Ingenting er implementert. Alt skal gjøres i dev. Produksjonen, `main` og produksjonsdatabasen røres ikke.

## 1. Mål

Én samarbeidsgruppe kan bestå av to **eller flere** menigheter. Gruppen har én felles mappe for Samarbeidsfiler, som alle medlemsmenighetene ser.

Eksempel: A, B og C er i gruppen «Påskeprosjekt». Det trengs ingen separate koblinger A–B, A–C og B–C.

## 2. Datamodell

Dagens tabell `church_links` beholdes som **gruppen**, og en ny tabell holder menighetene i gruppen. Da beholder alle eksisterende kopier sin `files.link_id`, og ingen filer må flyttes eller kopieres.

| Tabell | Endring |
|---|---|
| `church_links` (gruppe) | + `name text not null` (2–80 tegn), + `description text` (valgfritt, ≤ 500). `status` (`active`/`ended`), `created_by/at` og `ended_by/at` som før. **Fjernes:** kontrollen `church_a < church_b` og den unike indeksen `church_links_active_pair`. Samme menigheter kan være med i flere grupper. `church_a`/`church_b` blir stående, kan være tomme og brukes ikke av ny kode (bakoverkompatibilitet og tilbakeføring). |
| `church_link_members` (ny) | `link_id → church_links` (cascade), `church_id → churches` (cascade), `status` (`active`/`left`), `joined_by/at`, `left_by/at`. Unik (`link_id`, `church_id`). RLS på, og ingen direkte skriving fra klienter. |
| `files` | Uendret: `folder = 'samarbeid'`, `link_id`, `source_file_id`, `source_folder`. `church_id` på en kopi = menigheten som **bidro** (teller i dens kvote, som i dag). Unik (`link_id`, `source_file_id`) beholdes, så samme fil ikke kan kopieres to ganger til samme gruppe. |

**Regler:**
- En aktiv gruppe har minst 2 aktive medlemsmenigheter, og alle må være aktive menigheter.
- Ingen øvre grense. Forslag: høyst 20 per gruppe, for å holde oversikten.

## 3. Tilgang til felles Samarbeidsfiler

| Hvem | Hva |
|---|---|
| Medlemmer av en **aktiv medlemsmenighet** i en **aktiv** gruppe | Ser og laster ned alle kopiene i gruppen fra menigheter som fortsatt er aktive medlemmer. Ser navnene på de andre menighetene i gruppen. |
| Medlemmer i menigheten som bidro | Kopierer inn **kopier** til gruppen: fra Delt mappe (alle medlemmer) eller fra Faste (bare Admin). Private filer kan aldri kopieres. Originalen røres aldri. |
| Admin i menigheten som bidro | Fjerner egne kopier fra gruppen. Ingen kan fjerne andres kopier. |
| Developer og Moderator | Administrerer grupper og ser **bare metadata** for filene (`link_files_meta`). Ingen innhold, nedlasting eller sletting, som i dag. Filinnhold bare der de selv er medlem (A1/A2). |
| Alle andre (andre menigheter, menigheter som har forlatt gruppen) | Ingenting. |

**Håndhevelse i databasen:** ny `app.group_access(link)` erstatter `app.link_access`. Den krever:
- aktiv gruppe
- at brukeren er aktivt medlem av en menighet som er aktivt medlem av gruppen
- at menigheten kan bruke tjenesten

`app.can_see_file` for `samarbeid` krever i tillegg at menigheten som **bidro**, fortsatt er aktivt medlem av gruppen. Det gjelder samme funksjon for RLS (`files`), nedlastingslenker (`file_keys` → serveren) og verktøyene (`MLCloud.collab()`).

## 4. Administrasjon

| Handling | Developer | Moderator | Admin i medlemsmenighet | User |
|---|---|---|---|---|
| Opprette gruppe (navn og minst 2 menigheter) | ja | ja | nei | nei |
| Endre navn og beskrivelse | ja | ja | nei | nei |
| Legge til eller fjerne menighet | ja | ja | **beslutning** (forslag: nei nå) | nei |
| Avslutte og gjenåpne gruppe | ja | ja | nei | nei |
| Slette avsluttet gruppe | ja | ja | nei | nei |
| Se gruppen, medlemmene og filene | metadata | metadata | ja (egen gruppe) | ja (egen gruppe) |

Alt krever MFA for Developer og Moderator, som i dag (`app.is_collab_admin`). Alle handlinger loggføres:
- `groups.create`, `groups.update`, `groups.add_church`, `groups.remove_church`, `groups.end`, `groups.reopen`, `groups.delete`

Admin i alle medlemsmenigheter får varsel ved oppretting, tillegg, fjerning, avslutning og gjenåpning (utvidet `notify_link`).

## 5. Avslutning, fjerning av menighet og sletting

| Hendelse | Samarbeidsfilene |
|---|---|
| **Gruppen avsluttes** | Alt skjules for alle, og ingenting slettes (som i dag). Gjenåpning gjør alt synlig igjen. |
| **En menighet fjernes fra gruppen** | Menigheten mister med en gang tilgang til hele gruppen. **Forslag:** kopiene den bidro med, **skjules** for de andre, men slettes ikke. Legges menigheten til igjen, kommer de tilbake. Alternativet er å slette kopiene; det krever din beslutning. |
| **Færre enn 2 aktive medlemmer igjen** | Gruppen kan ikke være aktiv. Fjerning av nest siste menighet stoppes med forklaring: avslutt gruppen i stedet. |
| **En menighet slettes for godt** (eksisterende `purge_church`) | Medlemskapet i gruppen og menighetens kopier fjernes med resten av menighetens data (som i dag). |
| **Gruppen slettes** (bare avsluttede grupper) | Gruppen, medlemslisten og alle kopier slettes. Lagringsnøklene går via `file_cleanup_queue`, med registrert resultat. Originalene i menighetene røres ikke. Bekreftelsen viser antall kopier og størrelse. |

## 6. Videreføring av dagens koblinger

Migreringen gjør hver eksisterende kobling om til en gruppe med to medlemmer:
- `church_a`/`church_b` → to rader i `church_link_members` (status `active`).
- Navnet blir «A – B», som i dag. Status og datoer beholdes.
- Kopier og tilganger blir uendret, siden `link_id` er den samme.

**Kontroll i migreringen:** antall koblinger = antall grupper, og hver gruppe har 2 medlemmer. Avbryter ellers.

Data per i dag:
- **Dev:** 1 aktiv kobling (A – «12», opprettet fra din konto), og ingen avsluttede.
- **Produksjon:** ikke lest (den skal ikke røres før egen godkjenning).

**Tilbakeføring:** endringen legger bare til. `church_a`/`church_b` beholdes, så forrige kodeversjon virker for grupper med to medlemmer. Grupper med 3+ menigheter vil ikke vises riktig i gammel kode. Tilbakeføring etter at slike grupper er laget, krever derfor en egen plan.

## 7. Grensesnitt

**Samarbeid (Developer og Moderator):**
- «Ny samarbeidsgruppe»: navn, beskrivelse og flervalg av menigheter (minst 2).
- Liste over grupper med medlemmer som merkelapper, status, antall kopier og størrelse.
- Gruppedetalj: endre navn og beskrivelse, legge til eller fjerne menighet (bekreftelsen forklarer at kopiene skjules), avslutte, gjenåpne og slette (bare avsluttede).
- Metadata for filene, gruppert per menighet.

**Filer → Samarbeidsfiler (medlemmer):** én fane eller ett valg per gruppe, og per gruppe seksjonene «Fra oss» og «Fra <menighet>» for hver av de andre. «Del i Samarbeidsfiler» lar deg velge gruppe.

**Verktøyene (`MLCloud.collab()`):** gruppenavnet som tittel. Ellers som i dag.

Alle nye tekster får engelsk oversettelse.

## 8. Migreringer

1. **`20261008100000_collab_groups.sql`:**
   - `church_link_members`, `name` og `description`, og tilbakefylling fra `church_a`/`church_b` med kontroll.
   - Kontrollen og den unike indeksen for par fjernes.
   - Nye og endrede funksjoner:
     - nye: `create_group`, `update_group`, `add_group_church`, `remove_group_church`, `my_groups` og `app.group_access`
     - endret: `link_files_meta`, `end_link`, `reopen_link`, `delete_link`, `app.transfer_check`, `register_link_copy`, `app.can_see_file`, `notify_link` og `church_directory`
     - `my_links` og `create_link` beholdes som tynne kompatibilitetsfunksjoner (to menigheter), og fjernes i en senere opprydding.
2. Ingen endring i `files`, kvoter eller lagring.

Samme fremgangsmåte som før:
- tørrkjøring
- øyeblikksbilde før og etter
- RLS lokalt (PGlite) og i dev
- ingen produksjonsendring uten egen godkjenning

## 9. Tester

**RLS (nye):**
- Gruppe med A, B og C:
  - Medlem i C ser kopier fra A og B. Medlem i D ser ingenting.
  - Stab ser bare metadata.
  - Private filer kan aldri kopieres. Faste kan bare kopieres av Admin.
  - Samme fil kan ikke kopieres to ganger til samme gruppe.
  - Kopien teller i kvoten til menigheten som bidro.
- Fjerning av C: C mister tilgang, og C sine kopier skjules for A og B. Legges C til igjen, kommer de tilbake.
- Nest siste menighet kan ikke fjernes.
- Avsluttet gruppe skjuler alt, og gjenåpning gir det tilbake.
- Sletting: bare avsluttede grupper. Kopiene går til køen, og originalene er urørt.
- Admin og User avvises fra all administrasjon. Developer og Moderator med MFA godtas, uten MFA avvises.
- Migrerte koblinger: 2 medlemmer, samme kopier og samme tilgang. Eksisterende testblokker tilpasses.

**Server:** `file.copy_to_link` og `link.delete` med gruppe-ID, og avvisning for menighet som ikke er medlem.

**Nettleser:** Developer, Moderator, Admin og User på PC og mobil:
- opprette en gruppe med tre menigheter
- dele en kopi
- se den fra de to andre menighetene
- fjerne en menighet
- avslutte, gjenåpne og slette

**Regresjon:** én menighet om gangen, fjerning av medlemskap, opprydning, tilbakemeldinger, kvoter og roller.

**Testdata:** testen trenger en tredje testmenighet, «CH-test Menighet C», i dev. **Krever din godkjenning.** Den kan ryddes etterpå.

## 10. Beslutninger før implementering

1. **Når en menighet fjernes fra gruppen:** skal kopiene den bidro med, **skjules** (forslag, kan gjenopprettes) eller **slettes**?
2. **Admin i en medlemsmenighet:** skal Admin kunne se medlemslisten og selv **forlate** gruppen? Forslag: kunne se den, men ikke forlate i første versjon.
3. **Grense for antall menigheter per gruppe:** forslag 20.
4. **Testmenigheten:** godkjenner du «CH-test Menighet C» i dev?
