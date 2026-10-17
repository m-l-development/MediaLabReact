# Tilbakemeldingssaker – behandling 2026-10-18

Behandlet én og én i den nye appen (`web/`), lokalt og i connecthub-dev med syntetiske kontoer. Ingen endring i produksjonen, ingen produksjonsdata brukt, statusen på sakene i produksjonen er ikke endret. Alle kodeendringer ligger på `connecthub` (lokalt, ikke pushet).

## TB-D9DE93 – Varslinger: «Merk alle som lest», «Fjern leste», «Tøm varslingsloggen»

- **Funn:** varslene ligger i `public.notifications`. Brukerne kunne lese og sette `read_at`, men ikke slette. «Merk alle som lest» fantes som tekstknapp, men merket bare de 50 som var hentet, én og én, og feil ble slukt uten melding.
- **Endring:**
  - Migrering `20261018120000_notifications_clear.sql` med `mark_my_notifications_read()` og `clear_my_notifications(only_read)`. Den gjelder bare egne varsler og bare innloggede; brukerne har fortsatt ikke slette-rettighet på tabellen.
  - Kontomenyen har fått tre små ikonknapper ved «Varsler», med navn og verktøytips. «Tøm» krever bekreftelse, fordi den er permanent.
  - «Lyktes» vises bare når databasen har utført handlingen; ellers vises «Det gikk ikke, og ingenting ble endret».
- **Tester:**
  - 14 nye i `rls_test.sql`: egne og andres varsler, «fjern leste» lar uleste stå, anonym avvises. Resultat 998/998 lokalt og i dev.
  - Komponent- og tjenestetester, inkludert avbrutt bekreftelse og feil.
  - I dev med ekte database: engangskonto i egen testmenighet → «Alle varsler er merket som lest», «2 varsler fjernet», tom logg etter «Tøm».
- **Krever:** migreringen må kjøres i produksjonen **før** koden publiseres (egen godkjenning). Uten den gir knappene feilmeldingen, men ingenting går tapt.

## TB-7BF5C1 – Isolate Subject henger og laster ned flere ganger

- **Funn:** årsaken ble funnet og rettet 2026-10-12. BiRefNet_lite feilet i Chrome 154 både på WebGPU og WASM, så appen lastet ned 115 MB og så 224 MB og ble aldri ferdig. Modellen er byttet til ormbg, og oppstarten av WebGPU er gjort robust (se `docs/testlogg.md`). Rettelsen kom i produksjonen med lanseringen 2026-10-17, så saken er trolig meldt før det.
- **Gjenskapt nå?** Nei, med dagens kode.
- **Endring nå:** kontrollene er gjort om til en permanent test med ekte modeller (`web/e2e-real/isolate-models.spec.ts`):
  - Objekt fra kald start: ferdig på 14,6 s, én modellfil hentet én gang.
  - Ny åpning: ferdig på 12,3 s, ingen ny nedlasting.
  - Person: ferdig på 4,5 s med én fil.
- **Usikkert:** brukerens egen maskin og nettleser er ikke kjent. Er saken meldt etter 2026-10-17, trengs nettleser, bildetype og tidspunkt.

## TB-596FE4 – Loop Studio oppdaterer ikke for andre brukere

- **Funn:** delt innhold i Loop Studio er menighetens felles malsoppsett (`church_settings` «loopstudio:<mal>») og felles grunnoppsett («loopstudio:bases»). Testet med to syntetiske brukere i samme menighet:
  - Malsoppsettet synkroniseres; den andre brukeren får endringen innen 30 s eller når fanen blir synlig.
  - Et felles grunnoppsett kunne lagres, ses, endres og oppdateres begge veier.
  - **Feilen:** listen over grunnoppsett på Loop Studio-siden ble bare hentet når siden ble åpnet. Grunnoppsett som en annen lagret mens siden var åpen, kom ikke fram (gjenskapt).
