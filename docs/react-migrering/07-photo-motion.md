# Verktøy 6 og 7: Photo Design og Motion Design

Status: ferdig og verifisert.

- `media-lab-react/photo-design.dc.html`, `motion-design.dc.html` + `src/pages/…`. Motorene (`photo-engine.js`, `motion-engine.js`, `ml-fx.js`) importeres uendret. De er innpakket i `(function(){…})()` og setter `window.PD`/`VF`/`MLFX` eksplisitt, så de virker likt som ES-moduler.

## Ny særhet fra runtimen: lys modus (src/shared/runtime-quirks.js)
Skriptene i `<helmet>` står inne i den rå malen, og nettleseren kjører dem allerede mens siden leses inn. I lys modus skrev theme.js om fargene i den rå malen før runtimen leste den. Da serialiserte nettleseren stilen på nytt og delte opp kortformer (`font: inherit; font-size: 13px` → alle font-egenskaper hver for seg). Runtimen kompilerte deretter den urørte malen, og React oppdaterte bare de ulike nøklene. `font: inherit` ble satt, mens `font-size` og `font-weight` ble hoppet over fordi verdiene var like, og ble dermed overskrevet. Knapper som «Nytt prosjekt» ender derfor på 14px/400 i originalen i lys modus. `replayThemeTamper` regner ut den samme omskrivingen og gjør samme oppdatering, så React-sidene er piksel for piksel like. Det gjelder alle sider, og forsiden, Admin, Mockups, Loop Studio og Isolate Subject er testet på nytt og er fortsatt grønne.

## Verifisering
- `tests/compare.spec.js`: skjermbildene er like originalen (mørk/lys × desktop/mobil).
- **Utforskning i takt** (`tests/photo-design.spec.js`, `tests/motion-design.spec.js`, med `flow(…, { explore })` i `tests/parity.js`): 2 frø × 120 tilfeldige, like handlinger × desktop/mobil per verktøy. Handlingene er klikk, glidebrytere, farger, tekstfelt, nedtrekkslister, drag på lerretet og hurtigtaster. Etter hver handling er tekst, feltverdier, lenker, localStorage og skjermbilde like.
  - Fast `Math.random` og `Date.now` i begge (id-er og tidsstempler i lagrede prosjekter).
  - Styrt klokke i Motion Design (`clock`), så avspillingen står likt.
  - Ved ulikhet sjekkes det på nytt inntil fire ganger (asynkront arbeid som filstørrelse eller sidelasting). Lik oppførsel ender likt.
- Nedlastinger: `.motion`-prosjektfiler og andre filer er byte for byte like. **MP4** fra WebCodecs er ikke byte-deterministisk, heller ikke originalen mot seg selv (vist med `SELVTEST=1`). Den sammenlignes derfor på varighet, oppløsning og dekodede bilder (10/50/90 %): 0 % avvik. Filstørrelsen som vises etter videoeksport, tas ut av tekstsammenligningen av samme grunn.
