# Media Lab (ny) – teststrategi

Status: fase 1 (2026-10-10).

## 1. Grunnlinje (målt 2026-10-10)

| Hva | Resultat |
|---|---|
| `media-lab`: `npm ci && npm test` (node:test, inkl. RLS i PGlite) | 174/174 bestått, 7,1 s, `feature/onepage-rebuild` @ `674f318` |
| Playwright-paritetstester fra forrige migrering (129 tester) | Fjernet i `fa79781`; finnes i historikken og brukes som mal for regresjonstestene |

## 2. Testtyper

| Type | Verktøy | Dekker |
|---|---|---|
| Typekontroll | `tsc --noEmit` | hele `web/` |
| Lint | Oxlint | regler for hooks og React Compiler, ingen sykliske avhengigheter |
| Enhet | Vitest | `domain/`, `services/` (med falske adaptere), migreringer, parsere (ukeprogram, SRT, `.motion`) |
| Komponent | Vitest + happy-dom + Testing Library | delte UI-komponenter, skjemaer, tastaturnavigasjon |
| Kontrakt | Vitest | `infrastructure/supabase` mot samme kontrakt som `media-lab/src/services/contract.test.js`; mot dev med `CH_LIVE_*` |
| Ende-til-ende | Playwright | brukerreiser: innlogging, dashboard, hvert verktøy, «Åpne i …», direkte URL, tilbake/fram |
| Regresjon (R) | Playwright | samme input i gammel og ny app → sammenlign eksport |
| Livssyklus | Playwright | åpne/lukke verktøy 20 ganger: ingen voksende minne, lyttere eller object-URL-er |

## 3. Toleranser for regresjon (fra forrige migrering)

- **PNG:** byte-likt, ellers piksler ≤ 4 per kanal. **JPG:** ≤ 30 per piksel og < 0,01 % ulike piksler.
- **PDF:** strømmene pakkes ut; bildedata ≤ 4 per verdi.
- **MP4 (WebCodecs):** ikke byte-deterministisk; samme oppløsning, varighet ± 0,2 s, dekodede bilder ved 10/50/90 % uten avvik over toleransen.
- **`.motion`, `.srt`, spiller-HTML, JSON:** semantisk lik (samme innhold etter parsing). Byte-likhet kreves ikke for ny kode.
- **AI-modeller:** små avrundingsforskjeller i kanter tillates; resultatet skal være likt når testen kjøres alene.
- Låst `Date.now`, `Math.random` og styrt klokke i begge apper.

## 4. Nye avhengigheter (begrunnelse)

| Pakke | Hvorfor | Alternativ vurdert |
|---|---|---|
| `vitest` | Rask, Vite-native, TypeScript uten ekstra oppsett | `node:test` (brukes i gammel app) mangler JSX/TS uten egen transform |
| `happy-dom`, `@testing-library/react` | Komponenttester uten nettleser | jsdom (tregere) |
| `@playwright/test` | E2E og regresjon; brukt med hell i forrige migrering | – |

## 5. Hva som ikke kan testes automatisk

- **Objekt (ormbg) og Person (MODNet):** kjøres i ekte Chrome (`channel: 'chrome'`, WebGPU virker hodeløst på localhost) med ekte modeller fra Hugging Face; se testlogg 2026-10-12. BiRefNet er erstattet (feilet i Chrome 154).
- **Whisper:** krasjer i headless Chrome (minne) også i den gamle appen. Manuell test i vanlig Chrome med fast testbilde/-video; resultatet loggføres i `docs/testlogg.md`.
- **Prosjektmapper (File System Access):** krever brukerhandling. Manuell test med fast prosedyre.
- **Safari og Firefox:** manuell røyktest per verktøy før Preview godkjennes.
- **Ekte e-post:** testpostkassen (`CH_TEST_MAILBOX`).

## 6. Når er et verktøy ferdig

Alle rader for verktøyet i `docs/feature-parity.md` har **T**, eller et godkjent unntak; regresjonstestene er grønne;
livssyklustesten er grønn; manuelle tester er loggført.