- **Endring:** listen hentes også når fanen blir synlig og hvert 30. sekund (`LoopBases.tsx`).
- **Uavklart:** i én av ni kjøringer (i det fulle dev-løpet, under høy last) viste B «Grunnoppsettet er oppdatert.», men endringen lå ikke i databasen etterpå. Ikke gjenskapt i de åtte andre kjøringene (alene og i samme rekkefølge). Årsaken er ikke fastslått; testen registrerer nå versjonen før og etter, så et nytt tilfelle viser om lagringen faktisk ble utført. Kan henge sammen med brukerens rapport.
- **Tester:** `web/e2e-dev/loop-sharing-dev.spec.ts` med to brukere. Den nye listen vises uten ny innlasting (feilet før rettelsen), endringer går begge veier, malsoppsettet synkroniseres, og en annen menighets oppsett gir 403. Menighetens oppsett kopieres før og legges tilbake etter hver kjøring.

## TB-BB67CB – Loop Studio: grunnoppsett og disk er ikke delt (meldt som kritisk)

- **Grunnoppsett:** delt finnes og virker, verifisert i dev med to brukere (se TB-596FE4). Brukeren må velge «Felles for menigheten» når grunnoppsettet lagres.
- **Disk:**
  - «Disk» (lagrede looper, høyst 10) har aldri vært delt, verken i dagens eller den nye appen. Den ligger i nettleseren (`loopstudio.disk.v1` i dagens app, brukerens lokale database i den nye).
  - Koden sier uttrykkelig at prosjektet (programtekst, slides, video og musikk) er personlig. Dette er altså en ny funksjon, ikke en feil som har oppstått.
- **Forslag (ikke gjort):**
  - **Lagring:** «Delt disk» for menigheten i `church_settings` med område `loopstudio:disk`. Det krever ingen skjemaendring, gir medlemskapskontroll, versjonering og sammenslåing per element (samme mekanisme som grunnoppsettet). Høyst 512 KB.
  - **Bilder:** lastes opp til menighetens Fellesmappe som `ch:`-referanser, som grunnoppsettet gjør.
  - **Video og musikk:** deles ikke. Video lagres aldri i skyen, og lydfiler kan ikke lastes opp. En delt loop åpnes uten disse hos andre.
  - **Samtidige endringer:** versjonskontroll som i felles grunnoppsett. En eldre kopi kan aldri overskrive en nyere uten sammenslåing.
- **Trenger din beslutning:**
  1. Skal vi lage delt disk?
  2. Skal den komme i tillegg til den personlige disken, eller erstatte den?
  3. Hvem kan endre og slette delte looper: alle medlemmer eller bare Admin?
  4. Er det greit at video og musikk ikke deles?

## TB-9AF961 – Vis menighetens logo

- **Endring:** forsiden viser navnet og logoen til menigheten brukeren arbeider i, under hilsenen.
  - Logoen hentes som blob fra menighetens filer; CSP-en tillater ikke lagringens adresser direkte.
  - Uten logo, eller ved feil, vises forbokstaver.
  - Bare menigheter brukeren er medlem av finnes i `whoami`, så ingen annen menighets logo kan vises.
  - Navnet kortes ned med «…» på smale skjermer.
- **Tester:** komponenttester (`features/hub/Hub.test.tsx`) for logo, forbokstaver, feil og ingen menighet.
- **Usikkert:** ikke sett på mobil med ekte logo i dev; plasseringen er under hilsenen.

## TB-3C000C – «xscsc»

- Ingen meningsfull informasjon. Ingen endring er gjort, og statusen (løst) er beholdt.
- Historikken i produksjonen er ikke lest; det ville kreve lesing i produksjonsdatabasen, som ikke er godkjent for dette.

## Andre funn underveis

- **Import fra forrige versjon:** Motion design laget **duplikater** når importen kjørte to ganger samtidig, og gjorde en ødelagt post om til et tomt prosjekt. Begge er rettet, med enhetstester. Photo, Thumbnail og Motion viser nå en forståelig melding når de gamle dataene ikke kan leses; før ble ingenting vist.
- **Admin, logo:** stab som bare var medlem av en menighet, fikk knappen for opplasting av logo, men databasen krever Admin-rollen. Nå vises knappen bare for Admin (også ekstra Admin); stab får en forklaring.
