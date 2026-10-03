/* Konvertert fra den gamle dc-siden studio-editor.dc.html. Dette er nå kilden – rediger direkte. */
import React from 'react';
import { I, css, val, chk, list } from '../../shared/dc.jsx';

/* malteksten til elementer som bare inneholder tekst (nøkkel = data-dc-tpl), se runtime-quirks.js */
export const inline = {"15":["Loop Studio"],"16":["{{ tplTitle }}"],"25":["Eksporter"],"29":["←"],"31":["Loop Studio"],"32":["{{ tplTitle }}"],"41":["{{ saveBtnLabel }}"],"42":["{{ saveMsg }}"],"44":[],"46":["Autolagring"],"48":["{{ autoAtLabel }}"],"51":["Navn på loopen"],"54":["{{ saveActionLabel }}"],"56":["Lagre som ny"],"57":["Avbryt"],"59":["{{ saveMsg }}"],"60":["{{ diskUsage }} Lagres på Disk i denne nettleseren. Du finner den igjen i Loop Studio. Video og lydspor lagres ikke."],"66":["{{ t.label }}"],"70":["\n            ","Bygg din egen loop","\n            ","Legg til slides og velg en stil med ett trykk. Du kan finjustere alt under Slides, Video og stil og Effekter.","\n          "],"71":["Bygg din egen loop"],"72":["Legg til slides og velg en stil med ett trykk. Du kan finjustere alt under Slides, Video og stil og Effekter."],"74":["Legg til slide"],"77":["+ {{ b.label }}","{{ b.hint }}"],"78":["+ {{ b.label }}"],"79":["{{ b.hint }}"],"81":["Stilpakker"],"84":["{{ b.label }}","{{ b.hint }}"],"85":["{{ b.label }}"],"86":["{{ b.hint }}"],"87":["Overrask meg"],"89":["Effekter av og på"],"92":["{{ b.label }}"],"94":["Overlegg"],"97":["{{ b.label }}"],"99":["Tempo for alle slides"],"102":["{{ b.label }}"],"104":["Aksentfarge"],"111":["1","Hent ukens program"],"112":["1"],"113":["Hent ukens program"],"115":["{{ ocrLabel }}","JPG eller PNG"],"116":["{{ ocrLabel }}"],"117":["JPG eller PNG"],"118":["Standard uke","Fast oppsett"],"119":["Standard uke"],"120":["Fast oppsett"],"121":["Fra fil",".txt eller .csv"],"122":["Fra fil"],"123":[".txt eller .csv"],"126":["2","Se over og rediger"],"127":["2"],"128":["Se over og rediger"],"130":["Tøm"],"131":["Lagre som standard uke"],"133":["Én linje per møte: ukedag, dato, tid og navn. Linjer uten ukedag, eller som starter med «Ekstra:», legges til som ekstra utenom uka. Linjer som starter med dato («3. september kl 18:30: …») blir egne slides."],"135":["Legg til møte"],"138":["Ukedag"],"143":["Dato"],"146":["Tid"],"150":["Navn"],"153":["Sted"],"155":["+ Legg til"],"157":["3","Lag videoen"],"158":["3"],"159":["Lag videoen"],"160":["Oppdater videoen"],"161":["Tom tekstboks gir standarduken."],"163":["{{ parseMsg }}"],"166":["\n                ","Standard uke","\n                ","Brukes når tekstboksen er tom, og av knappen «Standard uke».","\n              "],"167":["Standard uke"],"168":["Brukes når tekstboksen er tom, og av knappen «Standard uke»."],"170":["Endre"],"175":["Lagre standard uke"],"176":["Avbryt"],"177":["Tilbakestill"],"180":["\n                ","Faste bilder","\n                ","Hvert møtenavn får alltid sitt eget bakgrunnsbilde. {{ ruleCount }}.","\n              "],"181":["Faste bilder"],"182":["Hvert møtenavn får alltid sitt eget bakgrunnsbilde. {{ ruleCount }}."],"184":["Endre"],"188":["{{ rulesOrientNote }}"],"194":["Velg bilde"],"199":["{{ r.galleryLabel }}"],"201":["Fjern bilde"],"202":["{{ r.hits }}"],"203":["×"],"208":["+ Last opp"],"209":["+ Legg til møte"],"211":["Ferdig"],"212":["Avbryt"],"213":["Endringer brukes på slidene med en gang. Avbryt angrer alt."],"214":["Store og små bokstaver spiller ingen rolle. Treffer flere navn, vinner det lengste («Seniortreff» før «treff»)."],"215":["Bildene huskes per møte. Kommer «Tirsdag Kveldsmat» igjen neste uke, beholder den bildet sitt. Nye møter får bildet som sist ble brukt på samme ukedag."],"219":["\n              ","{{ selTypeLabel }}","\n              ","{{ selPos }}","\n            "],"220":["{{ selTypeLabel }}"],"221":["{{ selPos }}"],"223":["‹"],"224":["›"],"230":["Ukedag"],"233":["↺"],"239":["Dato"],"246":["↺"],"252":["Tid"],"255":["↺"],"261":["Navn på møtet"],"264":["↺"],"270":["Sted eller ekstra info (valgfritt)"],"273":["↺"],"277":["Endringer her oppdaterer også ukeprogrammet."],"283":["Merkelapp"],"286":["↺"],"292":["Tid-merke"],"295":["↺"],"301":["Tekst"],"304":["↺"],"310":["Undertekst"],"313":["↺"],"321":["Merkelapp"],"324":["↺"],"330":["Overskrift"],"333":["↺"],"339":["Tekst"],"342":["↺"],"349":["E-post"],"352":["↺"],"358":["Telefon"],"361":["↺"],"367":["QR-kode peker til"],"369":["Nettside, skjema, «mailto:adresse» eller «tel:nummer». Tomt felt skjuler QR-koden."],"375":["Plassering av QR-koden"],"376":["Standard"],"379":["Vannrett","{{ qrXPct }} %"],"380":["Vannrett"],"381":["{{ qrXPct }} %"],"384":["Loddrett","{{ qrYPct }} %"],"385":["Loddrett"],"386":["{{ qrYPct }} %"],"389":["Størrelse","{{ qrSizeVal }}"],"390":["Størrelse"],"391":["{{ qrSizeVal }}"],"393":["Du kan også dra QR-koden i forhåndsvisningen. Den flytter seg automatisk unna logoen."],"398":["Tittel"],"401":["↺"],"407":["Undertekst"],"410":["↺"],"415":["Legg til på sliden"],"418":["+ {{ b.label }}","{{ b.hint }}"],"419":["+ {{ b.label }}"],"420":["{{ b.hint }}"],"422":["Det du legger til, kan dras fritt i forhåndsvisningen. Dra i hjørnene for å endre størrelse."],"426":["{{ t.label }}"],"427":["Fjern"],"432":["Størrelse"],"435":["{{ t.sz.unit }}"],"441":["{{ a.label }}"],"445":["QR-kode og kontakt"],"446":["Slett QR-kode"],"448":["Hva skal koden åpne?"],"451":["{{ o.label }}"],"453":["{{ fqrValLabel }}"],"457":["{{ fqrExtraLabel }}"],"459":["{{ fqrHint }}"],"462":["Tekst under"],"465":["Kontakt"],"468":["Størrelse","{{ fqrSize }} px"],"469":["Størrelse"],"470":["{{ fqrSize }} px"],"473":["Viser en eksempelkode til du fyller inn feltet over."],"479":["Størrelse","{{ p.sizePct }} %"],"480":["Størrelse"],"481":["{{ p.sizePct }} %"],"484":["Runde hjørner","{{ p.radius }} px"],"485":["Runde hjørner"],"486":["{{ p.radius }} px"],"489":["Synlighet","{{ p.opPct }} %"],"490":["Synlighet"],"491":["{{ p.opPct }} %"],"495":["{{ a.label }}"],"497":["\n              ","Video på sliden","\n              ","Maks 5 min","\n            "],"498":["Video på sliden"],"499":["Maks 5 min"],"505":["Legg til video…"],"506":["Videoen vises i stedet for bakgrunnsbildet, og sliden varer like lenge som videoen."],"512":["\n                  ","{{ slideVidName }}","\n                  ","{{ slideVidLen }} · sliden varer like lenge","\n                "],"513":["{{ slideVidName }}"],"514":["{{ slideVidLen }} · sliden varer like lenge"],"515":["Bytt"],"516":["Fjern"],"519":["Lyd fra videoen"],"521":["På"],"522":["Av"],"524":["Loop-musikken"],"526":["Spill"],"527":["Demp"],"530":["Videovolum","{{ vidVolPct }} %"],"531":["Videovolum"],"532":["{{ vidVolPct }} %"],"534":["{{ vidAudioNote }}"],"536":["{{ bgHeading }}"],"539":["Ingen bilde – grunnvideoen vises"],"541":["{{ pickBgLabel }}"],"542":["Fra delt mappe"],"548":["Beskjær / flytt bilde"],"550":["{{ rulePickLabel }}"],"552":["{{ removeBgLabel }}"],"555":["Koblet til fast bilde","{{ ruleLinkedName }}"],"556":["Koblet til fast bilde"],"557":["{{ ruleLinkedName }}"],"558":["Fjern kobling"],"561":["Velg hvilket fast bilde sliden hører til. Når du bytter det faste bildet, byttes det her også."],"564":["\n                      ","\n                      ","{{ o.name }}","\n                    "],"566":["{{ o.name }}"],"568":["\n                ","\n                  ","\n                  ","Bakgrunnsfarge","\n                  ","{{ fillSummary }}","\n                ","\n                ","{{ fillArrow }}","\n              "],"569":["\n                  ","\n                  ","Bakgrunnsfarge","\n                  ","{{ fillSummary }}","\n                "],"571":["Bakgrunnsfarge"],"572":["{{ fillSummary }}"],"573":["{{ fillArrow }}"],"575":["Type"],"578":["{{ m.label }}"],"585":["Trykk på fargen for å endre den"],"586":[],"587":[],"594":["Gradientfarger"],"598":["▲"],"599":["▼"],"604":["{{ q.pct }}%"],"606":["×"],"608":["Mengde"],"610":["{{ q.wPct }}%"],"614":["Skarp kant til neste"],"617":["+ Legg til farge"],"618":[],"619":[],"624":["⇄ Snu"],"625":["Fordel jevnt"],"628":["Retning","{{ fillAngle }}°"],"629":["Retning"],"630":["{{ fillAngle }}°"],"635":["Overgang"],"637":["{{ fillSoft }} %"],"638":["Standard"],"640":["Skarp kant","Myk, diffus"],"641":["Skarp kant"],"642":["Myk, diffus"],"645":["Skarphet"],"647":["{{ fillSharp }} %"],"648":["0 %"],"650":["Myke overganger","Skarpe kanter"],"651":["Myke overganger"],"652":["Skarpe kanter"],"655":["Antall gjentakelser","{{ fillRep }}"],"656":["Antall gjentakelser"],"657":["{{ fillRep }}"],"660":["{{ fillNote }}"],"662":["Midtstill"],"666":["Flytt utsnittet"],"668":["Midtstill"],"669":["Ferdig"],"672":["Venstre"],"674":["Høyre"],"677":["Topp"],"679":["Bunn"],"680":["{{ panHint }}"],"682":["{{ portNote }}"],"686":["{{ titleImgNote }}"],"689":["Bildestyrke","{{ bgOpacityPct }} %"],"690":["Bildestyrke"],"691":["{{ bgOpacityPct }} %"],"695":["Fargefilter på denne sliden"],"698":["{{ o.label }}"],"704":["{{ selTintAmtPct }}%"],"705":["{{ selTintNote }}"],"708":["\n                  ","Stil og effekter for denne sliden","\n                  ","{{ slideStyleSummary }}","\n                  ","{{ slideStyleArrow }}","\n                "],"709":["Stil og effekter for denne sliden"],"710":["{{ slideStyleSummary }}"],"711":["{{ slideStyleArrow }}"],"713":["Tilbakestill"],"717":["Fargepaneler på denne sliden"],"720":["{{ o.label }}"],"727":["Farger på panelene"],"728":["{{ panelEditArrow }}"],"732":["Bakgrunn"],"735":["Fargen bak panelene"],"739":["{{ p.label }}"],"743":["{{ p.alphaPct }}%"],"744":["Tilfeldige farger"],"745":[],"750":["Tilfeldige farger"],"752":["{{ selPanelNote }}"],"754":["Bruk standardfarger"],"758":["{{ r.label }}"],"762":["«Som standard» følger innstillingene under Effekter. Valg du gjør her, gjelder bare denne sliden."],"765":["Vignett på denne sliden"],"771":["Rediger vignett…"],"772":["{{ vigSummary }}"],"780":["Rediger overlegg…"],"781":["{{ ovSummary }}"],"784":["Varighet","{{ selDurLabel }}"],"785":["Varighet"],"786":["{{ selDurLabel }}"],"790":["Vis i loopen"],"794":["Vis logo på denne sliden"],"796":["← Flytt"],"797":["Flytt →"],"798":["Dupliser"],"799":["Slett"],"801":["Legg til slide etter denne"],"803":["+ Tekst"],"804":["+ Kontakt med QR"],"805":["+ Avslutning"],"809":["Logo"],"816":["Bytt logo…"],"817":["Fjern"],"820":["Vis logoen i videoen"],"822":["Plassering"," – dra logoen i forhåndsvisningen (dobbeltklikk for å bytte), eller velg et hjørne:"],"823":["Plassering"],"826":["{{ lc.label }}"],"828":["Vannrett (venstre – høyre)","{{ logoXPct }} %"],"829":["Vannrett (venstre – høyre)"],"830":["{{ logoXPct }} %"],"833":["Loddrett (topp – bunn)","{{ logoYPct }} %"],"834":["Loddrett (topp – bunn)"],"835":["{{ logoYPct }} %"],"838":["Størrelse","{{ logoSize }}"],"839":["Størrelse"],"840":["{{ logoSize }}"],"843":["Synlighet","{{ logoOpacityPct }} %"],"844":["Synlighet"],"845":["{{ logoOpacityPct }} %"],"849":["Legg til logo…"],"850":["Bruk Livets Ord-logoen"],"852":["Grunnvideo"],"854":["{{ videoLabel }}"],"855":["Går i loop bak alle slides. Vises der sliden mangler eget bilde, og skinner gjennom når bildestyrken er skrudd ned."],"857":["Velg video…"],"859":["Fjern"],"861":["Lydspor"],"863":["{{ audioLabel }}"],"864":["Musikk under hele loopen. MP3, M4A eller WAV."],"866":["Velg lyd…"],"868":["Fjern"],"871":["Lydbibliotek"],"872":["+ Legg til lyder"],"874":["Lyder du laster opp, blir lagret her, så du kan bytte mellom dem senere."],"879":["\n                        ","\n                        ","{{ t.name }}","\n                        ","{{ t.dur }}","\n                      "],"881":["{{ t.name }}"],"882":["{{ t.dur }}"],"883":["×"],"885":["Sjanger"],"889":["{{ genreDesc }}"],"891":["Bruk analysen på nytt"],"895":["Volum","{{ audioVolPct }} %"],"896":["Volum"],"897":["{{ audioVolPct }} %"],"900":["Looping"],"903":["{{ am.label }}"],"904":["{{ audioModeDesc }}"],"905":["{{ audioDurLabel }}"],"907":["{{ audioFitNote }}"],"911":["{{ bpmLabel }}","{{ bpmSub }}"],"912":["{{ bpmLabel }}"],"913":["{{ bpmSub }}"],"915":["−"],"916":["+"],"917":["½"],"918":["×2"],"919":["Auto"],"921":["Finjuster slaget","{{ beatNudgeLabel }}"],"922":["Finjuster slaget"],"923":["{{ beatNudgeLabel }}"],"925":["Kommer skiftene litt før eller etter slaget, dra her til de sitter."],"927":["Start i sangen ved","{{ audioOffsetLabel }}"],"928":["Start i sangen ved"],"929":["{{ audioOffsetLabel }}"],"934":["Inntoning","{{ fadeInLabel }}"],"935":["Inntoning"],"936":["{{ fadeInLabel }}"],"939":["Uttoning","{{ fadeOutLabel }}"],"940":["Uttoning"],"941":["{{ fadeOutLabel }}"],"946":["Overskrift («Ukentlige møter»)"],"950":["Vannrett","{{ headerXPct }} %"],"951":["Vannrett"],"952":["{{ headerXPct }} %"],"955":["Loddrett","{{ headerYPct }} %"],"956":["Loddrett"],"957":["{{ headerYPct }} %"],"959":["Standard"],"962":["Merkelapp («Program for uken»)"],"966":["Vannrett","{{ topXPct }} %"],"967":["Vannrett"],"968":["{{ topXPct }} %"],"971":["Loddrett","{{ topYPct }} %"],"972":["Loddrett"],"973":["{{ topYPct }} %"],"975":["Standard"],"976":["Tips: dra tekstene og logoen direkte i forhåndsvisningen. Blå hjelpelinjer viser når noe står midt på, langs margen eller på linje med noe annet."],"978":["Aksentfarge"],"986":["Skrift"],"993":["Titler"],"996":["{{ titleSz.unit }}"],"1000":["Øvrig tekst"],"1003":["{{ textSz.unit }}"],"1007":["Vignett bak teksten","{{ overlayPct }} %"],"1008":["Vignett bak teksten"],"1009":["{{ overlayPct }} %"],"1012":["Standard varighet per slide","{{ defDur }} s"],"1013":["Standard varighet per slide"],"1014":["{{ defDur }} s"],"1018":["Vignett på alle slides"],"1024":["Rediger vignett for alle slides…"],"1025":["{{ vigAllSummary }}"],"1028":["Vis ukestripen nederst på møte-slidene"],"1030":["Strek ved ukedagen og merkelappene"],"1033":["{{ o.label }}"],"1035":["Oppløsning"],"1038":["{{ r.label }}"],"1043":["Fargepaneler"],"1045":["Tilbakestill"],"1048":["Tilfeldige farger"],"1049":[],"1054":["Tilfeldige farger"],"1055":["Fargene brukes også i overgangen «Paneler» og i fargefilteret. Du kan slå panelene av eller på for hver slide under Slides."],"1059":["{{ p.label }}"],"1063":["{{ p.alphaPct }}%"],"1066":["Glideren styrer hvor synlig hvert panel er. 0 % skjuler panelet."],"1069":["Fargefilter på bilder"],"1070":[],"1072":["Legger en farge over bakgrunnsbildene. Du kan overstyre filteret på hver slide under Slides."],"1075":["Farge"],"1078":["{{ o.label }}"],"1086":["Blanding"],"1089":["{{ o.label }}"],"1091":["Styrke","{{ tintAmtPct }} %"],"1092":["Styrke"],"1093":["{{ tintAmtPct }} %"],"1096":["Overgang mellom slides"],"1099":["{{ o.label }}"],"1101":["Tekstanimasjon"],"1104":["{{ o.label }}"],"1107":["Fart","{{ fxSpeedPct }} %"],"1108":["Fart"],"1109":["{{ fxSpeedPct }} %"],"1112":["Farten styres av takten i musikken."],"1114":["Overlegg"],"1122":["Rediger overlegg for alle slides…"],"1123":["{{ ovAllSummary }}"],"1127":["Langsom zoom i bildene"],"1130":["Lysstripe i aksentfargen ved hvert skifte"],"1132":["Følg takten i musikken","{{ beatBadge }}"],"1133":["Følg takten i musikken"],"1134":["{{ beatBadge }}"],"1135":["{{ beatFxDesc }}"],"1138":["\n                  ","Alltid med","\n                  ","Slidene skifter på første slag i takten, og overgangene er tilpasset tempoet.","\n                "],"1139":["Alltid med"],"1140":["Slidene skifter på første slag i takten, og overgangene er tilpasset tempoet."],"1144":["Rolig dybde","Teksten glir svakt mot bildet mens sliden står, som i en tittelsekvens."],"1145":["Rolig dybde"],"1146":["Teksten glir svakt mot bildet mens sliden står, som i en tittelsekvens."],"1150":["{{ o.label }}"],"1152":["Lengde per slide"],"1155":["{{ o.label }}"],"1159":["Ord og linjer kommer inn i takt med musikken"],"1162":["Bildet glir rolig til et nytt utsnitt på hver takt"],"1164":["Ekstra effekter (valgfritt)"],"1167":["{{ b.label }}"],"1168":["{{ beatFxHint }}"],"1173":["{{ o.label }}"],"1175":["Styrke","{{ beatPulsePct }} %"],"1176":["Styrke"],"1177":["{{ beatPulsePct }} %"],"1179":["Slå av takt-synk"],"1181":["{{ enableBeatLabel }}"],"1184":["{{ exportSummary }}"],"1188":["Ta med lyd i eksporten","{{ exportAudioNote }}"],"1189":["Ta med lyd i eksporten"],"1190":["{{ exportAudioNote }}"],"1192":["Fullskjerm-spiller (.html)"],"1193":["Én fil med alt inni: bilder, video, skrift og lyd. Spiller loopen uten stopp, også uten internett. Legg den inn som nettleserkilde i sendeprogrammet (f.eks. Wirecast) i {{ dimLabel }}."],"1195":["{{ htmlNote }}"],"1196":["{{ htmlLabel }}"],"1199":["Rask MP4-eksport"],"1200":["4K · med lyd"],"1201":["Lager én hel runde ({{ loopLen }}) som MP4 så fort maskinen klarer, uten å spille av i sanntid. Filen spilles av overalt og kan loopes sømløst. Hold fanen åpen mens den jobber."],"1204":["Lag MP4 i 4K"],"1205":["1080p"],"1211":["{{ fastLabel }}"],"1212":["Avbryt"],"1214":["{{ fastNote }}"],"1216":["Videofil (sanntid)"],"1217":["Tar opp én hel runde i sanntid ({{ loopLen }}). Slutten går sømløst over i starten, så filen kan loopes i sendeprogrammet eller brukes som vanlig video. Hold fanen åpen og synlig mens den tar opp."],"1219":["Ta opp video"],"1225":["Tar opp … {{ recPct }} %"],"1226":["Avbryt"],"1227":["{{ recNote }}"],"1231":["Forhåndsvisning"],"1232":["{{ statusLine }}"],"1235":["↶"],"1237":["↷"],"1240":["{{ o.label }}"],"1242":["{{ o.label }}"],"1243":["Eksporter"],"1291":["{{ l.n }}"],"1298":["{{ selElLabel }}"],"1299":["{{ selElPct }}"],"1300":["↺"],"1307":["✓"],"1319":["{{ inlineHint }}"],"1321":["Rull eller dra med to fingre for å flytte · Ctrl/Cmd + scroll for zoom"],"1323":["+"],"1324":["{{ zoomLabelShort }}"],"1325":["−"],"1351":["Slides i loopen"],"1364":["⟲"],"1365":["⟲"],"1379":["{{ c.kicker }}"],"1380":["{{ c.title }}"],"1381":["{{ c.num }} · {{ c.label }}","{{ c.meta }}"],"1382":["{{ c.num }} · {{ c.label }}"],"1383":["{{ c.meta }}"],"1396":["VIDEO"],"1397":["×"],"1400":["+","Legg til"],"1401":["+"],"1402":["Legg til"],"1405":["+ {{ q.label }}"],"1406":["Avbryt"],"1411":["\n            ","Rediger overlegg","\n            ","Effekter som ligger over bildet: filmkorn, lys, bokeh, snø og mer.","\n          "],"1412":["Rediger overlegg"],"1413":["Effekter som ligger over bildet: filmkorn, lys, bokeh, snø og mer."],"1414":["Ferdig"],"1416":["\n            ","Slides","\n            ","{{ oeOnCount }} · trykk på en slide for å redigere den","\n          "],"1417":["Slides"],"1418":["{{ oeOnCount }} · trykk på en slide for å redigere den"],"1423":["{{ v.num }} · {{ v.kind }}"],"1424":[],"1426":["{{ v.title }}"],"1427":["{{ v.status }}"],"1430":["Denne sliden"],"1431":["Alle slides"],"1432":["{{ oeScopeNote }}"],"1434":["Bruk innstillingene for alle slides"],"1440":["{{ oeOnLabel }}"],"1441":[],"1444":["Type"],"1447":["{{ t.label }}"],"1450":["Mengde"],"1452":["{{ oeAmt }} %"],"1453":["Standard"],"1455":["Lite","Mye"],"1456":["Lite"],"1457":["Mye"],"1460":["Fart"],"1462":["{{ oeSpeed }} %"],"1463":["100 %"],"1465":["Rolig","Rask"],"1466":["Rolig"],"1467":["Rask"],"1470":["Gjennomsiktighet"],"1472":["{{ oeTransp }} %"],"1473":["0 %"],"1475":["Helt dekkende","Helt gjennomsiktig"],"1476":["Helt dekkende"],"1477":["Helt gjennomsiktig"],"1479":["Farge"],"1485":["Egen farge"],"1486":["Farge brukes av Lyslekkasje, Bokeh og Konfetti."],"1489":["Farten følger tempoet i musikken (alle slides)"],"1494":["\n            ","Rediger vignett","\n            ","Dra punktet i bildet for å flytte vignetten.","\n          "],"1495":["Rediger vignett"],"1496":["Dra punktet i bildet for å flytte vignetten."],"1497":["Ferdig"],"1499":["\n            ","Slides","\n            ","{{ veOnCount }} · trykk på en slide for å redigere den","\n          "],"1500":["Slides"],"1501":["{{ veOnCount }} · trykk på en slide for å redigere den"],"1506":["{{ v.num }} · {{ v.kind }}"],"1507":[],"1509":["{{ v.title }}"],"1510":["{{ v.status }}"],"1513":["Denne sliden"],"1514":["Alle slides"],"1515":["{{ veScopeNote }}"],"1517":["Bruk innstillingene for alle slides"],"1520":["{{ l.label }}"],"1522":["+ Legg til vignett"],"1524":["Fjern denne vignetten"],"1534":["{{ veOnLabel }}"],"1535":[],"1537":["{{ veOnNote }}"],"1539":["Type"],"1542":["{{ t.label }}"],"1545":["Rotasjon"],"1547":["{{ veRot }}°"],"1548":["0°"],"1550":["⟲"],"1552":["⟳"],"1555":["Styrke"],"1557":["{{ veAmt }} %"],"1558":["100 %"],"1560":["0 % · ingen vignett","200 % · helt dekket"],"1561":["0 % · ingen vignett"],"1562":["200 % · helt dekket"],"1565":["Gjennomsiktighet"],"1567":["{{ veTransp }} %"],"1568":["0 %"],"1570":["Helt dekkende","Helt gjennomsiktig"],"1571":["Helt dekkende"],"1572":["Helt gjennomsiktig"],"1575":["Diffus"],"1577":["{{ veSoft }} %"],"1578":["Standard"],"1580":["Skarp kant","Myk, diffus"],"1581":["Skarp kant"],"1582":["Myk, diffus"],"1585":["Størrelse"],"1587":["{{ veSize }} %"],"1588":["100 %"],"1590":["Mindre","Større"],"1591":["Mindre"],"1592":["Større"],"1594":["Farge"],"1600":["Egen farge"],"1601":["Midtstill punktet"],"1604":["Klikk i forhåndsvisningen for å hente en farge"],"1605":["Avbryt"],"1621":["Hex-kode"],"1624":["Toning","{{ hexToneLabel }}"],"1625":["Toning"],"1626":["{{ hexToneLabel }}"],"1628":["Mørkere","Lysere"],"1629":["Mørkere"],"1630":["Lysere"],"1632":["Varme","{{ hexWarmLabel }}"],"1633":["Varme"],"1634":["{{ hexWarmLabel }}"],"1636":["Kaldere","Varmere"],"1637":["Kaldere"],"1638":["Varmere"],"1639":["Nullstill toning og varme"],"1641":["Fargehjul"],"1643":["Fargehjul"],"1644":["OK"],"1649":["Flytt utsnitt"],"1650":["Beskjær"],"1651":["\n          ","Flytt utsnitt","\n          ","Dra rammen dit du vil. Det som er inne i rammen, vises i videoen. Bildet beskjæres ikke.","\n        "],"1652":["Flytt utsnitt"],"1653":["Dra rammen dit du vil. Det som er inne i rammen, vises i videoen. Bildet beskjæres ikke."],"1666":["Midtstill"],"1668":["Avbryt"],"1669":["Ferdig"],"1675":["Flytt utsnitt"],"1676":["Beskjær"],"1678":["\n            ","{{ cropTitle }}","\n            ","Dra i rammen for å flytte utsnittet, og i hjørnene for å endre størrelsen.","\n          "],"1679":["{{ cropTitle }}"],"1680":["Dra i rammen for å flytte utsnittet, og i hjørnene for å endre størrelsen."],"1683":["{{ a.label }}"],"1702":["{{ cropSize }}"],"1703":["Nullstill"],"1705":["Avbryt"],"1706":["Bruk hele bildet"],"1707":["Bruk utsnitt"],"1711":["{{ m.label }}"],"1712":["\n    ","Design by Kristen Utvikling","\n  "],"1713":["Design by Kristen Utvikling"]};

export default function template(v) {
  return (
    <>
    <div data-dc-tpl="8" data-ml-bg="static" style={css(`min-height:100vh; padding-bottom:${v.rootPadB ?? ""}; display:flex; flex-direction:${v.rootDir ?? ""}; flex-wrap:${v.rootWrap ?? ""}; font-family:Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#f3f1ec; background:transparent; font-size:14px;`, "min-height:100vh; padding-bottom:{{ rootPadB }}; display:flex; flex-direction:{{ rootDir }}; flex-wrap:{{ rootWrap }}; font-family:Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#f3f1ec; background:transparent; font-size:14px;")}>
      {"\n\n  "}
      {v.mobile ? <>
        {"\n    "}
        <div data-dc-tpl="10" style={{"position":"sticky","top":"0","zIndex":"52","display":"flex","alignItems":"center","gap":"10px","padding":"calc(8px + env(safe-area-inset-top)) 12px 8px","background":"rgba(0,0,0,0.94)","backdropFilter":"blur(10px)","WebkitBackdropFilter":"blur(10px)","borderBottom":"1px solid #262626"}}>
          {"\n      "}
          <a data-dc-tpl="11" href="/loopstudio" title="Tilbake til malene" aria-label="Tilbake til malene" style={{"flex":"0 0 auto","width":"44px","height":"44px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","color":"#f3f1ec","textDecoration":"none"}}>
            <svg data-dc-tpl="12" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path data-dc-tpl="13" d="M15 5 8 12l7 7" />
            </svg>
          </a>
          {"\n      "}
          <div data-dc-tpl="14" style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
            {"\n        "}
            <div data-dc-tpl="15" style={{"fontSize":"10.5px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#8a867e"}}>
              Loop Studio
            </div>
            {"\n        "}
            <div data-dc-tpl="16" style={{"fontSize":"13.5px","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
              {I(v.tplTitle)}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <button data-dc-tpl="17" onClick={v.togglePlay} aria-label={v.playLabel} style={{"flex":"0 0 auto","width":"44px","height":"44px","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"transparent","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
            {"\n        "}
            {v.isLive ? <>
              <svg data-dc-tpl="19" width="12" height="14" viewBox="0 0 10 12" fill="currentColor">
                <rect data-dc-tpl="20" x="0" y="0" width="3.2" height="12" rx="1" />
                <rect data-dc-tpl="21" x="6.8" y="0" width="3.2" height="12" rx="1" />
              </svg>
            </> : null}
            {"\n        "}
            {v.isPaused ? <>
              <svg data-dc-tpl="23" width="13" height="14" viewBox="0 0 11 12" fill="currentColor">
                <path data-dc-tpl="24" d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
              </svg>
            </> : null}
            {"\n      "}
          </button>
          {"\n      "}
          <button data-dc-tpl="25" onClick={v.goExport} style={{"flex":"0 0 auto","height":"44px","padding":"0 16px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}}>
            Eksporter
          </button>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      <aside data-dc-tpl="26" style={css(`flex:${v.asideFlex ?? ""}; width:${v.paneW ?? ""}; max-width:${v.asideMaxW ?? ""}; min-width:0; height:${v.paneH ?? ""}; overflow-y:auto; background:#0a0a0a; border-right:${v.asideBorder ?? ""}; display:${v.asideDisplay ?? ""}; flex-direction:column;`, "flex:{{ asideFlex }}; width:{{ paneW }}; max-width:{{ asideMaxW }}; min-width:0; height:{{ paneH }}; overflow-y:auto; background:#0a0a0a; border-right:{{ asideBorder }}; display:{{ asideDisplay }}; flex-direction:column;")}>
        {"\n    "}
        <header data-dc-tpl="27" style={css(`position:sticky; top:0; z-index:5; background:#0a0a0a; padding:${v.asideHeadPad ?? ""}; display:flex; flex-direction:column; gap:12px;`, "position:sticky; top:0; z-index:5; background:#0a0a0a; padding:{{ asideHeadPad }}; display:flex; flex-direction:column; gap:12px;")}>
          {"\n      "}
          <div data-dc-tpl="28" style={css(`display:${v.asideBackDisp ?? ""}; align-items:center; gap:12px; min-width:0;`, "display:{{ asideBackDisp }}; align-items:center; gap:12px; min-width:0;")}>
            {"\n        "}
            <a data-dc-tpl="29" href="/loopstudio" title="Tilbake til malene" aria-label="Tilbake til malene" style={{"flex":"0 0 auto","width":"38px","height":"38px","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid rgba(255,255,255,0.22)","borderRadius":"999px","color":"#f3f1ec","fontSize":"17px"}} className="scp0">
              ←
            </a>
            {"\n        "}
            <div data-dc-tpl="30" style={{"minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
              {"\n          "}
              <div data-dc-tpl="31" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#8a867e"}}>
                Loop Studio
              </div>
              {"\n          "}
              <div data-dc-tpl="32" style={{"fontSize":"14px","fontWeight":"700","letterSpacing":"0.16em","textTransform":"uppercase","fontStretch":"112%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                {I(v.tplTitle)}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="33" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
            {"\n        "}
            {v.saveClosed ? <>
              {"\n          "}
              <div data-dc-tpl="35" style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <button data-dc-tpl="36" onClick={v.openSave} style={{"display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                  {"\n              "}
                  <svg data-dc-tpl="37" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path data-dc-tpl="38" d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                    <path data-dc-tpl="39" d="M7 3v5h8V3" />
                    <rect data-dc-tpl="40" x="7" y="13" width="10" height="6" rx="1" />
                  </svg>
                  {"\n              "}
                  <span data-dc-tpl="41">
                    {I(v.saveBtnLabel)}
                  </span>
                  {"\n            "}
                </button>
                {"\n            "}
                <span data-dc-tpl="42" style={{"fontSize":"12px","color":"#8fe3cf"}}>
                  {I(v.saveMsg)}
                </span>
                {"\n            "}
                <button data-dc-tpl="43" onClick={v.toggleAuto} role="switch" aria-checked={v.autoAria} title="Slå autolagring av eller på" style={css(`display:inline-flex; align-items:center; gap:9px; height:34px; min-height:0; padding:0 12px 0 6px; border:1px solid #2b2b2b; border-radius:999px; background:transparent; color:${v.autoTextColor ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "display:inline-flex; align-items:center; gap:9px; height:34px; min-height:0; padding:0 12px 0 6px; border:1px solid #2b2b2b; border-radius:999px; background:transparent; color:{{ autoTextColor }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")} className="scp2">
                  {"\n              "}
                  <span data-dc-tpl="44" data-keep-color="1" style={css(`position:relative; width:34px; height:20px; border-radius:999px; background:${v.autoTrack ?? ""}; transition:background 180ms ease;`, "position:relative; width:34px; height:20px; border-radius:999px; background:{{ autoTrack }}; transition:background 180ms ease;")}>
                    <span data-dc-tpl="45" style={css(`position:absolute; top:2px; left:${v.autoKnobX ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.autoKnob ?? ""}; transition:left 180ms ease;`, "position:absolute; top:2px; left:{{ autoKnobX }}; width:16px; height:16px; border-radius:999px; background:{{ autoKnob }}; transition:left 180ms ease;")} />
                  </span>
                  {"\n              "}
                  <span data-dc-tpl="46">
                    Autolagring
                  </span>
                  {"\n              "}
                  {v.hasAutoAt ? <>
                    <span data-dc-tpl="48" style={{"fontWeight":"400","color":"#6f6b64"}}>
                      {I(v.autoAtLabel)}
                    </span>
                  </> : null}
                  {"\n            "}
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            {v.saveOpen ? <>
              {"\n          "}
              <div data-dc-tpl="50" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <span data-dc-tpl="51" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Navn på loopen
                </span>
                {"\n            "}
                <input data-dc-tpl="52" value={val(v.saveName)} onChange={v.onSaveName} onKeyDown={v.onSaveKey} placeholder="F.eks. Påskemøte 2026" maxlength="60" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                {"\n            "}
                <div data-dc-tpl="53" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="54" onClick={v.doSave} style={{"height":"34px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                    {I(v.saveActionLabel)}
                  </button>
                  {"\n              "}
                  {v.canSaveAsNew ? <>
                    {"\n                "}
                    <button data-dc-tpl="56" onClick={v.doSaveNew} style={{"height":"34px","padding":"0 16px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                      Lagre som ny
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <button data-dc-tpl="57" onClick={v.closeSave} style={{"height":"34px","padding":"0 12px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12.5px","cursor":"pointer"}} className="scp4">
                    Avbryt
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                {v.hasSaveErr ? <>
                  <span data-dc-tpl="59" style={{"fontSize":"12px","color":"#ff8f8f"}}>
                    {I(v.saveMsg)}
                  </span>
                </> : null}
                {"\n            "}
                <span data-dc-tpl="60" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                  {I(v.diskUsage)}{" Lagres på Disk i denne nettleseren. Du finner den igjen i Loop Studio. Video og lydspor lagres ikke."}
                </span>
                {"\n          "}
              </div>
              {"\n        "}
            </> : null}
            {"\n      "}
          </div>
          {"\n    "}
        </header>
        {"\n    "}
        <nav data-dc-tpl="61" style={css(`position:sticky; top:0; z-index:4; display:grid; grid-template-columns:repeat(${v.tabCount ?? ""}, minmax(0,1fr)); gap:4px; padding:8px 14px 10px; background:#0a0a0a; border-bottom:1px solid #262626;`, "position:sticky; top:0; z-index:4; display:grid; grid-template-columns:repeat({{ tabCount }}, minmax(0,1fr)); gap:4px; padding:8px 14px 10px; background:#0a0a0a; border-bottom:1px solid #262626;")}>
          {"\n      "}
          {list(v.tabs).map(($it1, $i1) => {
            const v1 = { ...v, "t": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              <button data-dc-tpl="63" onClick={v1.t?.onClick} title={v1.t?.tip} aria-current={v1.t?.current} style={css(`display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; height:52px; min-width:0; padding:0 4px; border:1px solid ${v1.t?.border ?? ""}; border-radius:12px; background:${v1.t?.bg ?? ""}; color:${v1.t?.color ?? ""}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer;`, "display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; height:52px; min-width:0; padding:0 4px; border:1px solid {{ t.border }}; border-radius:12px; background:{{ t.bg }}; color:{{ t.color }}; font:inherit; font-size:11.5px; font-weight:600; cursor:pointer;")} className="scp4">
                {"\n          "}
                <svg data-dc-tpl="64" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path data-dc-tpl="65" d={v1.t?.icon} />
                </svg>
                {"\n          "}
                <span data-dc-tpl="66" style={{"maxWidth":"100%","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                  {I(v1.t?.label)}
                </span>
                {"\n        "}
              </button>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </nav>
        {"\n\n    "}
        <div data-dc-tpl="67" style={{"padding":"20px 24px 40px","display":"flex","flexDirection":"column","gap":"18px"}}>
          {"\n\n      "}
          {v.isBuild ? <>
            {"\n        "}
            <div data-dc-tpl="69" style={{"display":"flex","flexDirection":"column","gap":"22px"}}>
              {"\n          "}
              <div data-dc-tpl="70" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span data-dc-tpl="71" style={{"fontSize":"15px","fontWeight":"700"}}>
                  Bygg din egen loop
                </span>
                {"\n            "}
                <span data-dc-tpl="72" style={{"fontSize":"12.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                  Legg til slides og velg en stil med ett trykk. Du kan finjustere alt under Slides, Video og stil og Effekter.
                </span>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="73" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="74" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Legg til slide
                </span>
                {"\n            "}
                <div data-dc-tpl="75" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(120px, 1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.buildAdd).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="77" onClick={v1.b?.onClick} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"4px","minHeight":"64px","padding":"10px 12px","border":"1px dashed #3a3a3a","borderRadius":"12px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp5">
                        <span data-dc-tpl="78" style={{"fontSize":"13.5px","fontWeight":"700"}}>
                          {"+ "}{I(v1.b?.label)}
                        </span>
                        <span data-dc-tpl="79" style={{"fontSize":"11.5px","color":"#8a867e","lineHeight":"1.35"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="80" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="81" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Stilpakker
                </span>
                {"\n            "}
                <div data-dc-tpl="82" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(130px, 1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.buildPresets).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="84" onClick={v1.b?.onClick} style={css(`display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-height:70px; padding:12px; border:1px solid ${v1.b?.border ?? ""}; border-radius:12px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; text-align:left; cursor:pointer;`, "display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-height:70px; padding:12px; border:1px solid {{ b.border }}; border-radius:12px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; text-align:left; cursor:pointer;")} className="scp1">
                        <span data-dc-tpl="85" style={{"fontSize":"13.5px","fontWeight":"700","letterSpacing":"0.06em","textTransform":"uppercase"}}>
                          {I(v1.b?.label)}
                        </span>
                        <span data-dc-tpl="86" style={{"fontSize":"11.5px","opacity":"0.75","lineHeight":"1.35"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                <button data-dc-tpl="87" onClick={v.buildRandom} style={{"alignSelf":"flex-start","height":"38px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                  Overrask meg
                </button>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="88" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="89" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Effekter av og på
                </span>
                {"\n            "}
                <div data-dc-tpl="90" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildToggles).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="92" onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "height:36px; padding:0 14px; border:1px solid {{ b.border }}; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="93" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="94" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Overlegg
                </span>
                {"\n            "}
                <div data-dc-tpl="95" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildOverlay).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="97" onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "height:36px; padding:0 14px; border:1px solid {{ b.border }}; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="98" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="99" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Tempo for alle slides
                </span>
                {"\n            "}
                <div data-dc-tpl="100" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildTempo).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="102" onClick={v1.b?.onClick} style={css(`height:36px; padding:0 14px; border:1px solid ${v1.b?.border ?? ""}; border-radius:999px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "height:36px; padding:0 14px; border:1px solid {{ b.border }}; border-radius:999px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                        {I(v1.b?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="103" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                {"\n            "}
                <span data-dc-tpl="104" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Aksentfarge
                </span>
                {"\n            "}
                <div data-dc-tpl="105" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  {list(v.buildColors).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="107" data-keep-color="1" onClick={v1.b?.onClick} title={v1.b?.label} aria-label={v1.b?.label} style={css(`width:36px; height:36px; padding:0; border:2px solid ${v1.b?.ring ?? ""}; border-radius:999px; background:${v1.b?.hex ?? ""}; cursor:pointer;`, "width:36px; height:36px; padding:0; border:2px solid {{ b.ring }}; border-radius:999px; background:{{ b.hex }}; cursor:pointer;")} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isProgram ? <>
            {"\n        "}
            <div data-dc-tpl="109" style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div data-dc-tpl="110" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <div data-dc-tpl="111" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  <span data-dc-tpl="112" style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                    1
                  </span>
                  <span data-dc-tpl="113" style={{"fontSize":"13px","fontWeight":"700"}}>
                    Hent ukens program
                  </span>
                </div>
                {"\n            "}
                <div data-dc-tpl="114" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0,1fr))","gap":"8px"}}>
                  {"\n              "}
                  <button data-dc-tpl="115" onClick={v.pickOcr} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className="scp1">
                    <span data-dc-tpl="116" style={{"fontSize":"13px","fontWeight":"700"}}>
                      {I(v.ocrLabel)}
                    </span>
                    <span data-dc-tpl="117" style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      JPG eller PNG
                    </span>
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="118" onClick={v.loadStandard} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className="scp1">
                    <span data-dc-tpl="119" style={{"fontSize":"13px","fontWeight":"700"}}>
                      Standard uke
                    </span>
                    <span data-dc-tpl="120" style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      Fast oppsett
                    </span>
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="121" onClick={v.pickText} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","padding":"11px 12px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#121212","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer","minWidth":"0"}} className="scp1">
                    <span data-dc-tpl="122" style={{"fontSize":"13px","fontWeight":"700"}}>
                      Fra fil
                    </span>
                    <span data-dc-tpl="123" style={{"fontSize":"11.5px","color":"#9d998f"}}>
                      .txt eller .csv
                    </span>
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="124" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div data-dc-tpl="125" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <div data-dc-tpl="126" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                    <span data-dc-tpl="127" style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                      2
                    </span>
                    <span data-dc-tpl="128" style={{"fontSize":"13px","fontWeight":"700"}}>
                      Se over og rediger
                    </span>
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="129" style={{"display":"flex","gap":"2px"}}>
                    {"\n                "}
                    <button data-dc-tpl="130" onClick={v.clearText} style={{"height":"28px","padding":"0 8px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                      Tøm
                    </button>
                    {"\n                "}
                    <button data-dc-tpl="131" onClick={v.saveStandard} style={{"height":"28px","padding":"0 8px","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp7">
                      Lagre som standard uke
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <textarea data-dc-tpl="132" value={val(v.programText)} onChange={v.onProgramText} spellCheck="false" placeholder="Tirsdag 25. aug kl 19:00 Kveldsmat i kafeen" style={{"minHeight":"240px","resize":"vertical","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","fontFamily":"ui-monospace, Menlo, Consolas, monospace","fontSize":"13px","lineHeight":"1.7","outline":"none"}} className="scp3" />
                {"\n            "}
                <span data-dc-tpl="133" style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.55","textWrap":"pretty"}}>
                  Én linje per møte: ukedag, dato, tid og navn. Linjer uten ukedag, eller som starter med «Ekstra:», legges til som ekstra utenom uka. Linjer som starter med dato («3. september kl 18:30: …») blir egne slides.
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="134" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <span data-dc-tpl="135" style={{"fontSize":"13px","fontWeight":"700"}}>
                  Legg til møte
                </span>
                {"\n            "}
                <div data-dc-tpl="136" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                  {"\n              "}
                  <label data-dc-tpl="137" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span data-dc-tpl="138" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Ukedag
                    </span>
                    {"\n                "}
                    <select data-dc-tpl="139" value={val(v.addF?.day)} onChange={v.addOn?.day} style={{"height":"38px","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%","cursor":"pointer"}}>
                      {"\n                  "}
                      {list(v.addDays).map(($it1, $i1) => {
                        const v1 = { ...v, "d": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <option data-dc-tpl="141" value={val(v1.d?.v)}>
                            {I(v1.d?.l)}
                          </option>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </select>
                    {"\n              "}
                  </label>
                  {"\n              "}
                  <label data-dc-tpl="142" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span data-dc-tpl="143" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Dato
                    </span>
                    <input data-dc-tpl="144" value={val(v.addF?.date)} onChange={v.addOn?.date} onKeyDown={v.addKey} placeholder="25. aug" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n              "}
                  <label data-dc-tpl="145" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span data-dc-tpl="146" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Tid
                    </span>
                    <input data-dc-tpl="147" type="time" value={val(v.addF?.time)} onChange={v.addOn?.time} onKeyDown={v.addKey} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%","colorScheme":"dark"}} />
                  </label>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="148" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.6fr) minmax(0,1fr)","gap":"8px"}}>
                  {"\n              "}
                  <label data-dc-tpl="149" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span data-dc-tpl="150" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Navn
                    </span>
                    <input data-dc-tpl="151" value={val(v.addF?.title)} onChange={v.addOn?.title} onKeyDown={v.addKey} placeholder="Kveldsmat i kafeen" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n              "}
                  <label data-dc-tpl="152" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                    <span data-dc-tpl="153" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Sted
                    </span>
                    <input data-dc-tpl="154" value={val(v.addF?.place)} onChange={v.addOn?.place} onKeyDown={v.addKey} placeholder="Valgfritt" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13px","outline":"none","minWidth":"0","width":"100%"}} />
                  </label>
                  {"\n            "}
                </div>
                {"\n            "}
                <button data-dc-tpl="155" onClick={v.addMeeting} style={{"alignSelf":"flex-start","height":"36px","padding":"0 18px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp6">
                  + Legg til
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="156" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div data-dc-tpl="157" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  <span data-dc-tpl="158" style={{"width":"22px","height":"22px","borderRadius":"50%","background":"#e9e7e2","color":"#000000","fontSize":"12px","fontWeight":"700","display":"flex","alignItems":"center","justifyContent":"center","flex":"0 0 auto"}}>
                    3
                  </span>
                  <span data-dc-tpl="159" style={{"fontSize":"13px","fontWeight":"700"}}>
                    Lag videoen
                  </span>
                </div>
                {"\n            "}
                <button data-dc-tpl="160" onClick={v.applyProgram} style={{"height":"44px","width":"100%","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"14px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                  Oppdater videoen
                </button>
                {"\n            "}
                <span data-dc-tpl="161" style={{"fontSize":"12px","color":"#9d998f"}}>
                  Tom tekstboks gir standarduken.
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              {v.hasParseMsg ? <>
                {"\n            "}
                <div data-dc-tpl="163" style={css(`font-size:13px; line-height:1.5; padding:10px 12px; border-radius:8px; background:#121212; color:${v.parseColor ?? ""};`, "font-size:13px; line-height:1.5; padding:10px 12px; border-radius:8px; background:#121212; color:{{ parseColor }};")}>
                  {I(v.parseMsg)}
                </div>
                {"\n          "}
              </> : null}
              {"\n          "}
              <div data-dc-tpl="164" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="165" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                  {"\n              "}
                  <div data-dc-tpl="166" style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                    {"\n                "}
                    <span data-dc-tpl="167" style={{"fontSize":"13px","fontWeight":"700"}}>
                      Standard uke
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="168" style={{"fontSize":"12px","color":"#9d998f"}}>
                      Brukes når tekstboksen er tom, og av knappen «Standard uke».
                    </span>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.stdClosed ? <>
                    {"\n                "}
                    <button data-dc-tpl="170" onClick={v.openStd} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","flex":"0 0 auto"}} className="scp1">
                      Endre
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.stdOpen ? <>
                  {"\n              "}
                  <div data-dc-tpl="172" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    <textarea data-dc-tpl="173" value={val(v.stdDraft)} onChange={v.onStdDraft} spellCheck="false" style={{"minHeight":"130px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","fontFamily":"ui-monospace, Menlo, Consolas, monospace","fontSize":"12.5px","lineHeight":"1.7","outline":"none"}} className="scp3" />
                    {"\n                "}
                    <div data-dc-tpl="174" style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                      {"\n                  "}
                      <button data-dc-tpl="175" onClick={v.saveStdDraft} style={{"height":"34px","padding":"0 14px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                        Lagre standard uke
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="176" onClick={v.closeStd} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                        Avbryt
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="177" onClick={v.resetStd} style={{"height":"34px","padding":"0 6px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","marginLeft":"auto"}} className="scp4">
                        Tilbakestill
                      </button>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="178" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="179" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                  {"\n              "}
                  <div data-dc-tpl="180" style={{"display":"flex","flexDirection":"column","gap":"2px"}}>
                    {"\n                "}
                    <span data-dc-tpl="181" style={{"fontSize":"13px","fontWeight":"700"}}>
                      Faste bilder
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="182" style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                      {"Hvert møtenavn får alltid sitt eget bakgrunnsbilde. "}{I(v.ruleCount)}.
                    </span>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.rulesClosed ? <>
                    {"\n                "}
                    <button data-dc-tpl="184" onClick={v.openRules} style={{"height":"32px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","flex":"0 0 auto"}} className="scp1">
                      Endre
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.rulesOpen ? <>
                  {"\n              "}
                  <div data-dc-tpl="186" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                    {"\n                "}
                    {v.hasRulesOrientNote ? <>
                      {"\n                  "}
                      <span data-dc-tpl="188" style={{"fontSize":"12px","color":"#c9c5bc","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.rulesOrientNote)}
                      </span>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.sharedNote ? <span data-ch-shared-note="1" style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>{I(v.sharedNote)}</span> : null}
                    {v.rulesReadOnly ? <span data-ch-rules-readonly="1" style={{"fontSize":"12px","color":"#f5d38f","textWrap":"pretty"}}>{I(v.rulesReadOnlyNote)}</span> : null}
                    {list(v.rules).map(($it1, $i1) => {
                      const v1 = { ...v, "r": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <div data-dc-tpl="190" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #262626","borderRadius":"8px","background":"#141414"}}>
                          {"\n                    "}
                          <div data-dc-tpl="191" style={{"display":"flex","gap":"10px","alignItems":"center"}}>
                            {"\n                      "}
                            <button data-dc-tpl="192" onClick={v1.r?.toggleGallery} title="Bytt bilde" style={css(`position:relative; width:${v1.ruleThumbW ?? ""}; height:54px; flex:0 0 auto; padding:0; border:1px solid ${v1.r?.thumbBorder ?? ""}; border-radius:999px; background-color:#000; background-image:${v1.r?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer; color:#9d998f; font:inherit; font-size:11px; font-weight:600;`, "position:relative; width:{{ ruleThumbW }}; height:54px; flex:0 0 auto; padding:0; border:1px solid {{ r.thumbBorder }}; border-radius:999px; background-color:#000; background-image:{{ r.thumb }}; background-size:cover; background-position:center; cursor:pointer; color:#9d998f; font:inherit; font-size:11px; font-weight:600;")} className="scp1">
                              {"\n                        "}
                              {v1.r?.noImg ? <>
                                <span data-dc-tpl="194">
                                  Velg bilde
                                </span>
                              </> : null}
                              {"\n                      "}
                            </button>
                            {"\n                      "}
                            <div data-dc-tpl="195" style={{"display":"flex","flexDirection":"column","gap":"4px","flex":"1","minWidth":"0"}}>
                              {"\n                        "}
                              <input data-dc-tpl="196" value={val(v1.r?.kw)} onChange={v1.r?.onKw} readOnly={!v1.rulesEdit} placeholder="Møtenavn, f.eks. Seniortreff" style={{"height":"34px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","fontWeight":"600","outline":"none","minWidth":"0"}} className="scp3" />
                              {"\n                        "}
                              <div data-dc-tpl="197" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                                {"\n                          "}
                                <div data-dc-tpl="198" style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
                                  {"\n                            "}
                                  {v1.rulesEdit ? <button data-dc-tpl="199" onClick={v1.r?.toggleGallery} style={{"border":"0","padding":"0","background":"transparent","color":"#e9e7e2","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp9">
                                    {I(v1.r?.galleryLabel)}
                                  </button> : null}
                                  {"\n                            "}
                                  {v1.r?.hasImg && v1.rulesEdit ? <>
                                    <button data-dc-tpl="201" onClick={v1.r?.clearImg} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpa">
                                      Fjern bilde
                                    </button>
                                  </> : null}
                                  {"\n                          "}
                                </div>
                                {"\n                          "}
                                <span data-dc-tpl="202" style={{"fontSize":"11px","color":"#6f6b64"}}>
                                  {I(v1.r?.hits)}
                                </span>
                                {"\n                        "}
                              </div>
                              {"\n                      "}
                            </div>
                            {"\n                      "}
                            {v1.rulesEdit ? <button data-dc-tpl="203" onClick={v1.r?.del} data-ch-rule-del="1" title="Fjern fast bilde" aria-label="Fjern fast bilde" style={{"width":"28px","height":"28px","flex":"0 0 auto","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"16px","cursor":"pointer","alignSelf":"flex-start"}} className="scpb">
                              ×
                            </button> : null}
                            {"\n                    "}
                          </div>
                          {"\n                    "}
                          {v1.r?.galleryOpen ? <>
                            {"\n                      "}
                            <div data-dc-tpl="205" style={css(`display:grid; grid-template-columns:${v1.galCols ?? ""}; gap:6px; padding-top:8px; border-top:1px solid #262626;`, "display:grid; grid-template-columns:{{ galCols }}; gap:6px; padding-top:8px; border-top:1px solid #262626;")}>
                              {"\n                        "}
                              {list(v1.r?.gallery).map(($it2, $i2) => {
                                const v2 = { ...v1, "g": $it2, $index: $i2 };
                                return <React.Fragment key={$i2}>
                                  {"\n                          "}
                                  <button data-dc-tpl="207" onClick={v2.g?.pick} style={css(`aspect-ratio:${v2.galAspect ?? ""}; padding:0; border:2px solid ${v2.g?.border ?? ""}; border-radius:5px; background-color:#000; background-image:${v2.g?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer;`, "aspect-ratio:{{ galAspect }}; padding:0; border:2px solid {{ g.border }}; border-radius:5px; background-color:#000; background-image:{{ g.thumb }}; background-size:cover; background-position:center; cursor:pointer;")} className="scp1" />
                                  {"\n                        "}
                                </React.Fragment>;
                              })}
                              {"\n                        "}
                              <button data-dc-tpl="208" onClick={v1.r?.upload} style={css(`aspect-ratio:${v1.galAspect ?? ""}; padding:0; border:1px dashed #555; border-radius:5px; background:transparent; color:#f3f1ec; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "aspect-ratio:{{ galAspect }}; padding:0; border:1px dashed #555; border-radius:5px; background:transparent; color:#f3f1ec; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")} className="scp1">
                                + Last opp
                              </button>
                              <button onClick={v1.r?.fromShared} data-ch-rule-shared="1" style={css(`aspect-ratio:${v1.galAspect ?? ""}; padding:0; border:1px dashed #555; border-radius:5px; background:transparent; color:#f3f1ec; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "")}>
                                Fellesmappe
                              </button>
                              {"\n                      "}
                            </div>
                            {"\n                    "}
                          </> : null}
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    {v.rulesEdit ? <button data-dc-tpl="209" onClick={v.addRule} style={{"alignSelf":"flex-start","height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                      + Legg til møte
                    </button> : null}
                    {"\n                "}
                    <div data-dc-tpl="210" style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
                      {"\n                  "}
                      <button data-dc-tpl="211" onClick={v.saveRules} style={{"height":"34px","padding":"0 14px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                        Ferdig
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="212" onClick={v.closeRules} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                        Avbryt
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <span data-dc-tpl="213" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                      Endringer brukes på slidene med en gang. Avbryt angrer alt.
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="214" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                      Store og små bokstaver spiller ingen rolle. Treffer flere navn, vinner det lengste («Seniortreff» før «treff»).
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="215" style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.55","textWrap":"pretty","paddingTop":"4px","borderTop":"1px solid #262626"}}>
                Bildene huskes per møte. Kommer «Tirsdag Kveldsmat» igjen neste uke, beholder den bildet sitt. Nye møter får bildet som sist ble brukt på samme ukedag.
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isSlides ? <>
            {"\n        "}
            <div data-dc-tpl="217" style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div data-dc-tpl="218" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                {"\n            "}
                <div data-dc-tpl="219" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                  {"\n              "}
                  <span data-dc-tpl="220" style={{"fontSize":"11px","fontWeight":"700","letterSpacing":"0.14em","textTransform":"uppercase","padding":"5px 9px","borderRadius":"4px","background":"#e9e7e2","color":"#000000"}}>
                    {I(v.selTypeLabel)}
                  </span>
                  {"\n              "}
                  <span data-dc-tpl="221" style={{"fontSize":"13px","color":"#9d998f"}}>
                    {I(v.selPos)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="222" style={{"display":"flex","gap":"4px"}}>
                  {"\n              "}
                  <button data-dc-tpl="223" onClick={v.prevSlide} style={{"width":"34px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp2">
                    ‹
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="224" onClick={v.nextSlide} style={{"width":"34px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp2">
                    ›
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              {v.isDay ? <>
                {"\n            "}
                <div data-dc-tpl="226" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div data-dc-tpl="227" style={{"display":"grid","gridTemplateColumns":"minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div data-dc-tpl="228" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="229" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="230" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Ukedag
                        </span>
                        <span data-dc-tpl="231" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.day ? <>
                            <button data-dc-tpl="233" onClick={v.tcReset?.day} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="234" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.day ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.day }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="235" type="color" value={val(v.tc?.day)} onChange={v.tcOn?.day} aria-label="Tekstfarge for Ukedag" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="236" value={val(v.f?.day)} onChange={v.on?.day} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="237" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="238" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="239" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Dato
                        </span>
                        <span data-dc-tpl="240" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          <button data-dc-tpl="241" onClick={v.toggleDateLink} title={v.dateLinkTitle} aria-label={v.dateLinkTitle} style={css(`width:22px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.dateLinkBg ?? ""}; color:${v.dateLinkColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "width:22px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ dateLinkBg }}; color:{{ dateLinkColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")}>
                            <svg data-dc-tpl="242" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <path data-dc-tpl="243" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                              <path data-dc-tpl="244" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                            </svg>
                          </button>
                          {v.tcSet?.date ? <>
                            <button data-dc-tpl="246" onClick={v.tcReset?.date} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="247" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.date ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.date }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="248" type="color" value={val(v.tc?.date)} onChange={v.tcOn?.date} aria-label="Tekstfarge for Dato" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="249" value={val(v.f?.date)} onChange={v.on?.date} placeholder="25. aug" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="250" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="251" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="252" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Tid
                        </span>
                        <span data-dc-tpl="253" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.time ? <>
                            <button data-dc-tpl="255" onClick={v.tcReset?.time} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="256" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.time ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.time }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="257" type="color" value={val(v.tc?.time)} onChange={v.tcOn?.time} aria-label="Tekstfarge for Tid" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="258" value={val(v.f?.time)} onChange={v.on?.time} placeholder="kl 19:00" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="259" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="260" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="261" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Navn på møtet
                      </span>
                      <span data-dc-tpl="262" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.title ? <>
                          <button data-dc-tpl="264" onClick={v.tcReset?.title} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="265" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.title ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.title }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="266" type="color" value={val(v.tc?.title)} onChange={v.tcOn?.title} aria-label="Tekstfarge for Navn på møtet" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="267" value={val(v.f?.title)} onChange={v.on?.title} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="268" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="269" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="270" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Sted eller ekstra info (valgfritt)
                      </span>
                      <span data-dc-tpl="271" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.place ? <>
                          <button data-dc-tpl="273" onClick={v.tcReset?.place} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="274" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.place ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.place }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="275" type="color" value={val(v.tc?.place)} onChange={v.tcOn?.place} aria-label="Tekstfarge for Sted eller ekstra info (valgfritt)" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="276" value={val(v.f?.place)} onChange={v.on?.place} placeholder="F.eks. Kafeen" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="277" style={{"fontSize":"12px","color":"#9d998f"}}>
                    Endringer her oppdaterer også ukeprogrammet.
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isText ? <>
                {"\n            "}
                <div data-dc-tpl="279" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div data-dc-tpl="280" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div data-dc-tpl="281" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="282" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="283" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Merkelapp
                        </span>
                        <span data-dc-tpl="284" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.kicker ? <>
                            <button data-dc-tpl="286" onClick={v.tcReset?.kicker} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="287" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.kicker ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.kicker }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="288" type="color" value={val(v.tc?.kicker)} onChange={v.tcOn?.kicker} aria-label="Tekstfarge for Merkelapp" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="289" value={val(v.f?.kicker)} onChange={v.on?.kicker} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="290" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="291" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="292" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Tid-merke
                        </span>
                        <span data-dc-tpl="293" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.pill ? <>
                            <button data-dc-tpl="295" onClick={v.tcReset?.pill} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="296" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.pill ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.pill }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="297" type="color" value={val(v.tc?.pill)} onChange={v.tcOn?.pill} aria-label="Tekstfarge for Tid-merke" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="298" value={val(v.f?.pill)} onChange={v.on?.pill} placeholder="Søndag kl 11" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="299" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="300" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="301" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Tekst
                      </span>
                      <span data-dc-tpl="302" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.body ? <>
                          <button data-dc-tpl="304" onClick={v.tcReset?.body} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="305" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.body ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.body }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="306" type="color" value={val(v.tc?.body)} onChange={v.tcOn?.body} aria-label="Tekstfarge for Tekst" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <textarea data-dc-tpl="307" value={val(v.f?.body)} onChange={v.on?.body} style={{"minHeight":"120px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.5","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="308" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="309" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="310" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Undertekst
                      </span>
                      <span data-dc-tpl="311" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.sub ? <>
                          <button data-dc-tpl="313" onClick={v.tcReset?.sub} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="314" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.sub ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.sub }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="315" type="color" value={val(v.tc?.sub)} onChange={v.tcOn?.sub} aria-label="Tekstfarge for Undertekst" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="316" value={val(v.f?.sub)} onChange={v.on?.sub} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isContact ? <>
                {"\n            "}
                <div data-dc-tpl="318" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div data-dc-tpl="319" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="320" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="321" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Merkelapp
                      </span>
                      <span data-dc-tpl="322" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.kicker ? <>
                          <button data-dc-tpl="324" onClick={v.tcReset?.kicker} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="325" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.kicker ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.kicker }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="326" type="color" value={val(v.tc?.kicker)} onChange={v.tcOn?.kicker} aria-label="Tekstfarge for Merkelapp" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="327" value={val(v.f?.kicker)} onChange={v.on?.kicker} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="328" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="329" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="330" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Overskrift
                      </span>
                      <span data-dc-tpl="331" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.headline ? <>
                          <button data-dc-tpl="333" onClick={v.tcReset?.headline} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="334" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.headline ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.headline }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="335" type="color" value={val(v.tc?.headline)} onChange={v.tcOn?.headline} aria-label="Tekstfarge for Overskrift" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <textarea data-dc-tpl="336" value={val(v.f?.headline)} onChange={v.on?.headline} style={{"minHeight":"64px","resize":"vertical","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.5","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="337" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="338" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="339" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Tekst
                      </span>
                      <span data-dc-tpl="340" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.text ? <>
                          <button data-dc-tpl="342" onClick={v.tcReset?.text} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="343" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.text ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.text }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="344" type="color" value={val(v.tc?.text)} onChange={v.tcOn?.text} aria-label="Tekstfarge for Tekst" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="345" value={val(v.f?.text)} onChange={v.on?.text} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="346" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                    {"\n                "}
                    <div data-dc-tpl="347" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="348" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="349" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          E-post
                        </span>
                        <span data-dc-tpl="350" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.email ? <>
                            <button data-dc-tpl="352" onClick={v.tcReset?.email} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="353" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.email ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.email }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="354" type="color" value={val(v.tc?.email)} onChange={v.tcOn?.email} aria-label="Tekstfarge for E-post" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="355" value={val(v.f?.email)} onChange={v.on?.email} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="356" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      <span data-dc-tpl="357" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="358" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Telefon
                        </span>
                        <span data-dc-tpl="359" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                          {v.tcSet?.phone ? <>
                            <button data-dc-tpl="361" onClick={v.tcReset?.phone} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                              ↺
                            </button>
                          </> : null}
                          <span data-dc-tpl="362" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.phone ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.phone }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                            <input data-dc-tpl="363" type="color" value={val(v.tc?.phone)} onChange={v.tcOn?.phone} aria-label="Tekstfarge for Telefon" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </span>
                        </span>
                      </span>
                      <input data-dc-tpl="364" value={val(v.f?.phone)} onChange={v.on?.phone} placeholder="Valgfritt" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","minWidth":"0"}} className="scp3" />
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="365" style={{"display":"flex","gap":"12px","alignItems":"flex-start"}}>
                    {"\n                "}
                    <label data-dc-tpl="366" style={{"flex":"1","minWidth":"0","display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="367" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        QR-kode peker til
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="368" value={val(v.f?.qrUrl)} onChange={v.on?.qrUrl} placeholder="https://… eller mailto:…" style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                      {"\n                  "}
                      <span data-dc-tpl="369" style={{"fontSize":"12px","color":"#9d998f","lineHeight":"1.5"}}>
                        Nettside, skjema, «mailto:adresse» eller «tel:nummer». Tomt felt skjuler QR-koden.
                      </span>
                      {"\n                "}
                    </label>
                    {"\n                "}
                    {v.hasQr ? <>
                      {"\n                  "}
                      <div data-dc-tpl="371" role="img" aria-label="QR" title="QR" style={css(`width:84px; height:84px; flex:0 0 auto; margin-top:22px; border-radius:6px; background-color:#fff; background-image:${v.qrImgCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center; image-rendering:pixelated;`, "width:84px; height:84px; flex:0 0 auto; margin-top:22px; border-radius:6px; background-color:#fff; background-image:{{ qrImgCss }}; background-size:contain; background-repeat:no-repeat; background-position:center; image-rendering:pixelated;")} />
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.hasQr ? <>
                    {"\n                "}
                    <div data-dc-tpl="373" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"12px","border":"1px solid #262626","borderRadius":"8px","background":"#141414"}}>
                      {"\n                  "}
                      <div data-dc-tpl="374" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px"}}>
                        {"\n                    "}
                        <span data-dc-tpl="375" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          Plassering av QR-koden
                        </span>
                        {"\n                    "}
                        <button data-dc-tpl="376" onClick={v.resetQrPos} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                          Standard
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="377" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"10px"}}>
                        {"\n                    "}
                        <label data-dc-tpl="378" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          {"\n                      "}
                          <span data-dc-tpl="379" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="380">
                              Vannrett
                            </span>
                            <span data-dc-tpl="381">
                              {I(v.qrXPct)}{" %"}
                            </span>
                          </span>
                          {"\n                      "}
                          <input data-dc-tpl="382" type="range" min="0" max="100" step="1" value={val(v.qrXPct)} onChange={v.onQrX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                    "}
                        <label data-dc-tpl="383" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          {"\n                      "}
                          <span data-dc-tpl="384" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="385">
                              Loddrett
                            </span>
                            <span data-dc-tpl="386">
                              {I(v.qrYPct)}{" %"}
                            </span>
                          </span>
                          {"\n                      "}
                          <input data-dc-tpl="387" type="range" min="0" max="100" step="1" value={val(v.qrYPct)} onChange={v.onQrY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <label data-dc-tpl="388" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        {"\n                    "}
                        <span data-dc-tpl="389" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                          <span data-dc-tpl="390">
                            Størrelse
                          </span>
                          <span data-dc-tpl="391">
                            {I(v.qrSizeVal)}
                          </span>
                        </span>
                        {"\n                    "}
                        <input data-dc-tpl="392" type="range" min="160" max="520" step="10" value={val(v.qrSizeVal)} onChange={v.onQrSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                  "}
                      </label>
                      {"\n                  "}
                      <span data-dc-tpl="393" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                        Du kan også dra QR-koden i forhåndsvisningen. Den flytter seg automatisk unna logoen.
                      </span>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              {v.isOutro ? <>
                {"\n            "}
                <div data-dc-tpl="395" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                  {"\n              "}
                  <div data-dc-tpl="396" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="397" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="398" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Tittel
                      </span>
                      <span data-dc-tpl="399" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.title ? <>
                          <button data-dc-tpl="401" onClick={v.tcReset?.title} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="402" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.title ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.title }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="403" type="color" value={val(v.tc?.title)} onChange={v.tcOn?.title} aria-label="Tekstfarge for Tittel" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="404" value={val(v.f?.title)} onChange={v.on?.title} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="405" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="406" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      <span data-dc-tpl="407" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Undertekst
                      </span>
                      <span data-dc-tpl="408" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                        {v.tcSet?.sub ? <>
                          <button data-dc-tpl="410" onClick={v.tcReset?.sub} title="Tilbakestill farge" aria-label="Tilbakestill farge" style={{"width":"22px","height":"22px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scp4">
                            ↺
                          </button>
                        </> : null}
                        <span data-dc-tpl="411" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:${v.tc?.sub ?? ""}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);`, "position:relative; width:22px; height:22px; border-radius:999px; border:1px solid #3a3a3a; background:{{ tc.sub }}; overflow:hidden; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.3);")}>
                          <input data-dc-tpl="412" type="color" value={val(v.tc?.sub)} onChange={v.tcOn?.sub} aria-label="Tekstfarge for Undertekst" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                      </span>
                    </span>
                    <input data-dc-tpl="413" value={val(v.f?.sub)} onChange={v.on?.sub} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </> : null}
              {"\n\n          "}
              <div data-dc-tpl="414" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="415" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Legg til på sliden
                </span>
                {"\n            "}
                <div data-dc-tpl="416" style={{"display":"grid","gridTemplateColumns":"repeat(3, minmax(0,1fr))","gap":"8px"}}>
                  {"\n              "}
                  {list(v.freeAdd).map(($it1, $i1) => {
                    const v1 = { ...v, "b": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="418" onClick={v1.b?.onClick} style={{"display":"flex","flexDirection":"column","alignItems":"flex-start","gap":"3px","minHeight":"62px","padding":"10px 12px","border":"1px dashed #3a3a3a","borderRadius":"12px","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}} className="scp5">
                        <span data-dc-tpl="419" style={{"fontSize":"13px","fontWeight":"700"}}>
                          {"+ "}{I(v1.b?.label)}
                        </span>
                        <span data-dc-tpl="420" style={{"fontSize":"11px","color":"#8a867e","lineHeight":"1.3"}}>
                          {I(v1.b?.hint)}
                        </span>
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.noFree ? <>
                  {"\n              "}
                  <span data-dc-tpl="422" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45","textWrap":"pretty"}}>
                    Det du legger til, kan dras fritt i forhåndsvisningen. Dra i hjørnene for å endre størrelse.
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.ftextRows).map(($it1, $i1) => {
                  const v1 = { ...v, "t": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="424" style={css(`display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid ${v1.t?.border ?? ""}; border-radius:12px; background:#0c0c0c;`, "display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid {{ t.border }}; border-radius:12px; background:#0c0c0c;")}>
                      {"\n                "}
                      <div data-dc-tpl="425" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <button data-dc-tpl="426" onClick={v1.t?.onSelect} style={{"height":"26px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="427" onClick={v1.t?.onRemove} style={{"height":"26px","minHeight":"0","padding":"0 8px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className="scp4">
                          Fjern
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <textarea data-dc-tpl="428" value={val(v1.t?.text)} onChange={v1.t?.onText} rows="2" style={{"padding":"8px 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","lineHeight":"1.4","resize":"vertical","outline":"none"}} className="scp3" />
                      {"\n                "}
                      <div data-dc-tpl="429" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) 40px","gap":"10px","alignItems":"end"}}>
                        {"\n                  "}
                        <div data-dc-tpl="430" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="431" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="432" style={{"fontWeight":"600"}}>
                              Størrelse
                            </span>
                            <span data-dc-tpl="433" style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                              <input data-dc-tpl="434" type="text" inputMode="decimal" value={val(v1.t?.sz?.numVal)} onChange={v1.t?.sz?.onNum} onBlur={v1.t?.sz?.onNumBlur} onKeyDown={v1.t?.sz?.onNumKey} onFocus={v1.t?.sz?.onNumFocus} aria-label="Størrelse" style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                              <button data-dc-tpl="435" type="button" onClick={v1.t?.sz?.cycleUnit} title={v1.t?.sz?.unitTitle} aria-label={v1.t?.sz?.unitTitle} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                                {I(v1.t?.sz?.unit)}
                              </button>
                            </span>
                          </span>
                          <input data-dc-tpl="436" type="range" min="20" max="800" step="5" value={val(v1.t?.sizePct)} onChange={v1.t?.onSize} aria-label="Størrelse" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </div>
                        {"\n                  "}
                        <span data-dc-tpl="437" data-keep-color="1" title="Tekstfarge" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.t?.color ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:{{ t.color }}; overflow:hidden; cursor:pointer;")}>
                          <input data-dc-tpl="438" type="color" value={val(v1.t?.color)} onChange={v1.t?.onColor} aria-label="Tekstfarge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </span>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <div data-dc-tpl="439" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        {"\n                  "}
                        {list(v1.t?.actions).map(($it2, $i2) => {
                          const v2 = { ...v1, "a": $it2, $index: $i2 };
                          return <React.Fragment key={$i2}>
                            <button data-dc-tpl="441" onClick={v2.a?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:1px solid ${v2.a?.border ?? ""}; border-radius:999px; background:${v2.a?.bg ?? ""}; color:${v2.a?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:30px; min-height:0; padding:0 12px; border:1px solid {{ a.border }}; border-radius:999px; background:{{ a.bg }}; color:{{ a.color }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v2.a?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                {v.hasFqr ? <>
                  {"\n              "}
                  <div data-dc-tpl="443" style={css(`display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid ${v.fqrBorder ?? ""}; border-radius:12px; background:#0c0c0c;`, "display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid {{ fqrBorder }}; border-radius:12px; background:#0c0c0c;")}>
                    {"\n                "}
                    <div data-dc-tpl="444" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                      {"\n                  "}
                      <button data-dc-tpl="445" onClick={v.fqrSelect} style={{"height":"26px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                        QR-kode og kontakt
                      </button>
                      {"\n                  "}
                      <button data-dc-tpl="446" onClick={v.fqrRemove} title="Slett QR-koden fra sliden" style={{"height":"28px","minHeight":"0","padding":"0 12px","border":"1px solid #3a3a3a","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpc">
                        Slett QR-kode
                      </button>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="447" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="448" style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                        Hva skal koden åpne?
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="449" style={{"display":"flex","gap":"4px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","flexWrap":"wrap","width":"max-content","maxWidth":"100%"}}>
                        {"\n                    "}
                        {list(v.fqrKinds).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="451" onClick={v1.o?.onClick} style={css(`height:28px; min-height:0; padding:0 11px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:28px; min-height:0; padding:0 11px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                              {I(v1.o?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label data-dc-tpl="452" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span data-dc-tpl="453" style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                        {I(v.fqrValLabel)}
                      </span>
                      <input data-dc-tpl="454" value={val(v.fqrVal)} onChange={v.onFqrVal} placeholder={v.fqrValPh} inputmode={v.fqrValMode} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className="scp3" />
                    </label>
                    {"\n                "}
                    {v.fqrHasExtra ? <>
                      {"\n                  "}
                      <label data-dc-tpl="456" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span data-dc-tpl="457" style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          {I(v.fqrExtraLabel)}
                        </span>
                        <input data-dc-tpl="458" value={val(v.fqrExtra)} onChange={v.onFqrExtra} placeholder={v.fqrExtraPh} style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className="scp3" />
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span data-dc-tpl="459" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                      {I(v.fqrHint)}
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="460" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                      {"\n                  "}
                      <label data-dc-tpl="461" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span data-dc-tpl="462" style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          Tekst under
                        </span>
                        <input data-dc-tpl="463" value={val(v.fqrCaption)} onChange={v.onFqrCaption} placeholder="Skann meg" style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className="scp3" />
                      </label>
                      {"\n                  "}
                      <label data-dc-tpl="464" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                        <span data-dc-tpl="465" style={{"fontSize":"11.5px","fontWeight":"600","color":"#9d998f"}}>
                          Kontakt
                        </span>
                        <input data-dc-tpl="466" value={val(v.fqrContact)} onChange={v.onFqrContact} placeholder="E-post eller telefon" style={{"height":"36px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","outline":"none","minWidth":"0"}} className="scp3" />
                      </label>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label data-dc-tpl="467" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      <span data-dc-tpl="468" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span data-dc-tpl="469" style={{"fontWeight":"600"}}>
                          Størrelse
                        </span>
                        <span data-dc-tpl="470">
                          {I(v.fqrSize)}{" px"}
                        </span>
                      </span>
                      <input data-dc-tpl="471" type="range" min="60" max="1000" step="10" value={val(v.fqrSize)} onChange={v.onFqrSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    </label>
                    {"\n                "}
                    {v.fqrNoUrl ? <>
                      <span data-dc-tpl="473" style={{"fontSize":"11.5px","color":"#b3afa6"}}>
                        Viser en eksempelkode til du fyller inn feltet over.
                      </span>
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {list(v.pipRows).map(($it1, $i1) => {
                  const v1 = { ...v, "p": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="475" style={css(`display:grid; grid-template-columns:60px minmax(0,1fr); gap:12px; padding:10px; border:1px solid ${v1.p?.border ?? ""}; border-radius:12px; background:#0c0c0c;`, "display:grid; grid-template-columns:60px minmax(0,1fr); gap:12px; padding:10px; border:1px solid {{ p.border }}; border-radius:12px; background:#0c0c0c;")}>
                      {"\n                "}
                      <button data-dc-tpl="476" onClick={v1.p?.onSelect} title="Marker i forhåndsvisningen" aria-label="Marker bildet" style={css(`width:60px; height:60px; min-height:0; padding:0; border:0; border-radius:8px; background-color:#000; background-image:${v1.p?.thumb ?? ""}; background-size:cover; background-position:center; cursor:pointer;`, "width:60px; height:60px; min-height:0; padding:0; border:0; border-radius:8px; background-color:#000; background-image:{{ p.thumb }}; background-size:cover; background-position:center; cursor:pointer;")} />
                      {"\n                "}
                      <div data-dc-tpl="477" style={{"display":"flex","flexDirection":"column","gap":"8px","minWidth":"0"}}>
                        {"\n                  "}
                        <label data-dc-tpl="478" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="479" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="480" style={{"fontWeight":"600"}}>
                              Størrelse
                            </span>
                            <span data-dc-tpl="481">
                              {I(v1.p?.sizePct)}{" %"}
                            </span>
                          </span>
                          <input data-dc-tpl="482" type="range" min="3" max="150" step="1" value={val(v1.p?.sizePct)} onChange={v1.p?.onSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <label data-dc-tpl="483" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="484" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="485" style={{"fontWeight":"600"}}>
                              Runde hjørner
                            </span>
                            <span data-dc-tpl="486">
                              {I(v1.p?.radius)}{" px"}
                            </span>
                          </span>
                          <input data-dc-tpl="487" type="range" min="0" max="200" step="1" value={val(v1.p?.radius)} onChange={v1.p?.onRadius} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <label data-dc-tpl="488" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                          <span data-dc-tpl="489" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                            <span data-dc-tpl="490" style={{"fontWeight":"600"}}>
                              Synlighet
                            </span>
                            <span data-dc-tpl="491">
                              {I(v1.p?.opPct)}{" %"}
                            </span>
                          </span>
                          <input data-dc-tpl="492" type="range" min="10" max="100" step="1" value={val(v1.p?.opPct)} onChange={v1.p?.onOp} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        </label>
                        {"\n                  "}
                        <div data-dc-tpl="493" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                          {"\n                    "}
                          {list(v1.p?.actions).map(($it2, $i2) => {
                            const v2 = { ...v1, "a": $it2, $index: $i2 };
                            return <React.Fragment key={$i2}>
                              {"\n                      "}
                              <button data-dc-tpl="495" onClick={v2.a?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:1px solid ${v2.a?.border ?? ""}; border-radius:999px; background:${v2.a?.bg ?? ""}; color:${v2.a?.color ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "height:30px; min-height:0; padding:0 12px; border:1px solid {{ a.border }}; border-radius:999px; background:{{ a.bg }}; color:{{ a.color }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                                {I(v2.a?.label)}
                              </button>
                              {"\n                    "}
                            </React.Fragment>;
                          })}
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="496" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div data-dc-tpl="497" style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="498" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Video på sliden
                  </span>
                  {"\n              "}
                  <span data-dc-tpl="499" style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                    Maks 5 min
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                {v.noSlideVid ? <>
                  {"\n              "}
                  <button data-dc-tpl="501" onClick={v.pickSlideVid} style={{"alignSelf":"flex-start","height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp2">
                    <svg data-dc-tpl="502" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect data-dc-tpl="503" x="2" y="5" width="14" height="14" rx="2" />
                      <path data-dc-tpl="504" d="m16 10 6-3v10l-6-3" />
                    </svg>
                    <span data-dc-tpl="505">
                      Legg til video…
                    </span>
                  </button>
                  {"\n              "}
                  <span data-dc-tpl="506" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                    Videoen vises i stedet for bakgrunnsbildet, og sliden varer like lenge som videoen.
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasSlideVid ? <>
                  {"\n              "}
                  <div data-dc-tpl="508" style={{"display":"flex","alignItems":"center","gap":"10px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <svg data-dc-tpl="509" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e9e7e2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{"flex":"0 0 auto"}}>
                      <rect data-dc-tpl="510" x="2" y="5" width="14" height="14" rx="2" />
                      <path data-dc-tpl="511" d="m16 10 6-3v10l-6-3" />
                    </svg>
                    {"\n                "}
                    <div data-dc-tpl="512" style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"2px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="513" style={{"fontSize":"13px","fontWeight":"600","color":"#f3f1ec","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
                        {I(v.slideVidName)}
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="514" style={{"fontSize":"11.5px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                        {I(v.slideVidLen)}{" · sliden varer like lenge"}
                      </span>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button data-dc-tpl="515" onClick={v.pickSlideVid} style={{"flex":"0 0 auto","height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                      Bytt
                    </button>
                    {"\n                "}
                    <button data-dc-tpl="516" onClick={v.removeSlideVid} style={{"flex":"0 0 auto","height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      Fjern
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="517" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"8px"}}>
                    {"\n                "}
                    <div data-dc-tpl="518" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="519" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Lyd fra videoen
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="520" style={{"display":"flex","gap":"4px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d"}}>
                        {"\n                    "}
                        <button data-dc-tpl="521" onClick={v.vidSoundOn} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidSoundOnBg ?? ""}; color:${v.vidSoundOnFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:{{ vidSoundOnBg }}; color:{{ vidSoundOnFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          På
                        </button>
                        {"\n                    "}
                        <button data-dc-tpl="522" onClick={v.vidSoundOff} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidSoundOffBg ?? ""}; color:${v.vidSoundOffFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:{{ vidSoundOffBg }}; color:{{ vidSoundOffFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          Av
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="523" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="524" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Loop-musikken
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="525" style={{"display":"flex","gap":"4px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d"}}>
                        {"\n                    "}
                        <button data-dc-tpl="526" onClick={v.vidMusicOn} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidMusicOnBg ?? ""}; color:${v.vidMusicOnFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:{{ vidMusicOnBg }}; color:{{ vidMusicOnFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          Spill
                        </button>
                        {"\n                    "}
                        <button data-dc-tpl="527" onClick={v.vidMusicOff} style={css(`flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:${v.vidMusicOffBg ?? ""}; color:${v.vidMusicOffFg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;`, "flex:1 1 0; height:28px; min-height:0; padding:0 8px; border:0; border-radius:999px; background:{{ vidMusicOffBg }}; color:{{ vidMusicOffFg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer;")}>
                          Demp
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.vidSoundIsOn ? <>
                    {"\n                "}
                    <label data-dc-tpl="529" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="530" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="531" style={{"fontWeight":"600"}}>
                          Videovolum
                        </span>
                        <span data-dc-tpl="532">
                          {I(v.vidVolPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="533" type="range" min="0" max="100" step="5" value={val(v.vidVolPct)} onChange={v.onVidVol} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  <span data-dc-tpl="534" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                    {I(v.vidAudioNote)}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="535" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="536" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  {I(v.bgHeading)}
                </span>
                {"\n            "}
                <div data-dc-tpl="537" style={css(`position:relative; width:${v.bgBoxW ?? ""}; aspect-ratio:${v.bgAspect ?? ""}; border-radius:8px; border:1px solid #2b2b2b; background-color:#000; background-image:${v.selBgCss ?? ""}; background-size:cover; background-position:${v.bgPos ?? ""}; overflow:hidden;`, "position:relative; width:{{ bgBoxW }}; aspect-ratio:{{ bgAspect }}; border-radius:8px; border:1px solid #2b2b2b; background-color:#000; background-image:{{ selBgCss }}; background-size:cover; background-position:{{ bgPos }}; overflow:hidden;")}>
                  {"\n              "}
                  {v.noBg ? <>
                    {"\n                "}
                    <span data-dc-tpl="539" style={{"position":"absolute","left":"10px","bottom":"8px","fontSize":"11.5px","color":"#9d998f","pointerEvents":"none"}}>
                      Ingen bilde – grunnvideoen vises
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n\n            "}
                {v.bgSourceNote ? <span data-ch-bg-source="1" style={{"fontSize":"12px","color":"#9d998f"}}>{I(v.bgSourceNote)}</span> : null}
                <div data-dc-tpl="540" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="541" onClick={v.pickImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    {I(v.pickBgLabel)}
                  </button>
                  {"\n              "}
                  <button onClick={v.pickBgShared} data-ch-shared-bg="1" style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Fellesmappe
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="542" onClick={v.pickSharedImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Fra delt mappe
                  </button>
                  {"\n              "}
                  {v.hasBg ? <>
                    {"\n                "}
                    <button data-dc-tpl="544" onClick={v.editImg} title="Flytt utsnittet eller beskjær bildet" style={{"height":"34px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp8">
                      <svg data-dc-tpl="545" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path data-dc-tpl="546" d="M6 2v14a2 2 0 0 0 2 2h14" />
                        <path data-dc-tpl="547" d="M18 22V8a2 2 0 0 0-2-2H2" />
                      </svg>
                      <span data-dc-tpl="548">
                        Beskjær / flytt bilde
                      </span>
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.hasRuleOpts ? <>
                    {"\n                "}
                    <button data-dc-tpl="550" onClick={v.toggleRulePick} aria-expanded={v.rulePickOpen} style={css(`height:34px; padding:0 14px; border:1px solid ${v.rulePickBorder ?? ""}; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "height:34px; padding:0 14px; border:1px solid {{ rulePickBorder }}; border-radius:999px; background:#121212; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")} className="scp1">
                      {I(v.rulePickLabel)}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.canRemoveBg ? <>
                    {"\n                "}
                    <button data-dc-tpl="552" onClick={v.removeImg} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      {I(v.removeBgLabel)}
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.ruleLinked ? <>
                  {"\n              "}
                  <div data-dc-tpl="554" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","padding":"8px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <span data-dc-tpl="555" style={{"display":"flex","alignItems":"baseline","gap":"6px","minWidth":"0","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="556">
                        Koblet til fast bilde
                      </span>
                      <span data-dc-tpl="557" style={{"color":"#f3f1ec","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v.ruleLinkedName)}
                      </span>
                    </span>
                    {"\n                "}
                    <button data-dc-tpl="558" onClick={v.unlinkRule} style={{"flex":"0 0 auto","border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpa">
                      Fjern kobling
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.rulePickOpen ? <>
                  {"\n              "}
                  <div data-dc-tpl="560" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <span data-dc-tpl="561" style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                      Velg hvilket fast bilde sliden hører til. Når du bytter det faste bildet, byttes det her også.
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="562" style={css(`display:grid; grid-template-columns:${v.galCols ?? ""}; gap:8px;`, "display:grid; grid-template-columns:{{ galCols }}; gap:8px;")}>
                      {"\n                  "}
                      {list(v.rulePickList).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <button data-dc-tpl="564" onClick={v1.o?.pick} title={v1.o?.name} style={{"display":"flex","flexDirection":"column","gap":"4px","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","minWidth":"0","textAlign":"left"}}>
                            {"\n                      "}
                            <span data-dc-tpl="565" style={css(`display:block; width:100%; aspect-ratio:${v1.galAspect ?? ""}; border:2px solid ${v1.o?.border ?? ""}; border-radius:5px; background-color:#000; background-image:${v1.o?.thumb ?? ""}; background-size:cover; background-position:center;`, "display:block; width:100%; aspect-ratio:{{ galAspect }}; border:2px solid {{ o.border }}; border-radius:5px; background-color:#000; background-image:{{ o.thumb }}; background-size:cover; background-position:center;")} />
                            {"\n                      "}
                            <span data-dc-tpl="566" style={{"fontSize":"11px","fontWeight":"600","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                              {I(v1.o?.name)}
                            </span>
                            {"\n                    "}
                          </button>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div data-dc-tpl="567" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <button data-dc-tpl="568" onClick={v.fillToggleBox} aria-expanded={v.fillOpenBox} style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","width":"100%","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","cursor":"pointer","textAlign":"left"}}>
                    {"\n                "}
                    <span data-dc-tpl="569" style={{"display":"flex","alignItems":"center","gap":"10px","minWidth":"0"}}>
                      {"\n                  "}
                      <span data-dc-tpl="570" data-keep-color="1" style={css(`flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "flex:0 0 auto; width:28px; height:20px; border-radius:5px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                      {"\n                  "}
                      <span data-dc-tpl="571" style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                        Bakgrunnsfarge
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="572" style={{"fontSize":"11.5px","color":"#9d998f","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                        {I(v.fillSummary)}
                      </span>
                      {"\n                "}
                    </span>
                    {"\n                "}
                    <span data-dc-tpl="573" style={{"flex":"0 0 auto","fontSize":"13px","color":"#9d998f"}}>
                      {I(v.fillArrow)}
                    </span>
                    {"\n              "}
                  </button>
                  {"\n              "}
                  {v.fillOpenBox ? <>
                    {"\n              "}
                    <span data-dc-tpl="575" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f","paddingTop":"4px"}}>
                      Type
                    </span>
                    {"\n              "}
                    <div data-dc-tpl="576" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(92px, 1fr))","gap":"5px"}}>
                      {"\n                "}
                      {list(v.fillModes).map(($it1, $i1) => {
                        const v1 = { ...v, "m": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                  "}
                          <button data-dc-tpl="578" onClick={v1.m?.onClick} style={css(`height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:${v1.m?.bg ?? ""}; color:${v1.m?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:30px; min-height:0; padding:0 8px; border:1px solid #2b2b2b; border-radius:8px; background:{{ m.bg }}; color:{{ m.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                            {I(v1.m?.label)}
                          </button>
                          {"\n                "}
                        </React.Fragment>;
                      })}
                      {"\n              "}
                    </div>
                    {"\n              "}
                    {v.fillOn ? <>
                      {"\n                "}
                      <div data-dc-tpl="580" data-keep-color="1" style={css(`height:44px; border-radius:8px; border:1px solid #2b2b2b; background:${v.fillPreview ?? ""};`, "height:44px; border-radius:8px; border:1px solid #2b2b2b; background:{{ fillPreview }};")} />
                      {"\n                "}
                      {v.fillSolidOnly ? <>
                        {"\n                  "}
                        <div data-dc-tpl="582" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                          <label data-dc-tpl="583" data-keep-color="1" title="Farge" style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v.fillSolidC ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ fillSolidC }}; overflow:hidden; cursor:pointer;")}>
                            <input data-dc-tpl="584" type="color" value={val(v.fillSolidC)} onChange={v.onFillSolid} aria-label="Farge" style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          </label>
                          <span data-dc-tpl="585" style={{"fontSize":"12px","color":"#9d998f"}}>
                            Trykk på fargen for å endre den
                          </span>
                          <button data-dc-tpl="586" onClick={v.fillHarmonyOne} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"marginLeft":"auto","flex":"0 0 auto","width":"28px","height":"28px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpd">
                            <span data-dc-tpl="587" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                              <span data-dc-tpl="588" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                              <span data-dc-tpl="589" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                              <span data-dc-tpl="590" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                              <span data-dc-tpl="591" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                            </span>
                          </button>
                        </div>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      {v.fillMulti ? <>
                        {"\n                  "}
                        <div data-dc-tpl="593" style={{"display":"flex","flexDirection":"column","gap":"6px","paddingTop":"10px","borderTop":"1px solid #262626"}}>
                          {"\n                    "}
                          <span data-dc-tpl="594" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                            Gradientfarger
                          </span>
                          {"\n                    "}
                          {list(v.fillStopsList).map(($it1, $i1) => {
                            const v1 = { ...v, "q": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              {"\n                      "}
                              <div data-dc-tpl="596" style={{"display":"grid","gridTemplateColumns":"22px 30px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px"}}>
                                {"\n                        "}
                                <div data-dc-tpl="597" style={{"display":"flex","flexDirection":"column","gap":"1px"}}>
                                  {"\n                          "}
                                  <button data-dc-tpl="598" onClick={v1.q?.up} title="Flytt opp i rekkefølgen" aria-label="Flytt fargen opp" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.upOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.upOp }};")}>
                                    ▲
                                  </button>
                                  {"\n                          "}
                                  <button data-dc-tpl="599" onClick={v1.q?.down} title="Flytt ned i rekkefølgen" aria-label="Flytt fargen ned" style={css(`width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:${v1.q?.downOp ?? ""};`, "width:22px; height:15px; min-height:0; padding:0; border:0; border-radius:4px; background:#1a1a1a; color:#f3f1ec; font:inherit; font-size:9px; line-height:1; cursor:pointer; opacity:{{ q.downOp }};")}>
                                    ▼
                                  </button>
                                  {"\n                        "}
                                </div>
                                {"\n                        "}
                                <label data-dc-tpl="600" data-keep-color="1" title={`Farge ${v1.q?.num ?? ""}`} style={css(`position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:${v1.q?.c ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:30px; height:30px; flex:0 0 auto; border-radius:8px; border:1px solid #3a3a3a; background:{{ q.c }}; overflow:hidden; cursor:pointer;")}>
                                  <input data-dc-tpl="601" type="color" value={val(v1.q?.c)} onChange={v1.q?.onColor} aria-label={`Farge ${v1.q?.num ?? ""}`} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","minHeight":"0","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                                </label>
                                {"\n                        "}
                                {v1.fillPosOn ? <>
                                  <input data-dc-tpl="603" type="range" min="0" max="100" step="1" value={val(v1.q?.pct)} onChange={v1.q?.onPos} aria-label={`Posisjon for farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                </> : null}
                                {"\n                        "}
                                <span data-dc-tpl="604" style={{"fontSize":"11.5px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                  {I(v1.q?.pct)}%
                                </span>
                                {"\n                        "}
                                {v1.q?.canDel ? <>
                                  <button data-dc-tpl="606" onClick={v1.q?.del} title="Fjern farge" aria-label="Fjern farge" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scpa">
                                    ×
                                  </button>
                                </> : null}
                                {"\n                      "}
                              </div>
                              {"\n                      "}
                              <div data-dc-tpl="607" style={{"display":"grid","gridTemplateColumns":"60px minmax(0,1fr) 38px 24px","alignItems":"center","gap":"8px","margin":"-2px 0 6px 30px"}}>
                                {"\n                        "}
                                <span data-dc-tpl="608" style={{"fontSize":"11px","color":"#6f6b64"}}>
                                  Mengde
                                </span>
                                {"\n                        "}
                                <input data-dc-tpl="609" type="range" min="0" max="100" step="1" value={val(v1.q?.wPct)} onChange={v1.q?.onW} aria-label={`Mengde av farge ${v1.q?.num ?? ""}`} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                {"\n                        "}
                                <span data-dc-tpl="610" style={{"fontSize":"11px","color":"#6f6b64","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                  {I(v1.q?.wPct)}%
                                </span>
                                {"\n                        "}
                                <span data-dc-tpl="611" />
                                {"\n                      "}
                              </div>
                              {"\n                      "}
                              {v1.q?.notLast ? <>
                                {"\n                        "}
                                <div data-dc-tpl="613" style={{"display":"flex","alignItems":"center","gap":"8px","margin":"-4px 0 8px 30px"}}>
                                  {"\n                          "}
                                  <button data-dc-tpl="614" onClick={v1.q?.toggleHard} title="Skarp eller myk overgang til neste farge" style={css(`height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.q?.hardBg ?? ""}; color:${v1.q?.hardFg ?? ""}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;`, "height:24px; min-height:0; padding:0 10px; border:1px solid #2b2b2b; border-radius:999px; background:{{ q.hardBg }}; color:{{ q.hardFg }}; font:inherit; font-size:11px; font-weight:600; cursor:pointer;")}>
                                    Skarp kant til neste
                                  </button>
                                  {"\n                        "}
                                </div>
                                {"\n                      "}
                              </> : null}
                              {"\n                    "}
                            </React.Fragment>;
                          })}
                          {"\n                    "}
                          <div data-dc-tpl="615" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                            {"\n                      "}
                            {v.fillCanAdd ? <>
                              <button data-dc-tpl="617" onClick={v.fillAdd} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                                + Legg til farge
                              </button>
                            </> : null}
                            {"\n                      "}
                            <button data-dc-tpl="618" onClick={v.fillHarmony} title="Tilfeldige farger som passer" aria-label="Tilfeldige farger som passer" style={{"width":"30px","height":"30px","minHeight":"0","padding":"0","display":"flex","alignItems":"center","justifyContent":"center","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","cursor":"pointer"}} className="scpd">
                              <span data-dc-tpl="619" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                <span data-dc-tpl="620" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                <span data-dc-tpl="621" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                <span data-dc-tpl="622" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                <span data-dc-tpl="623" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                              </span>
                            </button>
                            {"\n                      "}
                            <button data-dc-tpl="624" onClick={v.fillReverse} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                              ⇄ Snu
                            </button>
                            {"\n                      "}
                            <button data-dc-tpl="625" onClick={v.fillEven} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
                              Fordel jevnt
                            </button>
                            {"\n                    "}
                          </div>
                          {"\n                  "}
                        </div>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      {v.fillAngled ? <>
                        {"\n                  "}
                        <label data-dc-tpl="627" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <span data-dc-tpl="628" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="629" style={{"fontWeight":"600"}}>
                              Retning
                            </span>
                            <span data-dc-tpl="630" style={{"fontVariantNumeric":"tabular-nums"}}>
                              {I(v.fillAngle)}°
                            </span>
                          </span>
                          {"\n                    "}
                          <input data-dc-tpl="631" type="range" min="0" max="360" step="1" value={val(v.fillAngle)} onChange={v.onFillAngle} aria-label="Retning" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                  "}
                        </label>
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      {v.fillMulti ? <>
                        {"\n                  "}
                        <div data-dc-tpl="633" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <span data-dc-tpl="634" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="635" style={{"fontWeight":"600"}}>
                              Overgang
                            </span>
                            <span data-dc-tpl="636" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                              <span data-dc-tpl="637" style={{"fontVariantNumeric":"tabular-nums"}}>
                                {I(v.fillSoft)}{" %"}
                              </span>
                              <button data-dc-tpl="638" onClick={v.fillSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                Standard
                              </button>
                            </span>
                          </span>
                          {"\n                    "}
                          <input data-dc-tpl="639" type="range" min="0" max="100" step="1" value={val(v.fillSoft)} onChange={v.onFillSoft} aria-label="Overgang" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                          <span data-dc-tpl="640" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                            <span data-dc-tpl="641">
                              Skarp kant
                            </span>
                            <span data-dc-tpl="642">
                              Myk, diffus
                            </span>
                          </span>
                          {"\n                  "}
                        </div>
                        {"\n                  "}
                        <div data-dc-tpl="643" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                    "}
                          <span data-dc-tpl="644" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="645" style={{"fontWeight":"600"}}>
                              Skarphet
                            </span>
                            <span data-dc-tpl="646" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                              <span data-dc-tpl="647" style={{"fontVariantNumeric":"tabular-nums"}}>
                                {I(v.fillSharp)}{" %"}
                              </span>
                              <button data-dc-tpl="648" onClick={v.fillSharp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                                0 %
                              </button>
                            </span>
                          </span>
                          {"\n                    "}
                          <input data-dc-tpl="649" type="range" min="0" max="100" step="1" value={val(v.fillSharp)} onChange={v.onFillSharp} aria-label="Skarphet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                          <span data-dc-tpl="650" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                            <span data-dc-tpl="651">
                              Myke overganger
                            </span>
                            <span data-dc-tpl="652">
                              Skarpe kanter
                            </span>
                          </span>
                          {"\n                  "}
                        </div>
                        {"\n                  "}
                        {v.fillRepOn ? <>
                          {"\n                    "}
                          <label data-dc-tpl="654" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            {"\n                      "}
                            <span data-dc-tpl="655" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span data-dc-tpl="656" style={{"fontWeight":"600"}}>
                                Antall gjentakelser
                              </span>
                              <span data-dc-tpl="657" style={{"fontVariantNumeric":"tabular-nums"}}>
                                {I(v.fillRep)}
                              </span>
                            </span>
                            {"\n                      "}
                            <input data-dc-tpl="658" type="range" min="1" max="20" step="1" value={val(v.fillRep)} onChange={v.onFillRep} aria-label="Antall gjentakelser" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                            {"\n                    "}
                          </label>
                          {"\n                  "}
                        </> : null}
                        {"\n                "}
                      </> : null}
                      {"\n                "}
                      <div data-dc-tpl="659" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        <span data-dc-tpl="660" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5"}}>
                          {I(v.fillNote)}
                        </span>
                        {v.fillMoved ? <>
                          <button data-dc-tpl="662" onClick={v.fillCenter} style={{"flex":"0 0 auto","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                            Midtstill
                          </button>
                        </> : null}
                      </div>
                      {"\n              "}
                    </> : null}
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                {v.panShown ? <>
                  {"\n              "}
                  <div data-dc-tpl="664" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                    {"\n                "}
                    <div data-dc-tpl="665" style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="666" style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                        Flytt utsnittet
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="667" style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                        {"\n                  "}
                        <button data-dc-tpl="668" onClick={v.panReset} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                          Midtstill
                        </button>
                        {"\n                  "}
                        <button data-dc-tpl="669" onClick={v.panToggle} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"11.5px","fontWeight":"700","cursor":"pointer"}} className="scp9">
                          Ferdig
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.panCanX ? <>
                      {"\n                  "}
                      <label data-dc-tpl="671" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <span data-dc-tpl="672" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          Venstre
                        </span>
                        {"\n                    "}
                        <input data-dc-tpl="673" type="range" min="0" max="100" step="1" value={val(v.panXPct)} onChange={v.onPanX} aria-label="Flytt bildet vannrett" style={{"flex":"1 1 auto","minWidth":"0","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span data-dc-tpl="674" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          Høyre
                        </span>
                        {"\n                  "}
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    {v.panCanY ? <>
                      {"\n                  "}
                      <label data-dc-tpl="676" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <span data-dc-tpl="677" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          Topp
                        </span>
                        {"\n                    "}
                        <input data-dc-tpl="678" type="range" min="0" max="100" step="1" value={val(v.panYPct)} onChange={v.onPanY} aria-label="Flytt bildet loddrett" style={{"flex":"1 1 auto","minWidth":"0","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span data-dc-tpl="679" style={{"flex":"0 0 auto","fontSize":"11.5px","color":"#9d998f"}}>
                          Bunn
                        </span>
                        {"\n                  "}
                      </label>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span data-dc-tpl="680" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.5","textWrap":"pretty"}}>
                      {I(v.panHint)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasPortNote ? <>
                  {"\n              "}
                  <span data-dc-tpl="682" style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty","marginTop":"-4px"}}>
                    {I(v.portNote)}
                  </span>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.isDayBg ? <>
                  {"\n              "}
                  <div data-dc-tpl="684" style={{"display":"flex","gap":"8px","alignItems":"flex-start","padding":"9px 11px","borderRadius":"8px","background":"#121212","fontSize":"12px","lineHeight":"1.5","color":"#c9c5bc"}}>
                    {"\n                "}
                    <div data-dc-tpl="685" style={{"width":"3px","alignSelf":"stretch","background":"#e9e7e2","borderRadius":"2px","flex":"0 0 auto"}} />
                    {"\n                "}
                    <span data-dc-tpl="686" style={{"textWrap":"pretty"}}>
                      {I(v.titleImgNote)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasBg ? <>
                  {"\n              "}
                  <label data-dc-tpl="688" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    {"\n                "}
                    <span data-dc-tpl="689" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="690" style={{"fontWeight":"600"}}>
                        Bildestyrke
                      </span>
                      <span data-dc-tpl="691">
                        {I(v.bgOpacityPct)}{" %"}
                      </span>
                    </span>
                    {"\n                "}
                    <input data-dc-tpl="692" type="range" min="10" max="100" step="5" value={val(v.bgOpacityPct)} onChange={v.onBgOpacity} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasBg ? <>
                  {"\n              "}
                  <div data-dc-tpl="694" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span data-dc-tpl="695" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Fargefilter på denne sliden
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="696" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.selTintOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="698" onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.selTintCustom ? <>
                      {"\n                  "}
                      <div data-dc-tpl="700" style={{"display":"grid","gridTemplateColumns":"40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                        {"\n                    "}
                        <label data-dc-tpl="701" data-keep-color="1" style={css(`position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:${v.selTint ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:{{ selTint }}; overflow:hidden; cursor:pointer;")} title="Velg farge">
                          <input data-dc-tpl="702" type="color" value={val(v.selTint)} onChange={v.onSelTint} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </label>
                        {"\n                    "}
                        <input data-dc-tpl="703" type="range" min="0" max="100" step="1" value={val(v.selTintAmtPct)} onChange={v.onSelTintAmt} aria-label="Styrke" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                    "}
                        <span data-dc-tpl="704" style={{"fontSize":"12px","color":"#9d998f","textAlign":"right"}}>
                          {I(v.selTintAmtPct)}%
                        </span>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n                "}
                    <span data-dc-tpl="705" style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                      {I(v.selTintNote)}
                    </span>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div data-dc-tpl="706" style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"4px 12px","border":"1px solid #2b2b2b","borderRadius":"12px","background":"#0c0c0c"}}>
                  {"\n              "}
                  <div data-dc-tpl="707" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                    {"\n                "}
                    <button data-dc-tpl="708" onClick={v.toggleSlideStyle} aria-expanded={v.slideStyleAria} style={{"flex":"1","display":"flex","alignItems":"center","gap":"10px","height":"44px","padding":"0","border":"0","background":"transparent","color":"#f3f1ec","font":"inherit","textAlign":"left","cursor":"pointer"}}>
                      {"\n                  "}
                      <span data-dc-tpl="709" style={{"fontSize":"13px","fontWeight":"700"}}>
                        Stil og effekter for denne sliden
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="710" style={{"fontSize":"11.5px","color":"#8a867e"}}>
                        {I(v.slideStyleSummary)}
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="711" style={{"marginLeft":"auto","color":"#8a867e","fontSize":"11px"}}>
                        {I(v.slideStyleArrow)}
                      </span>
                      {"\n                "}
                    </button>
                    {"\n                "}
                    {v.selOvAny ? <>
                      {"\n                  "}
                      <button data-dc-tpl="713" onClick={v.selOvReset} style={{"height":"26px","minHeight":"0","padding":"0 8px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className="scp4">
                        Tilbakestill
                      </button>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.slideStyleOpen ? <>
                    {"\n              "}
                    <div data-dc-tpl="715" style={{"display":"flex","flexDirection":"column","gap":"12px","paddingBottom":"12px"}}>
                      {"\n          "}
                      <div data-dc-tpl="716" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","flexWrap":"wrap","paddingBottom":"12px","borderBottom":"1px solid #1f1f1f"}}>
                        {"\n            "}
                        <span data-dc-tpl="717" style={{"fontSize":"12.5px","fontWeight":"600","color":"#f3f1ec"}}>
                          Fargepaneler på denne sliden
                        </span>
                        {"\n            "}
                        <div data-dc-tpl="718" style={{"display":"flex","gap":"4px","padding":"3px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px"}}>
                          {"\n              "}
                          {list(v.selPanelOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button data-dc-tpl="720" onClick={v1.o?.onClick} style={css(`height:28px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:28px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                                {I(v1.o?.label)}
                              </button>
                            </React.Fragment>;
                          })}
                          {"\n            "}
                        </div>
                        {"\n            "}
                        {v.selPanelsActive ? <>
                          {"\n              "}
                          <button data-dc-tpl="722" onClick={v.togglePanelEdit} style={css(`flex-basis:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; height:38px; padding:0 14px 0 8px; border:1px solid ${v.panelEditBorder ?? ""}; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "flex-basis:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; height:38px; padding:0 14px 0 8px; border:1px solid {{ panelEditBorder }}; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")} className="scp1">
                            {"\n                "}
                            <span data-dc-tpl="723" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                              <span data-dc-tpl="724" style={{"display":"flex","gap":"3px"}}>
                                {list(v.selPanelDots).map(($it1, $i1) => {
                                  const v1 = { ...v, "d": $it1, $index: $i1 };
                                  return <React.Fragment key={$i1}>
                                    <span data-dc-tpl="726" data-keep-color="1" style={css(`width:14px; height:14px; border-radius:4px; background:${v1.d?.color ?? ""}; opacity:${v1.d?.op ?? ""}; border:1px solid rgba(255,255,255,0.15);`, "width:14px; height:14px; border-radius:4px; background:{{ d.color }}; opacity:{{ d.op }}; border:1px solid rgba(255,255,255,0.15);")} />
                                  </React.Fragment>;
                                })}
                              </span>
                              <span data-dc-tpl="727">
                                Farger på panelene
                              </span>
                            </span>
                            {"\n                "}
                            <span data-dc-tpl="728" style={{"color":"#8a867e"}}>
                              {I(v.panelEditArrow)}
                            </span>
                            {"\n              "}
                          </button>
                          {"\n            "}
                        </> : null}
                        {"\n            "}
                        {v.panelEditOpen ? <>
                          {"\n              "}
                          <div data-dc-tpl="730" style={{"flexBasis":"100%","display":"flex","flexDirection":"column","gap":"10px","paddingTop":"4px"}}>
                            {"\n                "}
                            <div data-dc-tpl="731" style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                              {"\n                  "}
                              <span data-dc-tpl="732" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                                Bakgrunn
                              </span>
                              {"\n                  "}
                              <label data-dc-tpl="733" data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v.selPanelBg ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:{{ selPanelBg }}; overflow:hidden; cursor:pointer;")} title="Velg farge">
                                <input data-dc-tpl="734" type="color" value={val(v.selPanelBg)} onChange={v.onSelPanelBg} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                              </label>
                              {"\n                  "}
                              <span data-dc-tpl="735" style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                                Fargen bak panelene
                              </span>
                              {"\n                  "}
                              <span data-dc-tpl="736" />
                              {"\n                "}
                            </div>
                            {"\n                "}
                            {list(v.selPanelRows).map(($it1, $i1) => {
                              const v1 = { ...v, "p": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                {"\n                  "}
                                <div data-dc-tpl="738" style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                                  {"\n                    "}
                                  <span data-dc-tpl="739" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                                    {I(v1.p?.label)}
                                  </span>
                                  {"\n                    "}
                                  <label data-dc-tpl="740" data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.p?.color ?? ""}; opacity:${v1.p?.swatchOpacity ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:{{ p.color }}; opacity:{{ p.swatchOpacity }}; overflow:hidden; cursor:pointer;")} title="Velg farge">
                                    <input data-dc-tpl="741" type="color" value={val(v1.p?.color)} onChange={v1.p?.onColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                                  </label>
                                  {"\n                    "}
                                  <input data-dc-tpl="742" type="range" min="0" max="100" step="1" value={val(v1.p?.alphaPct)} onChange={v1.p?.onAlpha} aria-label="Gjennomsiktighet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                                  {"\n                    "}
                                  <span data-dc-tpl="743" style={{"fontSize":"12px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                                    {I(v1.p?.alphaPct)}%
                                  </span>
                                  {"\n                  "}
                                </div>
                                {"\n                "}
                              </React.Fragment>;
                            })}
                            {"\n                "}
                            <button data-dc-tpl="744" onClick={v.selPanelRandom} style={{"alignSelf":"flex-start","display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scpd">
                              <span data-dc-tpl="745" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                                <span data-dc-tpl="746" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                                <span data-dc-tpl="747" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                                <span data-dc-tpl="748" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                                <span data-dc-tpl="749" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                              </span>
                              <span data-dc-tpl="750">
                                Tilfeldige farger
                              </span>
                            </button>
                            {"\n                "}
                            <div data-dc-tpl="751" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px","flexWrap":"wrap"}}>
                              {"\n                  "}
                              <span data-dc-tpl="752" style={{"fontSize":"11.5px","color":"#6f6b64"}}>
                                {I(v.selPanelNote)}
                              </span>
                              {"\n                  "}
                              {v.selPanelCustom ? <>
                                {"\n                    "}
                                <button data-dc-tpl="754" onClick={v.selPanelReset} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                                  Bruk standardfarger
                                </button>
                                {"\n                  "}
                              </> : null}
                              {"\n                "}
                            </div>
                            {"\n              "}
                          </div>
                          {"\n            "}
                        </> : null}
                        {"\n          "}
                      </div>
                      {"\n              "}
                      <div data-dc-tpl="755" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(150px, 1fr))","gap":"10px"}}>
                        {"\n                "}
                        {list(v.selOvRows).map(($it1, $i1) => {
                          const v1 = { ...v, "r": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                  "}
                            <label data-dc-tpl="757" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
                              {"\n                    "}
                              <span data-dc-tpl="758" style={css(`font-size:11.5px; font-weight:600; color:${v1.r?.labelColor ?? ""};`, "font-size:11.5px; font-weight:600; color:{{ r.labelColor }};")}>
                                {I(v1.r?.label)}
                              </span>
                              {"\n                    "}
                              <select data-dc-tpl="759" value={val(v1.r?.value)} onChange={v1.r?.onChange} style={css(`height:36px; padding:0 8px; border:1px solid ${v1.r?.border ?? ""}; border-radius:8px; background:#000; color:#f3f1ec; font:inherit; font-size:13px; outline:none; cursor:pointer; min-width:0;`, "height:36px; padding:0 8px; border:1px solid {{ r.border }}; border-radius:8px; background:#000; color:#f3f1ec; font:inherit; font-size:13px; outline:none; cursor:pointer; min-width:0;")}>
                                {"\n                      "}
                                {list(v1.r?.options).map(($it2, $i2) => {
                                  const v2 = { ...v1, "op": $it2, $index: $i2 };
                                  return <React.Fragment key={$i2}>
                                    <option data-dc-tpl="761" value={val(v2.op?.v)}>
                                      {I(v2.op?.l)}
                                    </option>
                                  </React.Fragment>;
                                })}
                                {"\n                    "}
                              </select>
                              {"\n                  "}
                            </label>
                            {"\n                "}
                          </React.Fragment>;
                        })}
                        {"\n              "}
                      </div>
                      {"\n              "}
                      <span data-dc-tpl="762" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                        «Som standard» følger innstillingene under Effekter. Valg du gjør her, gjelder bare denne sliden.
                      </span>
                      {"\n              "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <label data-dc-tpl="763" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="764" type="checkbox" checked={chk(v.selVigOn)} onChange={v.onSelVig} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="765">
                    Vignett på denne sliden
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div data-dc-tpl="766" style={css(`display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:${v.vigCtlOpacity ?? ""};`, "display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:{{ vigCtlOpacity }};")}>
                  {"\n              "}
                  <button data-dc-tpl="767" onClick={v.openVigEd} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp8">
                    <svg data-dc-tpl="768" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <circle data-dc-tpl="769" cx="12" cy="12" r="9" />
                      <circle data-dc-tpl="770" cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    </svg>
                    <span data-dc-tpl="771">
                      Rediger vignett…
                    </span>
                  </button>
                  {"\n              "}
                  <span data-dc-tpl="772" style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                    {I(v.vigSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="773" style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="774" onClick={v.openOvEd} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp8">
                    <svg data-dc-tpl="775" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle data-dc-tpl="776" cx="7" cy="8" r="2.5" />
                      <circle data-dc-tpl="777" cx="16" cy="6" r="1.8" />
                      <circle data-dc-tpl="778" cx="14" cy="15" r="3" />
                      <circle data-dc-tpl="779" cx="6" cy="17" r="1.5" />
                    </svg>
                    <span data-dc-tpl="780">
                      Rediger overlegg…
                    </span>
                  </button>
                  {"\n              "}
                  <span data-dc-tpl="781" style={{"fontSize":"12px","color":"#9d998f","textWrap":"pretty"}}>
                    {I(v.ovSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="782" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label data-dc-tpl="783" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="784" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span data-dc-tpl="785" style={{"fontWeight":"600"}}>
                      Varighet
                    </span>
                    <span data-dc-tpl="786">
                      {I(v.selDurLabel)}
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="787" type="range" min="2" max="15" step="0.5" value={val(v.selDur)} onChange={v.onSelDur} disabled={v.selDurLocked} style={css(`width:100%; accent-color:#e9e7e2; opacity:${v.selDurOp ?? ""};`, "width:100%; accent-color:#e9e7e2; opacity:{{ selDurOp }};")} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label data-dc-tpl="788" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="789" type="checkbox" checked={chk(v.selVisible)} onChange={v.onVisible} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="790">
                    Vis i loopen
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                {v.hasLogo ? <>
                  {"\n              "}
                  <label data-dc-tpl="792" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                    {"\n                "}
                    <input data-dc-tpl="793" type="checkbox" checked={chk(v.selShowLogo)} onChange={v.onSelShowLogo} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                    {"\n                "}
                    <span data-dc-tpl="794">
                      Vis logo på denne sliden
                    </span>
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div data-dc-tpl="795" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="796" onClick={v.moveEarlier} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    ← Flytt
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="797" onClick={v.moveLater} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Flytt →
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="798" onClick={v.duplicate} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Dupliser
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="799" onClick={v.del} style={{"height":"34px","padding":"0 12px","border":"0","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scpe">
                    Slett
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="800" style={{"display":"flex","flexDirection":"column","gap":"8px","paddingTop":"14px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="801" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Legg til slide etter denne
                </span>
                {"\n            "}
                <div data-dc-tpl="802" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="803" onClick={v.addText} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                    + Tekst
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="804" onClick={v.addContact} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                    + Kontakt med QR
                  </button>
                  {"\n              "}
                  <button data-dc-tpl="805" onClick={v.addOutro} style={{"height":"34px","padding":"0 12px","border":"1px dashed #444","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                    + Avslutning
                  </button>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isStyle ? <>
            {"\n        "}
            <div data-dc-tpl="807" style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
              {"\n          "}
              <div data-dc-tpl="808" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <span data-dc-tpl="809" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Logo
                </span>
                {"\n            "}
                {v.hasLogo ? <>
                  {"\n              "}
                  <div data-dc-tpl="811" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                    {"\n                "}
                    <div data-dc-tpl="812" style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                      {"\n                  "}
                      <div data-dc-tpl="813" style={{"width":"72px","height":"56px","flex":"0 0 auto","borderRadius":"8px","border":"1px solid #2b2b2b","background":"#000","display":"flex","alignItems":"center","justifyContent":"center","padding":"8px"}}>
                        {"\n                    "}
                        <div data-dc-tpl="814" role="img" aria-label="Logo" style={css(`width:100%; height:100%; background-image:${v.logoPreviewCss ?? ""}; background-size:contain; background-repeat:no-repeat; background-position:center;`, "width:100%; height:100%; background-image:{{ logoPreviewCss }}; background-size:contain; background-repeat:no-repeat; background-position:center;")} />
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <div data-dc-tpl="815" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        <button data-dc-tpl="816" onClick={v.pickLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                          Bytt logo…
                        </button>
                        {"\n                    "}
                        <button onClick={v.pickLogoShared} data-ch-shared-logo="1" style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                          Fellesmappe
                        </button>
                        {"\n                    "}
                        <button data-dc-tpl="817" onClick={v.removeLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                          Fjern
                        </button>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label data-dc-tpl="818" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                      {"\n                  "}
                      <input data-dc-tpl="819" type="checkbox" checked={chk(v.logoOn)} onChange={v.onLogoOn} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                      {"\n                  "}
                      <span data-dc-tpl="820">
                        Vis logoen i videoen
                      </span>
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <div data-dc-tpl="821" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="822" style={{"fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="823" style={{"fontWeight":"600"}}>
                          Plassering
                        </span>
                        {" – dra logoen i forhåndsvisningen (dobbeltklikk for å bytte), eller velg et hjørne:"}
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="824" style={{"display":"flex","gap":"6px"}}>
                        {"\n                    "}
                        {list(v.logoCorners).map(($it1, $i1) => {
                          const v1 = { ...v, "lc": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button data-dc-tpl="826" onClick={v1.lc?.onClick} style={{"width":"38px","height":"32px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}} className="scp1">
                              {I(v1.lc?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label data-dc-tpl="827" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="828" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="829" style={{"fontWeight":"600"}}>
                          Vannrett (venstre – høyre)
                        </span>
                        <span data-dc-tpl="830">
                          {I(v.logoXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="831" type="range" min="0" max="100" step="1" value={val(v.logoXPct)} onChange={v.onLogoX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label data-dc-tpl="832" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="833" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="834" style={{"fontWeight":"600"}}>
                          Loddrett (topp – bunn)
                        </span>
                        <span data-dc-tpl="835">
                          {I(v.logoYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="836" type="range" min="0" max="100" step="1" value={val(v.logoYPct)} onChange={v.onLogoY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label data-dc-tpl="837" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="838" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="839" style={{"fontWeight":"600"}}>
                          Størrelse
                        </span>
                        <span data-dc-tpl="840">
                          {I(v.logoSize)}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="841" type="range" min="30" max="300" step="5" value={val(v.logoSize)} onChange={v.onLogoSize} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <label data-dc-tpl="842" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="843" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="844" style={{"fontWeight":"600"}}>
                          Synlighet
                        </span>
                        <span data-dc-tpl="845">
                          {I(v.logoOpacityPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="846" type="range" min="10" max="100" step="5" value={val(v.logoOpacityPct)} onChange={v.onLogoOpacity} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.noLogo ? <>
                  {"\n              "}
                  <div data-dc-tpl="848" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    <button data-dc-tpl="849" onClick={v.pickLogo} style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                      Legg til logo…
                    </button>
                    {"\n                "}
                    <button onClick={v.pickLogoShared} data-ch-shared-logo="1" style={{"height":"34px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer","display":"inline-flex","alignItems":"center","gap":"6px"}} className="scp2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></svg>Fellesmappe
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="851" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="852" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Grunnvideo
                </span>
                {"\n            "}
                <div data-dc-tpl="853" style={{"padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","fontSize":"13px","lineHeight":"1.5"}}>
                  {"\n              "}
                  <div data-dc-tpl="854" style={{"fontWeight":"600","overflow":"hidden","textOverflow":"ellipsis"}}>
                    {I(v.videoLabel)}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="855" style={{"color":"#9d998f","fontSize":"12px","marginTop":"2px"}}>
                    Går i loop bak alle slides. Vises der sliden mangler eget bilde, og skinner gjennom når bildestyrken er skrudd ned.
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="856" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="857" onClick={v.pickVideo} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Velg video…
                  </button>
                  {"\n              "}
                  {v.hasVideo ? <>
                    {"\n                "}
                    <button data-dc-tpl="859" onClick={v.removeVideo} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      Fjern
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="860" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="861" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Lydspor
                </span>
                {"\n            "}
                <div data-dc-tpl="862" style={{"padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","fontSize":"13px","lineHeight":"1.5"}}>
                  {"\n              "}
                  <div data-dc-tpl="863" style={{"fontWeight":"600","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}>
                    {I(v.audioLabel)}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="864" style={{"color":"#9d998f","fontSize":"12px","marginTop":"2px"}}>
                    Musikk under hele loopen. MP3, M4A eller WAV.
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="865" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="866" onClick={v.pickAudio} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                    Velg lyd…
                  </button>
                  {"\n              "}
                  {v.hasAudio ? <>
                    {"\n                "}
                    <button data-dc-tpl="868" onClick={v.removeAudio} style={{"height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                      Fjern
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="869" style={{"display":"flex","flexDirection":"column","gap":"8px","padding":"12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#0a0a0a"}}>
                  {"\n              "}
                  <div data-dc-tpl="870" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                    {"\n                "}
                    <span data-dc-tpl="871" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Lydbibliotek
                    </span>
                    {"\n                "}
                    <button data-dc-tpl="872" onClick={v.pickLib} style={{"height":"26px","minHeight":"0","padding":"0 10px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                      + Legg til lyder
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  {v.noLib ? <>
                    {"\n                "}
                    <span data-dc-tpl="874" style={{"fontSize":"12px","color":"#6f6b64","lineHeight":"1.45","textWrap":"pretty"}}>
                      Lyder du laster opp, blir lagret her, så du kan bytte mellom dem senere.
                    </span>
                    {"\n              "}
                  </> : null}
                  {"\n              "}
                  {v.hasLib ? <>
                    {"\n                "}
                    <div data-dc-tpl="876" style={{"display":"flex","flexDirection":"column","gap":"4px","maxHeight":"240px","overflowY":"auto"}}>
                      {"\n                  "}
                      {list(v.audioLib).map(($it1, $i1) => {
                        const v1 = { ...v, "t": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          {"\n                    "}
                          <div data-dc-tpl="878" style={{"display":"flex","alignItems":"center","gap":"4px"}}>
                            {"\n                      "}
                            <button data-dc-tpl="879" onClick={v1.t?.use} title="Bruk denne lyden" style={css(`flex:1 1 auto; min-width:0; height:36px; min-height:0; padding:0 12px; display:flex; align-items:center; gap:10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:#f3f1ec; font:inherit; font-size:13px; text-align:left; cursor:pointer;`, "flex:1 1 auto; min-width:0; height:36px; min-height:0; padding:0 12px; display:flex; align-items:center; gap:10px; border:1px solid {{ t.bd }}; border-radius:8px; background:{{ t.bg }}; color:#f3f1ec; font:inherit; font-size:13px; text-align:left; cursor:pointer;")} className="scpf">
                              {"\n                        "}
                              <span data-dc-tpl="880" style={css(`width:8px; height:8px; flex:0 0 auto; border-radius:999px; background:${v1.t?.dot ?? ""};`, "width:8px; height:8px; flex:0 0 auto; border-radius:999px; background:{{ t.dot }};")} />
                              {"\n                        "}
                              <span data-dc-tpl="881" style={{"flex":"1 1 auto","minWidth":"0","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap","fontWeight":"600"}}>
                                {I(v1.t?.name)}
                              </span>
                              {"\n                        "}
                              <span data-dc-tpl="882" style={{"flex":"0 0 auto","fontSize":"12px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                                {I(v1.t?.dur)}
                              </span>
                              {"\n                      "}
                            </button>
                            {"\n                      "}
                            <button data-dc-tpl="883" onClick={v1.t?.del} title="Slett fra biblioteket" aria-label="Slett fra biblioteket" style={{"width":"32px","height":"36px","minHeight":"0","padding":"0","flex":"0 0 auto","border":"0","borderRadius":"8px","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"16px","cursor":"pointer"}} className="scpg">
                              ×
                            </button>
                            {"\n                    "}
                          </div>
                          {"\n                  "}
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <label data-dc-tpl="884" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="885" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Sjanger
                  </span>
                  {"\n              "}
                  <select data-dc-tpl="886" value={val(v.genreVal)} onChange={v.onGenre} style={{"height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none","cursor":"pointer"}}>
                    {"\n                "}
                    {list(v.genreOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "g": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option data-dc-tpl="888" value={val(v1.g?.value)}>
                          {I(v1.g?.label)}
                        </option>
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </select>
                  {"\n              "}
                  <span data-dc-tpl="889" style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                    {I(v.genreDesc)}
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                {v.genreReapply ? <>
                  {"\n              "}
                  <button data-dc-tpl="891" onClick={v.onGenreReapply} style={{"alignSelf":"flex-start","height":"24px","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                    Bruk analysen på nytt
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasAudio ? <>
                  {"\n              "}
                  <div data-dc-tpl="893" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                    {"\n                "}
                    <label data-dc-tpl="894" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="895" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="896" style={{"fontWeight":"600"}}>
                          Volum
                        </span>
                        <span data-dc-tpl="897" data-vol-pct="1">
                          {I(v.audioVolPct)}{" %"}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="898" type="range" min="0" max="100" step="1" defaultValue={v.audioVolPct} onChange={v.onAudioVol} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    <div data-dc-tpl="899" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="900" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Looping
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="901" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        {list(v.audioModes).map(($it1, $i1) => {
                          const v1 = { ...v, "am": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button data-dc-tpl="903" onClick={v1.am?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.am?.bg ?? ""}; color:${v1.am?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ am.bg }}; color:{{ am.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                              {I(v1.am?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <span data-dc-tpl="904" style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.audioModeDesc)}
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="905" style={{"fontSize":"12px","color":"#e9e7e2"}}>
                        {I(v.audioDurLabel)}
                      </span>
                      {"\n                  "}
                      {v.audioIsFit ? <>
                        {"\n                    "}
                        <span data-dc-tpl="907" style={{"fontSize":"12px","color":"#e9e7e2"}}>
                          {I(v.audioFitNote)}
                        </span>
                        {"\n                  "}
                      </> : null}
                      {"\n                  "}
                      {v.audioIsBeat ? <>
                        {"\n                    "}
                        <div data-dc-tpl="909" style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000"}}>
                          {"\n                      "}
                          <div data-dc-tpl="910" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","flexWrap":"wrap"}}>
                            {"\n                        "}
                            <div data-dc-tpl="911" style={{"display":"flex","flexDirection":"column","gap":"2px","minWidth":"0"}}>
                              <span data-dc-tpl="912" style={{"fontSize":"15px","fontWeight":"700"}}>
                                {I(v.bpmLabel)}
                              </span>
                              <span data-dc-tpl="913" style={{"fontSize":"11.5px","color":"#9d998f"}}>
                                {I(v.bpmSub)}
                              </span>
                            </div>
                            {"\n                        "}
                            <div data-dc-tpl="914" style={{"display":"flex","gap":"4px","flexWrap":"wrap"}}>
                              {"\n                          "}
                              <button data-dc-tpl="915" onClick={v.bpmMinus} title="1 BPM saktere" style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                −
                              </button>
                              {"\n                          "}
                              <button data-dc-tpl="916" onClick={v.bpmPlus} title="1 BPM raskere" style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                +
                              </button>
                              {"\n                          "}
                              <button data-dc-tpl="917" onClick={v.bpmHalf} title="Halvt tempo" style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                ½
                              </button>
                              {"\n                          "}
                              <button data-dc-tpl="918" onClick={v.bpmDouble} title="Dobbelt tempo" style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                ×2
                              </button>
                              {"\n                          "}
                              <button data-dc-tpl="919" onClick={v.bpmAuto} title="Bruk tempoet som ble funnet" style={{"height":"28px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                                Auto
                              </button>
                              {"\n                        "}
                            </div>
                            {"\n                      "}
                          </div>
                          {"\n                      "}
                          <label data-dc-tpl="920" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            <span data-dc-tpl="921" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span data-dc-tpl="922" style={{"fontWeight":"600"}}>
                                Finjuster slaget
                              </span>
                              <span data-dc-tpl="923">
                                {I(v.beatNudgeLabel)}
                              </span>
                            </span>
                            <input data-dc-tpl="924" type="range" min="-200" max="200" step="5" value={val(v.beatNudge)} onChange={v.onBeatNudge} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                          {"\n                      "}
                          <span data-dc-tpl="925" style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                            Kommer skiftene litt før eller etter slaget, dra her til de sitter.
                          </span>
                          {"\n                    "}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <label data-dc-tpl="926" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="927" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                        <span data-dc-tpl="928" style={{"fontWeight":"600"}}>
                          Start i sangen ved
                        </span>
                        <span data-dc-tpl="929">
                          {I(v.audioOffsetLabel)}
                        </span>
                      </span>
                      {"\n                  "}
                      <input data-dc-tpl="930" type="range" min="0" max={v.audioMax} step="0.5" value={val(v.audioOffset)} onChange={v.onAudioOffset} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n                "}
                    </label>
                    {"\n                "}
                    {v.audioNotFree ? <>
                      {"\n                  "}
                      <div data-dc-tpl="932" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"12px"}}>
                        {"\n                    "}
                        <label data-dc-tpl="933" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                      "}
                          <span data-dc-tpl="934" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="935" style={{"fontWeight":"600"}}>
                              Inntoning
                            </span>
                            <span data-dc-tpl="936">
                              {I(v.fadeInLabel)}
                            </span>
                          </span>
                          {"\n                      "}
                          <input data-dc-tpl="937" type="range" min="0" max="3" step="0.05" value={val(v.fadeInVal)} onChange={v.onFadeIn} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                    "}
                        <label data-dc-tpl="938" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                          {"\n                      "}
                          <span data-dc-tpl="939" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                            <span data-dc-tpl="940" style={{"fontWeight":"600"}}>
                              Uttoning
                            </span>
                            <span data-dc-tpl="941">
                              {I(v.fadeOutLabel)}
                            </span>
                          </span>
                          {"\n                      "}
                          <input data-dc-tpl="942" type="range" min="0" max="4" step="0.05" value={val(v.fadeOutVal)} onChange={v.onFadeOut} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          {"\n                    "}
                        </label>
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="943" style={{"display":"flex","flexDirection":"column","gap":"12px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div data-dc-tpl="944" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <label data-dc-tpl="945" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="946" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Overskrift («Ukentlige møter»)
                    </span>
                    <input data-dc-tpl="947" value={val(v.cfgHeader)} onChange={v.onHeader} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </label>
                  {"\n            "}
                  <div data-dc-tpl="948" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) auto","gap":"10px","alignItems":"end"}}>
                    {"\n              "}
                    <label data-dc-tpl="949" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="950" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span data-dc-tpl="951">
                          Vannrett
                        </span>
                        <span data-dc-tpl="952">
                          {I(v.headerXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input data-dc-tpl="953" type="range" min="0" max="100" step="1" value={val(v.headerXPct)} onChange={v.onHeaderX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <label data-dc-tpl="954" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="955" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span data-dc-tpl="956">
                          Loddrett
                        </span>
                        <span data-dc-tpl="957">
                          {I(v.headerYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input data-dc-tpl="958" type="range" min="0" max="100" step="1" value={val(v.headerYPct)} onChange={v.onHeaderY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <button data-dc-tpl="959" onClick={v.resetHeaderPos} style={{"height":"24px","padding":"0 2px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                      Standard
                    </button>
                    {"\n            "}
                  </div>
                </div>
                {"\n            "}
                <div data-dc-tpl="960" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  <label data-dc-tpl="961" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="962" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Merkelapp («Program for uken»)
                    </span>
                    <input data-dc-tpl="963" value={val(v.cfgTopLabel)} onChange={v.onTopLabel} style={{"height":"38px","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}} className="scp3" />
                  </label>
                  {"\n            "}
                  <div data-dc-tpl="964" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr) auto","gap":"10px","alignItems":"end"}}>
                    {"\n              "}
                    <label data-dc-tpl="965" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="966" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span data-dc-tpl="967">
                          Vannrett
                        </span>
                        <span data-dc-tpl="968">
                          {I(v.topXPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input data-dc-tpl="969" type="range" min="0" max="100" step="1" value={val(v.topXPct)} onChange={v.onTopX} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <label data-dc-tpl="970" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                      {"\n                "}
                      <span data-dc-tpl="971" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
                        <span data-dc-tpl="972">
                          Loddrett
                        </span>
                        <span data-dc-tpl="973">
                          {I(v.topYPct)}{" %"}
                        </span>
                      </span>
                      {"\n                "}
                      <input data-dc-tpl="974" type="range" min="0" max="100" step="1" value={val(v.topYPct)} onChange={v.onTopY} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                      {"\n              "}
                    </label>
                    {"\n              "}
                    <button data-dc-tpl="975" onClick={v.resetTopPos} style={{"height":"24px","padding":"0 2px","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                      Standard
                    </button>
                    {"\n            "}
                  </div>
                </div>
                {"\n            "}
                <span data-dc-tpl="976" style={{"fontSize":"12px","color":"#9d998f"}}>
                  Tips: dra tekstene og logoen direkte i forhåndsvisningen. Blå hjelpelinjer viser når noe står midt på, langs margen eller på linje med noe annet.
                </span>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="977" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="978" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Aksentfarge
                </span>
                {"\n            "}
                <div data-dc-tpl="979" style={{"display":"flex","gap":"10px"}}>
                  {"\n              "}
                  {list(v.swatches).map(($it1, $i1) => {
                    const v1 = { ...v, "sw": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="981" data-keep-color="1" onClick={v1.sw?.onClick} style={css(`width:32px; height:32px; border-radius:50%; border:0; cursor:pointer; background:${v1.sw?.color ?? ""}; box-shadow:${v1.sw?.ring ?? ""};`, "width:32px; height:32px; border-radius:50%; border:0; cursor:pointer; background:{{ sw.color }}; box-shadow:{{ sw.ring }};")} />
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <label data-dc-tpl="982" title="Velg egen farge" style={css(`position:relative; width:32px; height:32px; border-radius:50%; overflow:hidden; cursor:pointer; background:conic-gradient(#ff5d5d, #ffd23f, #6ee07a, #4fc3ff, #a77bff, #ff5d5d); box-shadow:${v.accentCustomRing ?? ""};`, "position:relative; width:32px; height:32px; border-radius:50%; overflow:hidden; cursor:pointer; background:conic-gradient(#ff5d5d, #ffd23f, #6ee07a, #4fc3ff, #a77bff, #ff5d5d); box-shadow:{{ accentCustomRing }};")}>
                    {"\n                "}
                    <input data-dc-tpl="983" type="color" value={val(v.accentVal)} onChange={v.onAccentPick} style={{"position":"absolute","inset":"-8px","width":"48px","height":"48px","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="984" style={{"display":"flex","flexDirection":"column","gap":"14px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label data-dc-tpl="985" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="986" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Skrift
                  </span>
                  {"\n              "}
                  <select data-dc-tpl="987" value={val(v.fontVal)} onChange={v.onFont} style={{"height":"38px","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000","color":"#f3f1ec","font":"inherit","fontSize":"14px","outline":"none"}}>
                    {"\n                "}
                    {list(v.fontOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "f": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <option data-dc-tpl="989" value={val(v1.f?.value)}>
                          {I(v1.f?.label)}
                        </option>
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </select>
                  {"\n            "}
                </label>
                {"\n            "}
                <div data-dc-tpl="990" style={{"display":"grid","gridTemplateColumns":"minmax(0,1fr) minmax(0,1fr)","gap":"12px"}}>
                  {"\n              "}
                  <div data-dc-tpl="991" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="992" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="993" style={{"fontWeight":"600"}}>
                        Titler
                      </span>
                      <span data-dc-tpl="994" style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                        <input data-dc-tpl="995" type="text" inputMode="decimal" value={val(v.titleSz?.numVal)} onChange={v.titleSz?.onNum} onBlur={v.titleSz?.onNumBlur} onKeyDown={v.titleSz?.onNumKey} onFocus={v.titleSz?.onNumFocus} aria-label="Størrelse" style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                        <button data-dc-tpl="996" type="button" onClick={v.titleSz?.cycleUnit} title={v.titleSz?.unitTitle} aria-label={v.titleSz?.unitTitle} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v.titleSz?.unit)}
                        </button>
                      </span>
                    </span>
                    <input data-dc-tpl="997" type="range" min="50" max="250" step="5" value={val(v.titleScalePct)} onChange={v.onTitleScale} aria-label="Titler" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="998" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="999" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="1000" style={{"fontWeight":"600"}}>
                        Øvrig tekst
                      </span>
                      <span data-dc-tpl="1001" style={{"display":"flex","alignItems":"stretch","height":"26px","minHeight":"0","border":"1px solid #2b2b2b","borderRadius":"7px","background":"#000","overflow":"hidden"}}>
                        <input data-dc-tpl="1002" type="text" inputMode="decimal" value={val(v.textSz?.numVal)} onChange={v.textSz?.onNum} onBlur={v.textSz?.onNumBlur} onKeyDown={v.textSz?.onNumKey} onFocus={v.textSz?.onNumFocus} aria-label="Størrelse" style={{"width":"52px","height":"auto","minHeight":"0","padding":"0 4px 0 8px","border":"0","borderRadius":"0","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontVariantNumeric":"tabular-nums","textAlign":"right","outline":"none"}} />
                        <button data-dc-tpl="1003" type="button" onClick={v.textSz?.cycleUnit} title={v.textSz?.unitTitle} aria-label={v.textSz?.unitTitle} style={{"minWidth":"28px","height":"auto","minHeight":"0","padding":"0 7px","border":"0","borderLeft":"1px solid #2b2b2b","borderRadius":"0","background":"rgba(255,255,255,0.07)","color":"#b3afa6","font":"inherit","fontSize":"11px","fontWeight":"700","cursor":"pointer"}}>
                          {I(v.textSz?.unit)}
                        </button>
                      </span>
                    </span>
                    <input data-dc-tpl="1004" type="range" min="50" max="250" step="5" value={val(v.textScalePct)} onChange={v.onTextScale} aria-label="Øvrig tekst" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="1005" style={{"display":"flex","flexDirection":"column","gap":"14px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <label data-dc-tpl="1006" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1007" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span data-dc-tpl="1008" style={{"fontWeight":"600"}}>
                      Vignett bak teksten
                    </span>
                    <span data-dc-tpl="1009">
                      {I(v.overlayPct)}{" %"}
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1010" type="range" min="30" max="120" step="5" value={val(v.overlayPct)} onChange={v.onOverlay} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label data-dc-tpl="1011" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1012" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                    <span data-dc-tpl="1013" style={{"fontWeight":"600"}}>
                      Standard varighet per slide
                    </span>
                    <span data-dc-tpl="1014">
                      {I(v.defDur)}{" s"}
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1015" type="range" min="3" max="12" step="0.5" value={val(v.defDur)} onChange={v.onDefDur} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n            "}
                </label>
                {"\n            "}
                <label data-dc-tpl="1016" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="1017" type="checkbox" checked={chk(v.vigOnAll)} onChange={v.onVigAll} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1018">
                    Vignett på alle slides
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div data-dc-tpl="1019" style={css(`display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:${v.vigAllOp ?? ""};`, "display:flex; align-items:center; gap:10px; flex-wrap:wrap; opacity:{{ vigAllOp }};")}>
                  {"\n              "}
                  <button data-dc-tpl="1020" onClick={v.openVigEdAll} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp8">
                    <svg data-dc-tpl="1021" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <circle data-dc-tpl="1022" cx="12" cy="12" r="9" />
                      <circle data-dc-tpl="1023" cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
                    </svg>
                    <span data-dc-tpl="1024">
                      Rediger vignett for alle slides…
                    </span>
                  </button>
                  {"\n              "}
                  <span data-dc-tpl="1025" style={{"fontSize":"12px","color":"#9d998f"}}>
                    {I(v.vigAllSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <label data-dc-tpl="1026" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="1027" type="checkbox" checked={chk(v.rail)} onChange={v.onRail} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1028">
                    Vis ukestripen nederst på møte-slidene
                  </span>
                  {"\n            "}
                </label>
                {"\n            "}
                <div data-dc-tpl="1029" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1030" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                    Strek ved ukedagen og merkelappene
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1031" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                    {list(v.kickerLineOpts).map(($it1, $i1) => {
                      const v1 = { ...v, "o": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        <button data-dc-tpl="1033" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                          {I(v1.o?.label)}
                        </button>
                      </React.Fragment>;
                    })}
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="1034" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <span data-dc-tpl="1035" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Oppløsning
                </span>
                {"\n            "}
                <div data-dc-tpl="1036" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","width":"max-content"}}>
                  {"\n              "}
                  {list(v.resOptions).map(($it1, $i1) => {
                    const v1 = { ...v, "r": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <button data-dc-tpl="1038" onClick={v1.r?.onClick} style={css(`height:30px; padding:0 14px; border:0; border-radius:999px; background:${v1.r?.bg ?? ""}; color:${v1.r?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`, "height:30px; padding:0 14px; border:0; border-radius:999px; background:{{ r.bg }}; color:{{ r.color }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer;")}>
                        {I(v1.r?.label)}
                      </button>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isFx ? <>
            {"\n        "}
            <div data-dc-tpl="1040" style={{"display":"flex","flexDirection":"column","gap":"20px"}}>
              {"\n          "}
              <div data-dc-tpl="1041" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="1042" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1043" style={{"fontSize":"13px","fontWeight":"700"}}>
                    Fargepaneler
                  </span>
                  {"\n              "}
                  {v.panelsCustom ? <>
                    {"\n                "}
                    <button data-dc-tpl="1045" onClick={v.panelsReset} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"0","background":"transparent","color":"#8a867e","font":"inherit","fontSize":"12px","cursor":"pointer"}} className="scp4">
                      Tilbakestill
                    </button>
                    {"\n              "}
                  </> : null}
                  {"\n            "}
                </div>
                {"\n            "}
                <label data-dc-tpl="1046" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#f3f1ec","cursor":"pointer"}}>
                  <input data-dc-tpl="1047" type="checkbox" checked={chk(v.panelsBg)} onChange={v.onPanelsBg} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {" Vis fargepaneler bak slides uten bilde"}
                </label>
                {"\n            "}
                <button data-dc-tpl="1048" onClick={v.panelsRandom} style={{"alignSelf":"flex-start","display":"inline-flex","alignItems":"center","gap":"8px","height":"34px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scpd">
                  <span data-dc-tpl="1049" aria-hidden="true" style={{"display":"grid","gridTemplateColumns":"repeat(2,7px)","gap":"2px","flex":"0 0 auto"}}>
                    <span data-dc-tpl="1050" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e76f51"}} />
                    <span data-dc-tpl="1051" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#e9c46a"}} />
                    <span data-dc-tpl="1052" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#2a9d8f"}} />
                    <span data-dc-tpl="1053" style={{"width":"7px","height":"7px","borderRadius":"2px","background":"#f4a261"}} />
                  </span>
                  <span data-dc-tpl="1054">
                    Tilfeldige farger
                  </span>
                </button>
                {"\n            "}
                <span data-dc-tpl="1055" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                  Fargene brukes også i overgangen «Paneler» og i fargefilteret. Du kan slå panelene av eller på for hver slide under Slides.
                </span>
                {"\n            "}
                {v.panelsOn ? <>
                  {"\n              "}
                  {list(v.panelRows).map(($it1, $i1) => {
                    const v1 = { ...v, "p": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n                "}
                      <div data-dc-tpl="1058" style={{"display":"grid","gridTemplateColumns":"62px 40px minmax(0,1fr) 44px","alignItems":"center","gap":"10px"}}>
                        {"\n                  "}
                        <span data-dc-tpl="1059" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                          {I(v1.p?.label)}
                        </span>
                        {"\n                  "}
                        <label data-dc-tpl="1060" data-keep-color="1" style={css(`position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:${v1.p?.color ?? ""}; opacity:${v1.p?.swatchOpacity ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; border-radius:10px; border:1px solid #3a3a3a; background:{{ p.color }}; opacity:{{ p.swatchOpacity }}; overflow:hidden; cursor:pointer;")} title="Velg farge">
                          {"\n                    "}
                          <input data-dc-tpl="1061" type="color" value={val(v1.p?.color)} onChange={v1.p?.onColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                          {"\n                  "}
                        </label>
                        {"\n                  "}
                        <input data-dc-tpl="1062" type="range" min="0" max="100" step="1" value={val(v1.p?.alphaPct)} onChange={v1.p?.onAlpha} aria-label="Gjennomsiktighet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                        {"\n                  "}
                        <span data-dc-tpl="1063" style={{"fontSize":"12px","color":"#9d998f","textAlign":"right","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.p?.alphaPct)}%
                        </span>
                        {"\n                "}
                      </div>
                      {"\n              "}
                    </React.Fragment>;
                  })}
                  {"\n              "}
                  <label data-dc-tpl="1064" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#b3afa6","cursor":"pointer"}}>
                    <input data-dc-tpl="1065" type="checkbox" checked={chk(v.panelsRotate)} onChange={v.onPanelsRotate} style={{"accentColor":"#e9e7e2"}} />
                    {" Bytt rekkefølge på fargene for hver slide"}
                  </label>
                  {"\n              "}
                  <span data-dc-tpl="1066" style={{"fontSize":"11.5px","color":"#6f6b64","lineHeight":"1.45"}}>
                    Glideren styrer hvor synlig hvert panel er. 0 % skjuler panelet.
                  </span>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n\n          "}
              <div data-dc-tpl="1067" style={{"display":"flex","flexDirection":"column","gap":"12px","padding":"14px","border":"1px solid #2b2b2b","borderRadius":"14px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="1068" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1069" style={{"fontSize":"13px","fontWeight":"700"}}>
                    Fargefilter på bilder
                  </span>
                  {"\n              "}
                  <button data-dc-tpl="1070" data-keep-color="1" onClick={v.tintToggle} role="switch" aria-checked={v.tintAria} aria-label="Fargefilter av eller på" style={css(`position:relative; width:40px; height:24px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.tintTrack ?? ""}; cursor:pointer;`, "position:relative; width:40px; height:24px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ tintTrack }}; cursor:pointer;")}>
                    <span data-dc-tpl="1071" style={css(`position:absolute; top:3px; left:${v.tintKnobX ?? ""}; width:18px; height:18px; border-radius:999px; background:${v.tintKnob ?? ""}; transition:left 160ms ease;`, "position:absolute; top:3px; left:{{ tintKnobX }}; width:18px; height:18px; border-radius:999px; background:{{ tintKnob }}; transition:left 160ms ease;")} />
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <span data-dc-tpl="1072" style={{"fontSize":"12px","color":"#8a867e","lineHeight":"1.5"}}>
                  Legger en farge over bakgrunnsbildene. Du kan overstyre filteret på hver slide under Slides.
                </span>
                {"\n            "}
                {v.tintOn ? <>
                  {"\n              "}
                  <div data-dc-tpl="1074" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span data-dc-tpl="1075" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Farge
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="1076" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.tintSrcOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="1078" onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    {v.tintSingle ? <>
                      {"\n                  "}
                      <div data-dc-tpl="1080" style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        <label data-dc-tpl="1081" data-keep-color="1" style={css(`position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:${v.tintColor ?? ""}; overflow:hidden; cursor:pointer;`, "position:relative; width:36px; height:36px; flex:0 0 auto; border-radius:10px; border:1px solid #3a3a3a; background:{{ tintColor }}; overflow:hidden; cursor:pointer;")} title="Velg farge">
                          <input data-dc-tpl="1082" type="color" value={val(v.tintColor)} onChange={v.onTintColor} style={{"position":"absolute","inset":"0","width":"100%","height":"100%","opacity":"0","cursor":"pointer","border":"0","padding":"0"}} />
                        </label>
                        {"\n                    "}
                        {list(v.tintSwatches).map(($it1, $i1) => {
                          const v1 = { ...v, "w": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="1084" data-keep-color="1" onClick={v1.w?.onClick} title={v1.w?.hex} style={css(`width:28px; height:28px; min-height:0; padding:0; border:2px solid ${v1.w?.ring ?? ""}; border-radius:999px; background:${v1.w?.hex ?? ""}; cursor:pointer;`, "width:28px; height:28px; min-height:0; padding:0; border:2px solid {{ w.ring }}; border-radius:999px; background:{{ w.hex }}; cursor:pointer;")} />
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                "}
                    </> : null}
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <div data-dc-tpl="1085" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <span data-dc-tpl="1086" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                      Blanding
                    </span>
                    {"\n                "}
                    <div data-dc-tpl="1087" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"999px","width":"max-content","maxWidth":"100%","flexWrap":"wrap"}}>
                      {"\n                  "}
                      {list(v.tintBlendOpts).map(($it1, $i1) => {
                        const v1 = { ...v, "o": $it1, $index: $i1 };
                        return <React.Fragment key={$i1}>
                          <button data-dc-tpl="1089" onClick={v1.o?.onClick} style={css(`height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:30px; min-height:0; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                            {I(v1.o?.label)}
                          </button>
                        </React.Fragment>;
                      })}
                      {"\n                "}
                    </div>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <label data-dc-tpl="1090" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    {"\n                "}
                    <span data-dc-tpl="1091" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="1092" style={{"fontWeight":"600"}}>
                        Styrke
                      </span>
                      <span data-dc-tpl="1093">
                        {I(v.tintAmtPct)}{" %"}
                      </span>
                    </span>
                    {"\n                "}
                    <input data-dc-tpl="1094" type="range" min="0" max="100" step="1" value={val(v.tintAmtPct)} onChange={v.onTintAmt} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n              "}
                  </label>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1095" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                <span data-dc-tpl="1096" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Overgang mellom slides
                </span>
                <div data-dc-tpl="1097" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                  {list(v.transOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="1099" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                        {I(v1.o?.label)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
              </div>
              {"\n          "}
              <div data-dc-tpl="1100" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <span data-dc-tpl="1101" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Tekstanimasjon
                </span>
                <div data-dc-tpl="1102" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                  {list(v.textOpts).map(($it1, $i1) => {
                    const v1 = { ...v, "o": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      <button data-dc-tpl="1104" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                        {I(v1.o?.label)}
                      </button>
                    </React.Fragment>;
                  })}
                </div>
                {"\n            "}
                {v.speedFree ? <>
                  <label data-dc-tpl="1106" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                    <span data-dc-tpl="1107" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                      <span data-dc-tpl="1108" style={{"fontWeight":"600"}}>
                        Fart
                      </span>
                      <span data-dc-tpl="1109">
                        {I(v.fxSpeedPct)}{" %"}
                      </span>
                    </span>
                    <input data-dc-tpl="1110" type="range" min="50" max="200" step="10" value={val(v.fxSpeedPct)} onChange={v.onFxSpeed} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  </label>
                </> : null}
                {"\n            "}
                {v.speedByBeat ? <>
                  <span data-dc-tpl="1112" style={{"fontSize":"12px","color":"#e9e7e2"}}>
                    Farten styres av takten i musikken.
                  </span>
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1113" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                {"\n            "}
                <span data-dc-tpl="1114" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                  Overlegg
                </span>
                {"\n            "}
                <div data-dc-tpl="1115" style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
                  {"\n              "}
                  <button data-dc-tpl="1116" onClick={v.openOvEdAll} style={{"height":"36px","padding":"0 16px","border":"1px solid #f3f1ec","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"8px"}} className="scp8">
                    <svg data-dc-tpl="1117" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle data-dc-tpl="1118" cx="7" cy="8" r="2.5" />
                      <circle data-dc-tpl="1119" cx="16" cy="6" r="1.8" />
                      <circle data-dc-tpl="1120" cx="14" cy="15" r="3" />
                      <circle data-dc-tpl="1121" cx="6" cy="17" r="1.5" />
                    </svg>
                    <span data-dc-tpl="1122">
                      Rediger overlegg for alle slides…
                    </span>
                  </button>
                  {"\n              "}
                  <span data-dc-tpl="1123" style={{"fontSize":"12px","color":"#9d998f"}}>
                    {I(v.ovAllSummary)}
                  </span>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1124" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                {"\n            "}
                <label data-dc-tpl="1125" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  <input data-dc-tpl="1126" type="checkbox" checked={chk(v.kenBurns)} onChange={v.onKenBurns} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  <span data-dc-tpl="1127">
                    Langsom zoom i bildene
                  </span>
                </label>
                {"\n            "}
                <label data-dc-tpl="1128" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  <input data-dc-tpl="1129" type="checkbox" checked={chk(v.sweep)} onChange={v.onSweep} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  <span data-dc-tpl="1130">
                    Lysstripe i aksentfargen ved hvert skifte
                  </span>
                </label>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1131" style={{"display":"flex","flexDirection":"column","gap":"12px","paddingTop":"16px","borderTop":"1px solid #262626"}}>
                {"\n            "}
                <div data-dc-tpl="1132" style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"8px"}}>
                  <span data-dc-tpl="1133" style={{"fontSize":"13px","fontWeight":"700"}}>
                    Følg takten i musikken
                  </span>
                  <span data-dc-tpl="1134" style={{"fontSize":"12px","fontWeight":"600","color":"#e9e7e2"}}>
                    {I(v.beatBadge)}
                  </span>
                </div>
                {"\n            "}
                <span data-dc-tpl="1135" style={{"fontSize":"12px","color":"#b3afa6","lineHeight":"1.5","textWrap":"pretty"}}>
                  {I(v.beatFxDesc)}
                </span>
                {"\n            "}
                {v.beatLive ? <>
                  {"\n              "}
                  <div data-dc-tpl="1137" style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
                    {"\n                "}
                    <div data-dc-tpl="1138" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"8px","background":"#000"}}>
                      {"\n                  "}
                      <span data-dc-tpl="1139" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Alltid med
                      </span>
                      {"\n                  "}
                      <span data-dc-tpl="1140" style={{"fontSize":"12.5px","color":"#d8d4cb","lineHeight":"1.6","textWrap":"pretty"}}>
                        Slidene skifter på første slag i takten, og overgangene er tilpasset tempoet.
                      </span>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1141" style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
                      {"\n                  "}
                      <label data-dc-tpl="1142" style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input data-dc-tpl="1143" type="checkbox" checked={chk(v.beatPolish)} onChange={v.onBeatPolish} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span data-dc-tpl="1144" style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                          <span data-dc-tpl="1145" style={{"fontWeight":"600"}}>
                            Rolig dybde
                          </span>
                          <span data-dc-tpl="1146" style={{"fontSize":"12px","color":"#9d998f"}}>
                            Teksten glir svakt mot bildet mens sliden står, som i en tittelsekvens.
                          </span>
                        </span>
                      </label>
                      {"\n                  "}
                      {v.beatPolish ? <>
                        {"\n                    "}
                        <div data-dc-tpl="1148" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                          {list(v.beatLevelOpts).map(($it1, $i1) => {
                            const v1 = { ...v, "o": $it1, $index: $i1 };
                            return <React.Fragment key={$i1}>
                              <button data-dc-tpl="1150" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                                {I(v1.o?.label)}
                              </button>
                            </React.Fragment>;
                          })}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1151" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                      {"\n                  "}
                      <span data-dc-tpl="1152" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Lengde per slide
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="1153" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                        {list(v.beatBarsOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "o": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            <button data-dc-tpl="1155" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                              {I(v1.o?.label)}
                            </button>
                          </React.Fragment>;
                        })}
                      </div>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1156" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                      {"\n                  "}
                      <label data-dc-tpl="1157" style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input data-dc-tpl="1158" type="checkbox" checked={chk(v.beatText)} onChange={v.onBeatText} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span data-dc-tpl="1159">
                          Ord og linjer kommer inn i takt med musikken
                        </span>
                      </label>
                      {"\n                  "}
                      <label data-dc-tpl="1160" style={{"display":"flex","alignItems":"flex-start","gap":"10px","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                        <input data-dc-tpl="1161" type="checkbox" checked={chk(v.beatReframe)} onChange={v.onBeatReframe} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                        <span data-dc-tpl="1162">
                          Bildet glir rolig til et nytt utsnitt på hver takt
                        </span>
                      </label>
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1163" style={{"display":"flex","flexDirection":"column","gap":"10px","paddingTop":"14px","borderTop":"1px dashed #2b2b2b"}}>
                      {"\n                  "}
                      <span data-dc-tpl="1164" style={{"fontSize":"12px","fontWeight":"600","color":"#9d998f"}}>
                        Ekstra effekter (valgfritt)
                      </span>
                      {"\n                  "}
                      <div data-dc-tpl="1165" style={{"display":"flex","gap":"6px","flexWrap":"wrap"}}>
                        {"\n                    "}
                        {list(v.beatFxOpts).map(($it1, $i1) => {
                          const v1 = { ...v, "b": $it1, $index: $i1 };
                          return <React.Fragment key={$i1}>
                            {"\n                      "}
                            <button data-dc-tpl="1167" onClick={v1.b?.onClick} title={v1.b?.hint} style={css(`height:30px; padding:0 12px; border:1px solid ${v1.b?.border ?? ""}; border-radius:15px; background:${v1.b?.bg ?? ""}; color:${v1.b?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "height:30px; padding:0 12px; border:1px solid {{ b.border }}; border-radius:15px; background:{{ b.bg }}; color:{{ b.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                              {I(v1.b?.label)}
                            </button>
                            {"\n                    "}
                          </React.Fragment>;
                        })}
                        {"\n                  "}
                      </div>
                      {"\n                  "}
                      <span data-dc-tpl="1168" style={{"fontSize":"11.5px","color":"#9d998f","lineHeight":"1.5","textWrap":"pretty"}}>
                        {I(v.beatFxHint)}
                      </span>
                      {"\n                  "}
                      {v.hasExtras ? <>
                        {"\n                    "}
                        <div data-dc-tpl="1170" style={{"display":"flex","flexDirection":"column","gap":"12px"}}>
                          {"\n                      "}
                          <div data-dc-tpl="1171" style={{"display":"flex","gap":"4px","padding":"4px","background":"#000","border":"1px solid #2b2b2b","borderRadius":"10px","flexWrap":"wrap"}}>
                            {list(v.beatEveryOpts).map(($it1, $i1) => {
                              const v1 = { ...v, "o": $it1, $index: $i1 };
                              return <React.Fragment key={$i1}>
                                <button data-dc-tpl="1173" onClick={v1.o?.onClick} style={css(`flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;`, "flex:1 1 auto; height:30px; padding:0 10px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap;")}>
                                  {I(v1.o?.label)}
                                </button>
                              </React.Fragment>;
                            })}
                          </div>
                          {"\n                      "}
                          <label data-dc-tpl="1174" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                            <span data-dc-tpl="1175" style={{"display":"flex","justifyContent":"space-between","fontSize":"12px","color":"#9d998f"}}>
                              <span data-dc-tpl="1176" style={{"fontWeight":"600"}}>
                                Styrke
                              </span>
                              <span data-dc-tpl="1177">
                                {I(v.beatPulsePct)}{" %"}
                              </span>
                            </span>
                            <input data-dc-tpl="1178" type="range" min="0" max="100" step="5" value={val(v.beatPulsePct)} onChange={v.onBeatPulse} style={{"width":"100%","accentColor":"#e9e7e2"}} />
                          </label>
                          {"\n                    "}
                        </div>
                        {"\n                  "}
                      </> : null}
                      {"\n                "}
                    </div>
                    {"\n                "}
                    <button data-dc-tpl="1179" onClick={v.disableBeat} style={{"alignSelf":"flex-start","height":"30px","padding":"0","border":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                      Slå av takt-synk
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.beatOff ? <>
                  {"\n              "}
                  <button data-dc-tpl="1181" onClick={v.enableBeat} style={{"alignSelf":"flex-start","height":"34px","padding":"0 14px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                    {I(v.enableBeatLabel)}
                  </button>
                  {"\n            "}
                </> : null}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n\n      "}
          {v.isExport ? <>
            {"\n        "}
            <div data-dc-tpl="1183" style={{"display":"flex","flexDirection":"column","gap":"16px"}}>
              {"\n          "}
              <div data-dc-tpl="1184" style={{"fontSize":"13px","color":"#9d998f"}}>
                {I(v.exportSummary)}
              </div>
              {"\n          "}
              {v.hasAudio ? <>
                {"\n            "}
                <label data-dc-tpl="1186" style={{"display":"flex","alignItems":"flex-start","gap":"10px","padding":"12px 14px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010","fontSize":"13px","lineHeight":"1.4","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="1187" type="checkbox" checked={chk(v.exportAudio)} onChange={v.onExportAudio} style={{"width":"16px","height":"16px","margin":"1px 0 0","flex":"0 0 auto","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1188" style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
                    <span data-dc-tpl="1189" style={{"fontWeight":"600"}}>
                      Ta med lyd i eksporten
                    </span>
                    <span data-dc-tpl="1190" style={{"fontSize":"12px","color":"#9d998f"}}>
                      {I(v.exportAudioNote)}
                    </span>
                  </span>
                  {"\n            "}
                </label>
                {"\n          "}
              </> : null}
              {"\n          "}
              <div data-dc-tpl="1191" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="1192" style={{"fontSize":"15px","fontWeight":"700"}}>
                  Fullskjerm-spiller (.html)
                </div>
                {"\n            "}
                <div data-dc-tpl="1193" style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  {"Én fil med alt inni: bilder, video, skrift og lyd. Spiller loopen uten stopp, også uten internett. Legg den inn som nettleserkilde i sendeprogrammet (f.eks. Wirecast) i "}{I(v.dimLabel)}.
                </div>
                {"\n            "}
                {v.hasAudio ? <>
                  {"\n              "}
                  <div data-dc-tpl="1195" style={{"fontSize":"12px","color":"#e9e7e2","lineHeight":"1.5"}}>
                    {I(v.htmlNote)}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <button data-dc-tpl="1196" onClick={v.exportHTML} style={{"alignSelf":"flex-start","height":"40px","padding":"0 18px","border":"0","borderRadius":"999px","background":"#e9e7e2","color":"#000000","font":"inherit","fontSize":"13.5px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                  {I(v.htmlLabel)}
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1197" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #3a3a3a","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="1198" style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div data-dc-tpl="1199" style={{"fontSize":"15px","fontWeight":"700"}}>
                    Rask MP4-eksport
                  </div>
                  <span data-dc-tpl="1200" style={{"padding":"3px 8px","borderRadius":"999px","background":"#e9e7e2","color":"#000","fontSize":"11px","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}}>
                    4K · med lyd
                  </span>
                </div>
                {"\n            "}
                <div data-dc-tpl="1201" style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  Lager én hel runde ({I(v.loopLen)}) som MP4 så fort maskinen klarer, uten å spille av i sanntid. Filen spilles av overalt og kan loopes sømløst. Hold fanen åpen mens den jobber.
                </div>
                {"\n            "}
                {v.fastIdle ? <>
                  {"\n              "}
                  <div data-dc-tpl="1203" style={{"display":"flex","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    <button data-dc-tpl="1204" onClick={v.fast4k} disabled={v.fastUnsupported} style={css(`height:40px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; opacity:${v.fastBtnOp ?? ""};`, "height:40px; padding:0 18px; border:0; border-radius:999px; background:#e9e7e2; color:#000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; opacity:{{ fastBtnOp }};")} className="scp8">
                      Lag MP4 i 4K
                    </button>
                    {"\n                "}
                    <button data-dc-tpl="1205" onClick={v.fast1080} disabled={v.fastUnsupported} style={css(`height:40px; padding:0 16px; border:1px solid #3a3a3a; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer; opacity:${v.fastBtnOp ?? ""};`, "height:40px; padding:0 16px; border:1px solid #3a3a3a; border-radius:999px; background:transparent; color:#f3f1ec; font:inherit; font-size:13px; font-weight:600; cursor:pointer; opacity:{{ fastBtnOp }};")} className="scp1">
                      1080p
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.fastBusy ? <>
                  {"\n              "}
                  <div data-dc-tpl="1207" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <div data-dc-tpl="1208" style={{"height":"6px","borderRadius":"3px","background":"#2b2b2b","overflow":"hidden"}}>
                      <div data-dc-tpl="1209" style={css(`height:100%; width:${v.fastWidth ?? ""}; background:#e9e7e2;`, "height:100%; width:{{ fastWidth }}; background:#e9e7e2;")} />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1210" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"8px","fontSize":"12.5px","color":"#b3afa6"}}>
                      <span data-dc-tpl="1211">
                        {I(v.fastLabel)}
                      </span>
                      <button data-dc-tpl="1212" onClick={v.fastCancel} style={{"border":"0","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        Avbryt
                      </button>
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.hasFastNote ? <>
                  <div data-dc-tpl="1214" style={css(`font-size:12px; color:${v.fastNoteColor ?? ""}; line-height:1.5;`, "font-size:12px; color:{{ fastNoteColor }}; line-height:1.5;")}>
                    {I(v.fastNote)}
                  </div>
                </> : null}
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1215" style={{"display":"flex","flexDirection":"column","gap":"10px","padding":"16px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                {"\n            "}
                <div data-dc-tpl="1216" style={{"fontSize":"15px","fontWeight":"700"}}>
                  Videofil (sanntid)
                </div>
                {"\n            "}
                <div data-dc-tpl="1217" style={{"fontSize":"13px","color":"#b3afa6","lineHeight":"1.55","textWrap":"pretty"}}>
                  Tar opp én hel runde i sanntid ({I(v.loopLen)}). Slutten går sømløst over i starten, så filen kan loopes i sendeprogrammet eller brukes som vanlig video. Hold fanen åpen og synlig mens den tar opp.
                </div>
                {"\n            "}
                {v.notRecording ? <>
                  {"\n              "}
                  <button data-dc-tpl="1219" onClick={v.startRec} style={{"alignSelf":"flex-start","height":"40px","padding":"0 18px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13.5px","fontWeight":"700","cursor":"pointer"}} className="scp1">
                    Ta opp video
                  </button>
                  {"\n            "}
                </> : null}
                {"\n            "}
                {v.recording ? <>
                  {"\n              "}
                  <div data-dc-tpl="1221" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                    {"\n                "}
                    <div data-dc-tpl="1222" style={{"height":"6px","borderRadius":"3px","background":"#2b2b2b","overflow":"hidden"}}>
                      <div data-dc-tpl="1223" style={css(`height:100%; width:${v.recWidth ?? ""}; background:#e9e7e2;`, "height:100%; width:{{ recWidth }}; background:#e9e7e2;")} />
                    </div>
                    {"\n                "}
                    <div data-dc-tpl="1224" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","fontSize":"12.5px","color":"#b3afa6"}}>
                      <span data-dc-tpl="1225">
                        {"Tar opp … "}{I(v.recPct)}{" %"}
                      </span>
                      <button data-dc-tpl="1226" onClick={v.cancelRec} style={{"border":"0","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}}>
                        Avbryt
                      </button>
                    </div>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </> : null}
                {"\n            "}
                <div data-dc-tpl="1227" style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.recNote)}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </> : null}
          {"\n    "}
        </div>
        {"\n  "}
      </aside>
      {"\n\n  "}
      <main data-dc-tpl="1228" style={css(`flex:${v.mainFlex ?? ""}; width:${v.paneW ?? ""}; min-width:0; height:${v.paneH ?? ""}; overflow-y:auto; padding:${v.mainPad ?? ""}; display:${v.mainDisplay ?? ""}; flex-direction:column; gap:16px;`, "flex:{{ mainFlex }}; width:{{ paneW }}; min-width:0; height:{{ paneH }}; overflow-y:auto; padding:{{ mainPad }}; display:{{ mainDisplay }}; flex-direction:column; gap:16px;")}>
        {"\n    "}
        <div data-dc-tpl="1229" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"12px","flexWrap":"wrap"}}>
          {"\n      "}
          <div data-dc-tpl="1230" style={{"display":"flex","flexDirection":"column","gap":"3px"}}>
            {"\n        "}
            <div data-dc-tpl="1231" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
              Forhåndsvisning
            </div>
            {"\n        "}
            <div data-dc-tpl="1232" style={{"fontSize":"13px","color":"#9d998f"}}>
              {I(v.statusLine)}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="1233" style={{"display":"flex","gap":"8px","flexWrap":"wrap","alignItems":"center"}}>
            {"\n        "}
            <div data-dc-tpl="1234" style={{"display":"flex","border":"1px solid #2b2b2b","borderRadius":"999px","overflow":"hidden","background":"#121212"}}>
              {"\n          "}
              <button data-dc-tpl="1235" onClick={v.undo} title="Angre (Ctrl/Cmd + Z)" aria-label="Angre" style={css(`width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:${v.undoCursor ?? ""}; opacity:${v.undoOpacity ?? ""}; display:flex; align-items:center; justify-content:center;`, "width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:{{ undoCursor }}; opacity:{{ undoOpacity }}; display:flex; align-items:center; justify-content:center;")} className="scph">
                ↶
              </button>
              {"\n          "}
              <div data-dc-tpl="1236" style={{"width":"1px","background":"#2b2b2b"}} />
              {"\n          "}
              <button data-dc-tpl="1237" onClick={v.redo} title="Gjør om (Ctrl/Cmd + Shift + Z)" aria-label="Gjør om" style={css(`width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:${v.redoCursor ?? ""}; opacity:${v.redoOpacity ?? ""}; display:flex; align-items:center; justify-content:center;`, "width:38px; height:36px; padding:0; border:0; background:transparent; color:#f3f1ec; font:inherit; font-size:17px; cursor:{{ redoCursor }}; opacity:{{ redoOpacity }}; display:flex; align-items:center; justify-content:center;")} className="scph">
                ↷
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1238" title="Format på videoen" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
              {"\n          "}
              {list(v.orientOptions).map(($it1, $i1) => {
                const v1 = { ...v, "o": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="1240" onClick={v1.o?.onClick} style={css(`height:30px; padding:0 12px; border:0; border-radius:999px; background:${v1.o?.bg ?? ""}; color:${v1.o?.color ?? ""}; font:inherit; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px;`, "height:30px; padding:0 12px; border:0; border-radius:999px; background:{{ o.bg }}; color:{{ o.color }}; font:inherit; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px;")}>
                    <span data-dc-tpl="1241" style={css(`display:block; width:${v1.o?.iw ?? ""}; height:${v1.o?.ih ?? ""}; border:1.5px solid currentColor; border-radius:2px;`, "display:block; width:{{ o.iw }}; height:{{ o.ih }}; border:1.5px solid currentColor; border-radius:2px;")} />
                    <span data-dc-tpl="1242">
                      {I(v1.o?.label)}
                    </span>
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n        "}
            </div>
            {"\n        "}
            <button data-dc-tpl="1243" onClick={v.goExport} style={css(`display:${v.mainExportDisp ?? ""}; height:38px; padding:0 16px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer;`, "display:{{ mainExportDisp }}; height:38px; padding:0 16px; border:0; border-radius:999px; background:#e9e7e2; color:#000000; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer;")} className="scp8">
              Eksporter
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n\n    "}
        <div data-dc-tpl="1244" style={{"display":"flex","alignItems":"stretch","gap":"10px","flexShrink":"0"}}>
          {"\n    "}
          <div data-dc-tpl="1245" ref={v.zoomOuter} style={{"position":"relative","flex":"1 1 auto","minWidth":"0","overflow":"hidden","borderRadius":"10px"}}>
            {"\n    "}
            <div data-dc-tpl="1246" ref={v.fsRef} style={css(`position:relative; flex-shrink:0; background:#000; border:1px solid #262626; border-radius:10px; overflow:hidden; display:flex; justify-content:center; align-items:center; transform:${v.zoomTf ?? ""}; transform-origin:0 0;`, "position:relative; flex-shrink:0; background:#000; border:1px solid #262626; border-radius:10px; overflow:hidden; display:flex; justify-content:center; align-items:center; transform:{{ zoomTf }}; transform-origin:0 0;")}>
              {"\n      "}
              {v.isFs ? <>
                {"\n        "}
                <button data-dc-tpl="1248" onClick={v.exitFs} title="Lukk fullskjerm (Esc)" aria-label="Lukk fullskjerm" style={{"position":"absolute","zIndex":"20","top":"18px","right":"18px","width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.45)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","opacity":"0.28","transition":"opacity .2s ease, background .2s ease"}} className="scpi">
                  <svg data-dc-tpl="1249" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                    <path data-dc-tpl="1250" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                {"\n        "}
                <div data-dc-tpl="1251" style={{"position":"absolute","zIndex":"20","left":"18px","bottom":"18px","display":"flex","gap":"10px","opacity":"0.28","transition":"opacity .2s ease"}} className="scpj">
                  {"\n          "}
                  <button data-dc-tpl="1252" onClick={v.togglePlay} title={`${v.playLabel ?? ""} (mellomrom)`} aria-label={v.playLabel} style={{"width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.6)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
                    {"\n            "}
                    {v.isLive ? <>
                      <svg data-dc-tpl="1254" width="13" height="15" viewBox="0 0 10 12" fill="currentColor">
                        <rect data-dc-tpl="1255" x="0" y="0" width="3.2" height="12" rx="1" />
                        <rect data-dc-tpl="1256" x="6.8" y="0" width="3.2" height="12" rx="1" />
                      </svg>
                    </> : null}
                    {"\n            "}
                    {v.isPaused ? <>
                      <svg data-dc-tpl="1258" width="14" height="15" viewBox="0 0 11 12" fill="currentColor">
                        <path data-dc-tpl="1259" d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                      </svg>
                    </> : null}
                    {"\n          "}
                  </button>
                  {"\n          "}
                  <button data-dc-tpl="1260" onClick={v.volBtn} title={v.volTitle} aria-label={v.volTitle} style={{"width":"44px","height":"44px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.6)","color":"#ffffff","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}}>
                    {"\n            "}
                    {v.volOn ? <>
                      <svg data-dc-tpl="1262" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path data-dc-tpl="1263" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                        <path data-dc-tpl="1264" d="M15.5 8.5a5 5 0 0 1 0 7" />
                        <path data-dc-tpl="1265" d="M19 5a10 10 0 0 1 0 14" />
                      </svg>
                    </> : null}
                    {"\n            "}
                    {v.volOff ? <>
                      <svg data-dc-tpl="1267" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path data-dc-tpl="1268" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                        <path data-dc-tpl="1269" d="m22 9-6 6" />
                        <path data-dc-tpl="1270" d="m16 9 6 6" />
                      </svg>
                    </> : null}
                    {"\n          "}
                  </button>
                  {"\n        "}
                </div>
                {"\n      "}
              </> : null}
              {"\n      "}
              <canvas data-dc-tpl="1271" ref={v.canvasRef} onPointerDown={v.onCanvasDown} onPointerMove={v.onCanvasMove} onDoubleClick={v.onCanvasDbl} title="Dra tekster, bilder, logo og QR for å flytte · dra i hjørnene for å endre størrelse · klikk på et tomt område for å spille av/pause · dobbeltklikk tekst for å redigere" style={css(`touch-action:none; cursor:${v.canvasCursor ?? ""}; display:block; width:100%; height:auto; max-height:${v.canvasMaxH ?? ""}; object-fit:contain; aspect-ratio:${v.canvasAspect ?? ""};`, "touch-action:none; cursor:{{ canvasCursor }}; display:block; width:100%; height:auto; max-height:{{ canvasMaxH }}; object-fit:contain; aspect-ratio:{{ canvasAspect }};")} />
              {"\n      "}
              <div data-dc-tpl="1272" ref={v.guideRef} aria-hidden="true" style={{"position":"absolute","zIndex":"3","left":"0","top":"0","width":"0","height":"0","display":"none","pointerEvents":"none"}}>
                {"\n        "}
                {v.gThirds ? <>
                  {"\n          "}
                  <svg data-dc-tpl="1274" width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g data-dc-tpl="1275" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="3" vector-effect="non-scaling-stroke">
                      <path data-dc-tpl="1276" d="M100 0V300M200 0V300M0 100H300M0 200H300" vector-effect="non-scaling-stroke" />
                    </g>
                    {"\n            "}
                    <g data-dc-tpl="1277" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.2">
                      <path data-dc-tpl="1278" d="M100 0V300M200 0V300M0 100H300M0 200H300" vector-effect="non-scaling-stroke" />
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v.gGolden ? <>
                  {"\n          "}
                  <svg data-dc-tpl="1280" width="100%" height="100%" viewBox={v.gViewBox} preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g data-dc-tpl="1281" transform={v.gTransform}>
                      {"\n              "}
                      <path data-dc-tpl="1282" d={v.gSquares} fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1" vector-effect="non-scaling-stroke" />
                      {"\n              "}
                      <path data-dc-tpl="1283" d={v.gSpiral} fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="3.2" vector-effect="non-scaling-stroke" />
                      {"\n              "}
                      <path data-dc-tpl="1284" d={v.gSpiral} fill="none" stroke="#ffffff" stroke-width="1.6" vector-effect="non-scaling-stroke" />
                      {"\n            "}
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n        "}
                </> : null}
                {"\n        "}
                {v.gFib ? <>
                  {"\n          "}
                  <svg data-dc-tpl="1286" width="100%" height="100%" viewBox={v.gViewBox} preserveAspectRatio="none" style={{"display":"block","overflow":"visible"}}>
                    {"\n            "}
                    <g data-dc-tpl="1287" transform={v.gTransform}>
                      {"\n              "}
                      <path data-dc-tpl="1288" d={v.gSquares} fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="3" vector-effect="non-scaling-stroke" />
                      {"\n              "}
                      <path data-dc-tpl="1289" d={v.gSquares} fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" vector-effect="non-scaling-stroke" />
                      {"\n            "}
                    </g>
                    {"\n          "}
                  </svg>
                  {"\n          "}
                  {list(v.gFibLabels).map(($it1, $i1) => {
                    const v1 = { ...v, "l": $it1, $index: $i1 };
                    return <React.Fragment key={$i1}>
                      {"\n            "}
                      <span data-dc-tpl="1291" style={css(`position:absolute; left:${v1.l?.left ?? ""}; top:${v1.l?.top ?? ""}; transform:translate(-50%, -50%); padding:1px 6px; border-radius:999px; background:rgba(0,0,0,0.6); color:#ffffff; font-size:${v1.l?.fs ?? ""}; font-weight:700; font-variant-numeric:tabular-nums;`, "position:absolute; left:{{ l.left }}; top:{{ l.top }}; transform:translate(-50%, -50%); padding:1px 6px; border-radius:999px; background:rgba(0,0,0,0.6); color:#ffffff; font-size:{{ l.fs }}; font-weight:700; font-variant-numeric:tabular-nums;")}>
                        {I(v1.l?.n)}
                      </span>
                      {"\n          "}
                    </React.Fragment>;
                  })}
                  {"\n        "}
                </> : null}
                {"\n      "}
              </div>
              {"\n      "}
              <div data-dc-tpl="1292" ref={v.selBoxRef} style={{"position":"absolute","zIndex":"4","left":"0","top":"0","width":"0","height":"0","display":"none","border":"1.5px solid rgba(255,255,255,0.95)","borderRadius":"4px","boxShadow":"0 0 0 1px rgba(0,0,0,0.55)","pointerEvents":"none"}}>
                {"\n        "}
                <div data-dc-tpl="1293" data-h="nw" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"0","top":"0","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nwse-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-dc-tpl="1294" data-h="ne" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"100%","top":"0","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nesw-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-dc-tpl="1295" data-h="sw" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"0","top":"100%","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nesw-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-dc-tpl="1296" data-h="se" onPointerDown={v.onHandleDown} style={{"position":"absolute","left":"100%","top":"100%","width":"18px","height":"18px","margin":"-9px","borderRadius":"999px","background":"#ffffff","border":"2px solid #111","boxShadow":"0 1px 6px rgba(0,0,0,0.5)","cursor":"nwse-resize","pointerEvents":"auto","touchAction":"none"}} />
                {"\n        "}
                <div data-dc-tpl="1297" data-sel-chip="1" style={{"position":"absolute","left":"-2px","bottom":"100%","marginBottom":"10px","display":"flex","alignItems":"center","gap":"4px","padding":"3px 4px 3px 10px","borderRadius":"999px","background":"rgba(0,0,0,0.85)","whiteSpace":"nowrap","pointerEvents":"auto","backdropFilter":"blur(6px)"}}>
                  {"\n          "}
                  <span data-dc-tpl="1298" style={{"fontSize":"11.5px","fontWeight":"600","color":"#f3f1ec"}}>
                    {I(v.selElLabel)}
                  </span>
                  {"\n          "}
                  <span data-dc-tpl="1299" style={{"fontSize":"11.5px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                    {I(v.selElPct)}
                  </span>
                  {"\n          "}
                  <button data-dc-tpl="1300" onClick={v.selReset} title="Tilbakestill størrelse og plassering" aria-label="Tilbakestill størrelse og plassering" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#b3afa6","font":"inherit","fontSize":"13px","cursor":"pointer"}} className="scpk">
                    ↺
                  </button>
                  {"\n          "}
                  {v.selCanDelete ? <>
                    {"\n            "}
                    <button data-dc-tpl="1302" onClick={v.selDelete} title="Slett fra sliden (Delete)" aria-label="Slett fra sliden" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#ff9a9a","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpl">
                      <svg data-dc-tpl="1303" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path data-dc-tpl="1304" d="M3 6h18" />
                        <path data-dc-tpl="1305" d="M8 6V4h8v2" />
                        <path data-dc-tpl="1306" d="M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                    {"\n          "}
                  </> : null}
                  {"\n          "}
                  <button data-dc-tpl="1307" onClick={v.selClear} title="Ferdig (Esc)" aria-label="Ferdig" style={{"width":"24px","height":"24px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","color":"#b3afa6","font":"inherit","fontSize":"13px","lineHeight":"1","cursor":"pointer"}} className="scpk">
                    ✓
                  </button>
                  {"\n        "}
                </div>
                {"\n      "}
              </div>
              {"\n      "}
              {v.hasFlash ? <>
                {"\n        "}
                <div data-dc-tpl="1309" style={{"position":"absolute","left":"50%","top":"50%","zIndex":"4","width":"72px","height":"72px","margin":"-36px 0 0 -36px","borderRadius":"999px","background":"rgba(0,0,0,0.55)","color":"#ffffff","display":"flex","alignItems":"center","justifyContent":"center","pointerEvents":"none","backdropFilter":"blur(4px)"}}>
                  {"\n          "}
                  {v.flashPlayIcon ? <>
                    <svg data-dc-tpl="1311" width="26" height="28" viewBox="0 0 11 12" fill="currentColor">
                      <path data-dc-tpl="1312" d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                    </svg>
                  </> : null}
                  {"\n          "}
                  {v.flashPauseIcon ? <>
                    <svg data-dc-tpl="1314" width="24" height="28" viewBox="0 0 10 12" fill="currentColor">
                      <rect data-dc-tpl="1315" x="0" y="0" width="3.2" height="12" rx="1" />
                      <rect data-dc-tpl="1316" x="6.8" y="0" width="3.2" height="12" rx="1" />
                    </svg>
                  </> : null}
                  {"\n        "}
                </div>
                {"\n      "}
              </> : null}
              {"\n      "}
              {v.hasInline ? <>
                {"\n        "}
                <textarea data-dc-tpl="1318" ref={v.inlineRef} value={val(v.inlineVal)} onChange={v.onInlineChange} onKeyDown={v.onInlineKey} onBlur={v.onInlineCommit} rows="1" aria-label="Rediger tekst" style={css(`position:absolute; z-index:5; left:${v.inlineL ?? ""}; top:${v.inlineT ?? ""}; width:${v.inlineW ?? ""}; height:${v.inlineH ?? ""}; padding:6px 10px; border:1.5px solid #e9e7e2; border-radius:8px; background:rgba(0,0,0,0.82); color:#ffffff; font-family:inherit; font-size:${v.inlineFs ?? ""}; font-weight:600; line-height:1.25; resize:none; outline:none; box-shadow:0 8px 30px rgba(0,0,0,0.6); backdrop-filter:blur(6px);`, "position:absolute; z-index:5; left:{{ inlineL }}; top:{{ inlineT }}; width:{{ inlineW }}; height:{{ inlineH }}; padding:6px 10px; border:1.5px solid #e9e7e2; border-radius:8px; background:rgba(0,0,0,0.82); color:#ffffff; font-family:inherit; font-size:{{ inlineFs }}; font-weight:600; line-height:1.25; resize:none; outline:none; box-shadow:0 8px 30px rgba(0,0,0,0.6); backdrop-filter:blur(6px);")} />
                {"\n        "}
                <div data-dc-tpl="1319" style={css(`position:absolute; z-index:5; left:${v.inlineL ?? ""}; top:${v.inlineHintT ?? ""}; display:flex; gap:8px; align-items:center; padding:4px 10px; border-radius:999px; background:rgba(0,0,0,0.85); color:#b3afa6; font-size:11.5px; white-space:nowrap; pointer-events:none;`, "position:absolute; z-index:5; left:{{ inlineL }}; top:{{ inlineHintT }}; display:flex; gap:8px; align-items:center; padding:4px 10px; border-radius:999px; background:rgba(0,0,0,0.85); color:#b3afa6; font-size:11.5px; white-space:nowrap; pointer-events:none;")}>
                  {I(v.inlineHint)}
                </div>
                {"\n      "}
              </> : null}
              {"\n    "}
            </div>
            {"\n\n    "}
            {v.zoomed ? <>
              {"\n      "}
              <div data-dc-tpl="1321" style={{"position":"absolute","left":"10px","bottom":"10px","zIndex":"6","padding":"4px 10px","borderRadius":"999px","background":"rgba(0,0,0,0.7)","color":"#c9c5bc","fontSize":"11.5px","pointerEvents":"none"}}>
                Rull eller dra med to fingre for å flytte · Ctrl/Cmd + scroll for zoom
              </div>
              {"\n    "}
            </> : null}
            {"\n    "}
          </div>
          {"\n    "}
          <div data-dc-tpl="1322" style={{"flex":"0 0 auto","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"6px"}}>
            {"\n      "}
            <button data-dc-tpl="1323" onClick={v.zoomIn} title="Zoom inn" aria-label="Zoom inn" style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"17px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpm">
              +
            </button>
            {"\n      "}
            <button data-dc-tpl="1324" onClick={v.zoomFit} title="Standard visning" aria-label="Standard visning" style={css(`width:34px; min-height:0; padding:6px 0; border:1px solid #3a3a3a; border-radius:999px; background:${v.zoomFitBgV ?? ""}; color:${v.zoomFitFg ?? ""}; font:inherit; font-size:10px; font-weight:700; line-height:1.1; cursor:pointer; font-variant-numeric:tabular-nums; writing-mode:horizontal-tb;`, "width:34px; min-height:0; padding:6px 0; border:1px solid #3a3a3a; border-radius:999px; background:{{ zoomFitBgV }}; color:{{ zoomFitFg }}; font:inherit; font-size:10px; font-weight:700; line-height:1.1; cursor:pointer; font-variant-numeric:tabular-nums; writing-mode:horizontal-tb;")} className="scp1">
              {I(v.zoomLabelShort)}
            </button>
            {"\n      "}
            <button data-dc-tpl="1325" onClick={v.zoomOut} title="Zoom ut" aria-label="Zoom ut" style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"17px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpm">
              −
            </button>
            {"\n    "}
          </div>
          {"\n    "}
        </div>
        {"\n\n    "}
        <div data-dc-tpl="1326" style={{"flexShrink":"0","display":"flex","flexDirection":"column","gap":"8px"}}>
          {"\n          "}
          <div data-dc-tpl="1327" style={{"flexWrap":"wrap","rowGap":"8px","display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px"}}>
            {"\n        "}
            <div data-dc-tpl="1328" style={{"display":"flex","alignItems":"center","gap":"10px","flexWrap":"wrap","minWidth":"0"}}>
              {"\n          "}
              <button data-dc-tpl="1329" onClick={v.togglePlay} title={`${v.playLabel ?? ""} (mellomrom)`} aria-label={v.playLabel} style={{"flexShrink":"0","width":"30px","height":"30px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scp1">
                {"\n            "}
                {v.isLive ? <>
                  <svg data-dc-tpl="1331" width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                    <rect data-dc-tpl="1332" x="0" y="0" width="3.2" height="12" rx="1" />
                    <rect data-dc-tpl="1333" x="6.8" y="0" width="3.2" height="12" rx="1" />
                  </svg>
                </> : null}
                {"\n            "}
                {v.isPaused ? <>
                  <svg data-dc-tpl="1335" width="11" height="12" viewBox="0 0 11 12" fill="currentColor">
                    <path data-dc-tpl="1336" d="M1 0.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L2.2.1A.8.8 0 0 0 1 .8Z" />
                  </svg>
                </> : null}
                {"\n          "}
              </button>
              {"\n          "}
              <button data-dc-tpl="1337" onClick={v.volBtn} title={v.volTitle} aria-label={v.volTitle} style={css(`flex-shrink:0; width:30px; height:30px; min-height:0; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:#121212; color:${v.volIconColor ?? ""}; cursor:pointer; display:flex; align-items:center; justify-content:center;`, "flex-shrink:0; width:30px; height:30px; min-height:0; padding:0; border:1px solid #3a3a3a; border-radius:999px; background:#121212; color:{{ volIconColor }}; cursor:pointer; display:flex; align-items:center; justify-content:center;")} className="scp0">
                {"\n            "}
                {v.volOn ? <>
                  <svg data-dc-tpl="1339" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path data-dc-tpl="1340" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                    <path data-dc-tpl="1341" d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path data-dc-tpl="1342" d="M19 5a10 10 0 0 1 0 14" />
                  </svg>
                </> : null}
                {"\n            "}
                {v.volOff ? <>
                  <svg data-dc-tpl="1344" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path data-dc-tpl="1345" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                    <path data-dc-tpl="1346" d="m22 9-6 6" />
                    <path data-dc-tpl="1347" d="m16 9 6 6" />
                  </svg>
                </> : null}
                {"\n          "}
              </button>
              <button data-dc-tpl="1348" onClick={v.enterFs} title="Fullskjerm" aria-label="Fullskjerm" style={{"flexShrink":"0","width":"30px","height":"30px","minHeight":"0","padding":"0","border":"1px solid #3a3a3a","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scp0">
                <svg data-dc-tpl="1349" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path data-dc-tpl="1350" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              </button>
              {"\n          "}
              <span data-dc-tpl="1351" style={{"flex":"0 1 auto","minWidth":"0","overflow":"hidden","textOverflow":"ellipsis","fontSize":"12px","fontWeight":"600","color":"#9d998f","whiteSpace":"nowrap"}}>
                Slides i loopen
              </span>
              {"\n          "}
              <span data-dc-tpl="1352" ref={v.timeRef} style={{"fontSize":"12px","color":"#6f6b64","fontVariantNumeric":"tabular-nums","whiteSpace":"nowrap"}} />
              {"\n        "}
            </div>
            {"\n      "}
            <div data-dc-tpl="1353" title="Hjelpelinjer vises bare i redigeringen, ikke i videoen" style={{"flex":"0 0 auto","display":"flex","alignItems":"center","gap":"6px","marginLeft":"auto","whiteSpace":"nowrap"}}>
              {"\n        "}
              <label data-dc-tpl="1354" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                {"\n        "}
                <svg data-dc-tpl="1355" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9d998f" stroke-width="1.8">
                  <rect data-dc-tpl="1356" x="3" y="3" width="18" height="18" rx="2" />
                  <path data-dc-tpl="1357" d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
                {"\n        "}
                <select data-dc-tpl="1358" value={val(v.guideMode)} onChange={v.onGuideMode} aria-label="Hjelpelinjer" title="Hjelpelinjer – vises bare i redigeringen, ikke i videoen" style={{"maxWidth":"128px","height":"32px","minHeight":"0","padding":"0 8px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","cursor":"pointer","outline":"none"}}>
                  {"\n          "}
                  <option data-dc-tpl="1359" value="none">
                    Ingen
                  </option>
                  {"\n          "}
                  <option data-dc-tpl="1360" value="golden">
                    Sneglehus
                  </option>
                  {"\n          "}
                  <option data-dc-tpl="1361" value="fib">
                    Fibonacci
                  </option>
                  {"\n          "}
                  <option data-dc-tpl="1362" value="thirds">
                    Tredeling
                  </option>
                  {"\n        "}
                </select>
                {"\n      "}
              </label>
              {"\n      "}
              {v.gCanFlip ? <>
                {"\n        "}
                <button data-dc-tpl="1364" onClick={v.guideFlip} title="Snu hjelpelinjene" aria-label="Snu hjelpelinjene" style={{"width":"32px","justifyContent":"center","height":"32px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","gap":"6px"}} className="scp1">
                  <span data-dc-tpl="1365" style={{"fontSize":"14px"}}>
                    ⟲
                  </span>
                </button>
                {"\n      "}
              </> : null}
              {"\n      "}
            </div>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="1366" ref={v.stripRef} onScroll={v.onStripScroll} style={{"position":"relative","display":"flex","gap":"10px","overflowX":"auto","paddingBottom":"22px"}}>
            {"\n        "}
            <div data-dc-tpl="1367" ref={v.trackRef} onPointerDown={v.onScrubDown} onPointerMove={v.onScrubMove} onPointerUp={v.onScrubUp} onPointerCancel={v.onScrubUp} title="Klikk eller dra for å spole" style={{"position":"absolute","left":"0","bottom":"0","height":"22px","width":"0","cursor":"pointer","touchAction":"none","zIndex":"3"}}>
              {"\n          "}
              <div data-dc-tpl="1368" style={{"position":"absolute","left":"0","right":"0","top":"10px","height":"2px","borderRadius":"2px","background":"rgba(255,255,255,0.12)","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="1369" ref={v.fillRef} style={{"position":"absolute","left":"0","top":"10px","height":"2px","width":"0","borderRadius":"2px","background":"#e9e7e2","pointerEvents":"none"}} />
              {"\n          "}
              <div data-dc-tpl="1370" ref={v.headRef} style={{"position":"absolute","top":"11px","left":"0","width":"12px","height":"12px","margin":"-6px 0 0 -6px","borderRadius":"999px","background":"#ffffff","boxShadow":"0 0 0 3px rgba(255,255,255,0.18), 0 0 12px rgba(255,255,255,0.45)","pointerEvents":"none"}} />
              {"\n        "}
            </div>
            {"\n        "}
            {list(v.cards).map(($it1, $i1) => {
              const v1 = { ...v, "c": $it1, $index: $i1 };
              return <React.Fragment key={$i1}>
                {"\n          "}
                <div data-dc-tpl="1372" style={{"position":"relative","flex":"0 0 172px","display":"flex"}}>
                  {"\n          "}
                  <button data-dc-tpl="1373" onClick={v1.c?.onClick} style={css(`flex:1 1 auto; min-width:0; display:flex; flex-direction:column; padding:0; border:1px solid ${v1.c?.border ?? ""}; box-shadow:${v1.c?.shadow ?? ""}; border-radius:14px; background:#0a0a0a; overflow:hidden; cursor:pointer; text-align:left; font:inherit; color:#f3f1ec; opacity:${v1.c?.opacity ?? ""};`, "flex:1 1 auto; min-width:0; display:flex; flex-direction:column; padding:0; border:1px solid {{ c.border }}; box-shadow:{{ c.shadow }}; border-radius:14px; background:#0a0a0a; overflow:hidden; cursor:pointer; text-align:left; font:inherit; color:#f3f1ec; opacity:{{ c.opacity }};")}>
                    {"\n            "}
                    <div data-dc-tpl="1374" data-keep-color="1" style={css(`position:relative; height:96px; background-color:#000; background-image:${v1.c?.thumbBg ?? ""}; background-size:cover; background-position:center;`, "position:relative; height:96px; background-color:#000; background-image:{{ c.thumbBg }}; background-size:cover; background-position:center;")}>
                      {"\n              "}
                      <div data-dc-tpl="1375" style={{"position":"absolute","inset":"0","background":"linear-gradient(78deg, rgba(8,8,8,0.9) 0%, rgba(8,8,8,0.5) 60%, rgba(8,8,8,0.3) 100%)"}} />
                      {"\n              "}
                      {v1.c?.playing ? <>
                        {"\n                "}
                        <div data-dc-tpl="1377" style={{"position":"absolute","left":"0","right":"0","top":"0","height":"3px","background":"#e9e7e2"}} />
                        {"\n              "}
                      </> : null}
                      {"\n              "}
                      <div data-dc-tpl="1378" style={{"position":"absolute","left":"10px","right":"10px","bottom":"9px","display":"flex","flexDirection":"column","gap":"3px"}}>
                        {"\n                "}
                        <div data-dc-tpl="1379" style={{"fontSize":"9.5px","fontWeight":"700","letterSpacing":"0.2em","textTransform":"uppercase","color":"#e9e7e2","whiteSpace":"nowrap","overflow":"hidden","textOverflow":"ellipsis"}}>
                          {I(v1.c?.kicker)}
                        </div>
                        {"\n                "}
                        <div data-dc-tpl="1380" style={{"fontSize":"13px","fontWeight":"700","lineHeight":"1.15","textTransform":"uppercase","maxHeight":"30px","overflow":"hidden"}}>
                          {I(v1.c?.title)}
                        </div>
                        {"\n              "}
                      </div>
                      {"\n            "}
                    </div>
                    {"\n            "}
                    <div data-dc-tpl="1381" style={{"display":"flex","justifyContent":"space-between","padding":"7px 10px","fontSize":"11.5px","color":"#9d998f"}}>
                      <span data-dc-tpl="1382">
                        {I(v1.c?.num)}{" · "}{I(v1.c?.label)}
                      </span>
                      <span data-dc-tpl="1383">
                        {I(v1.c?.meta)}
                      </span>
                    </div>
                    {"\n          "}
                  </button>
                  {"\n          "}
                  {v1.c?.hasVid ? <>
                    {"\n            "}
                    <button data-dc-tpl="1385" onClick={v1.c?.toggleVidSound} title={v1.c?.vidSoundTitle} aria-label={v1.c?.vidSoundTitle} style={css(`position:absolute; z-index:2; right:8px; top:8px; height:26px; min-height:0; padding:0 9px 0 7px; border:1px solid rgba(255,255,255,0.25); border-radius:999px; background:rgba(0,0,0,0.7); color:${v1.c?.vidSoundColor ?? ""}; font:inherit; font-size:10.5px; font-weight:700; letter-spacing:0.04em; cursor:pointer; display:flex; align-items:center; gap:5px;`, "position:absolute; z-index:2; right:8px; top:8px; height:26px; min-height:0; padding:0 9px 0 7px; border:1px solid rgba(255,255,255,0.25); border-radius:999px; background:rgba(0,0,0,0.7); color:{{ c.vidSoundColor }}; font:inherit; font-size:10.5px; font-weight:700; letter-spacing:0.04em; cursor:pointer; display:flex; align-items:center; gap:5px;")} className="scpn">
                      {"\n              "}
                      {v1.c?.vidSoundOn ? <>
                        <svg data-dc-tpl="1387" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path data-dc-tpl="1388" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                          <path data-dc-tpl="1389" d="M15.5 8.5a5 5 0 0 1 0 7" />
                          <path data-dc-tpl="1390" d="M19 5a10 10 0 0 1 0 14" />
                        </svg>
                      </> : null}
                      {"\n              "}
                      {v1.c?.vidSoundOff ? <>
                        <svg data-dc-tpl="1392" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <path data-dc-tpl="1393" d="M11 5 6 9H2v6h4l5 4Z" fill="currentColor" />
                          <path data-dc-tpl="1394" d="m22 9-6 6" />
                          <path data-dc-tpl="1395" d="m16 9 6 6" />
                        </svg>
                      </> : null}
                      {"\n              "}
                      <span data-dc-tpl="1396">
                        VIDEO
                      </span>
                      {"\n            "}
                    </button>
                    {"\n          "}
                  </> : null}
                  {"\n          "}
                  <button data-dc-tpl="1397" onClick={v1.c?.onRemove} title="Fjern slide" aria-label="Fjern slide" style={{"position":"absolute","left":"6px","top":"6px","zIndex":"2","width":"22px","height":"22px","minHeight":"0","padding":"0","border":"1px solid rgba(255,255,255,0.25)","borderRadius":"999px","background":"rgba(0,0,0,0.7)","color":"#e9e7e2","font":"inherit","fontSize":"14px","lineHeight":"1","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scpo">
                    ×
                  </button>
                  {"\n          "}
                </div>
                {"\n        "}
              </React.Fragment>;
            })}
            {"\n        "}
            <div data-dc-tpl="1398" style={{"position":"relative","flex":"0 0 120px","display":"flex","flexDirection":"column","gap":"6px"}}>
              {"\n          "}
              {v.addMenuClosed ? <>
                {"\n            "}
                <button data-dc-tpl="1400" onClick={v.toggleAddMenu} title="Legg til slide" style={{"flex":"1","minHeight":"126px","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","gap":"6px","border":"1px dashed #3a3a3a","borderRadius":"14px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scpp">
                  <span data-dc-tpl="1401" style={{"fontSize":"26px","fontWeight":"300","lineHeight":"1"}}>
                    +
                  </span>
                  <span data-dc-tpl="1402">
                    Legg til
                  </span>
                </button>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.addMenuOpen ? <>
                {"\n            "}
                {list(v.quickAdd).map(($it1, $i1) => {
                  const v1 = { ...v, "q": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button data-dc-tpl="1405" onClick={v1.q?.onClick} style={{"height":"28px","minHeight":"0","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0a0a0a","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textAlign":"left"}} className="scp1">
                      {"+ "}{I(v1.q?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n            "}
                <button data-dc-tpl="1406" onClick={v.toggleAddMenu} style={{"height":"24px","minHeight":"0","padding":"0","border":"0","background":"transparent","color":"#6f6b64","font":"inherit","fontSize":"11.5px","cursor":"pointer"}} className="scp4">
                  Avbryt
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </main>
      {"\n\n  "}
      {v.ovEdOpen ? <>
        {"\n    "}
        <div data-dc-tpl="1408" role="dialog" aria-modal="true" aria-label="Rediger overlegg" style={{"position":"fixed","inset":"0","zIndex":"9400","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div data-dc-tpl="1409" style={{"width":"min(1080px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div data-dc-tpl="1410" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1411" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span data-dc-tpl="1412" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  Rediger overlegg
                </span>
                {"\n            "}
                <span data-dc-tpl="1413" style={{"fontSize":"12.5px","color":"#9d998f"}}>
                  Effekter som ligger over bildet: filmkorn, lys, bokeh, snø og mer.
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <button data-dc-tpl="1414" onClick={v.oeDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                Ferdig
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1415" style={{"display":"flex","flexDirection":"column","gap":"8px","paddingBottom":"12px","borderBottom":"1px solid #262626"}}>
              {"\n          "}
              <div data-dc-tpl="1416" style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <span data-dc-tpl="1417" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                  Slides
                </span>
                {"\n            "}
                <span data-dc-tpl="1418" style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.oeOnCount)}{" · trykk på en slide for å redigere den"}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1419" style={{"display":"flex","gap":"8px","overflowX":"auto","paddingBottom":"4px"}}>
                {"\n            "}
                {list(v.oeSlides).map(($it1, $i1) => {
                  const v1 = { ...v, "v": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="1421" onClick={v1.v?.onPick} style={css(`flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid ${v1.v?.border ?? ""}; border-radius:10px; background:${v1.v?.bg ?? ""}; cursor:pointer;`, "flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid {{ v.border }}; border-radius:10px; background:{{ v.bg }}; cursor:pointer;")}>
                      {"\n                "}
                      <div data-dc-tpl="1422" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <span data-dc-tpl="1423" style={{"fontSize":"11px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.v?.num)}{" · "}{I(v1.v?.kind)}
                        </span>
                        {"\n                  "}
                        <button data-dc-tpl="1424" onClick={v1.v?.onToggle} role="switch" aria-label="Overlegg av/på for sliden" style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.v?.track ?? ""}; cursor:pointer; transition:background .18s ease;`, "flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ v.track }}; cursor:pointer; transition:background .18s ease;")}>
                          <span data-dc-tpl="1425" style={css(`position:absolute; top:3px; left:${v1.v?.kx ?? ""}; width:16px; height:16px; border-radius:999px; background:${v1.v?.knob ?? ""}; transition:left .18s ease;`, "position:absolute; top:3px; left:{{ v.kx }}; width:16px; height:16px; border-radius:999px; background:{{ v.knob }}; transition:left .18s ease;")} />
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <span data-dc-tpl="1426" style={css(`font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:${v1.v?.op ?? ""};`, "font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:{{ v.op }};")}>
                        {I(v1.v?.title)}
                      </span>
                      {"\n                "}
                      <span data-dc-tpl="1427" style={css(`font-size:11px; color:${v1.v?.statusColor ?? ""};`, "font-size:11px; color:{{ v.statusColor }};")}>
                        {I(v1.v?.status)}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1428" style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1429" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {"\n            "}
                <button data-dc-tpl="1430" onClick={v.oeToSlide} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.oeScopeSlide?.bg ?? ""}; color:${v.oeScopeSlide?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:{{ oeScopeSlide.bg }}; color:{{ oeScopeSlide.fg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                  Denne sliden
                </button>
                {"\n            "}
                <button data-dc-tpl="1431" onClick={v.oeToAll} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.oeScopeAll?.bg ?? ""}; color:${v.oeScopeAll?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:{{ oeScopeAll.bg }}; color:{{ oeScopeAll.fg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                  Alle slides
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <span data-dc-tpl="1432" style={{"flex":"1 1 220px","minWidth":"0","fontSize":"12px","color":"#9d998f","lineHeight":"1.45","textWrap":"pretty"}}>
                {I(v.oeScopeNote)}
              </span>
              {"\n          "}
              {v.oeHasOwn ? <>
                {"\n            "}
                <button data-dc-tpl="1434" onClick={v.oeUseAll} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                  Bruk innstillingene for alle slides
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1435" style={{"display":"flex","gap":"18px","flexWrap":"wrap","alignItems":"flex-start"}}>
              {"\n          "}
              <div data-dc-tpl="1436" style={css(`position:relative; flex:0 0 auto; width:${v.oePW ?? ""}; height:${v.oePH ?? ""}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000;`, "position:relative; flex:0 0 auto; width:{{ oePW }}; height:{{ oePH }}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000;")}>
                {"\n            "}
                <canvas data-dc-tpl="1437" ref={v.ovEdCanvas} style={{"display":"block","width":"100%","height":"100%"}} />
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1438" style={{"flex":"1 1 260px","minWidth":"0","display":"flex","flexDirection":"column","gap":"16px"}}>
                {"\n            "}
                <div data-dc-tpl="1439" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <span data-dc-tpl="1440" style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                    {I(v.oeOnLabel)}
                  </span>
                  {"\n              "}
                  <button data-dc-tpl="1441" onClick={v.oeToggle} role="switch" aria-label="Overlegg av/på" style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.oeSw?.track ?? ""}; cursor:pointer; transition:background .18s ease;`, "flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ oeSw.track }}; cursor:pointer; transition:background .18s ease;")}>
                    <span data-dc-tpl="1442" style={css(`position:absolute; top:3px; left:${v.oeSw?.x ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.oeSw?.knob ?? ""}; transition:left .18s ease;`, "position:absolute; top:3px; left:{{ oeSw.x }}; width:16px; height:16px; border-radius:999px; background:{{ oeSw.knob }}; transition:left .18s ease;")} />
                  </button>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1443" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1444" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    Type
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1445" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(110px, 1fr))","gap":"6px"}}>
                    {"\n                "}
                    {list(v.oeTypes).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="1447" onClick={v1.t?.onClick} style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left;`, "height:34px; min-height:0; padding:0 10px; border:1px solid {{ t.bd }}; border-radius:8px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left;")}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1448" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1449" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1450" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Mengde
                    </span>
                    <span data-dc-tpl="1451" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1452" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeAmt)}{" %"}
                      </span>
                      <button data-dc-tpl="1453" onClick={v.oeAmt60} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        Standard
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1454" type="range" min="0" max="150" step="1" value={val(v.oeAmt)} onChange={v.onOeAmt} aria-label="Mengde" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1455" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1456">
                      Lite
                    </span>
                    <span data-dc-tpl="1457">
                      Mye
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1458" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1459" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1460" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Fart
                    </span>
                    <span data-dc-tpl="1461" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1462" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeSpeed)}{" %"}
                      </span>
                      <button data-dc-tpl="1463" onClick={v.oeSpeed100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1464" type="range" min="10" max="400" step="1" value={val(v.oeSpeed)} onChange={v.onOeSpeed} aria-label="Fart" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1465" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1466">
                      Rolig
                    </span>
                    <span data-dc-tpl="1467">
                      Rask
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1468" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1469" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1470" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Gjennomsiktighet
                    </span>
                    <span data-dc-tpl="1471" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1472" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.oeTransp)}{" %"}
                      </span>
                      <button data-dc-tpl="1473" onClick={v.oeTransp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1474" type="range" min="0" max="100" step="1" value={val(v.oeTransp)} onChange={v.onOeTransp} aria-label="Gjennomsiktighet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1475" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1476">
                      Helt dekkende
                    </span>
                    <span data-dc-tpl="1477">
                      Helt gjennomsiktig
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1478" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1479" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    Farge
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1480" style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    {list(v.oeSwList).map(($it1, $i1) => {
                      const v1 = { ...v, "w": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="1482" data-keep-color="1" onClick={v1.w?.onClick} title={v1.w?.c} aria-label={`Farge ${v1.w?.c ?? ""}`} style={css(`width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.w?.c ?? ""}; box-shadow:${v1.w?.ring ?? ""}; cursor:pointer;`, "width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ w.c }}; box-shadow:{{ w.ring }}; cursor:pointer;")} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label data-dc-tpl="1483" style={{"display":"flex","alignItems":"center","gap":"6px","height":"28px","padding":"0 10px 0 4px","border":"1px solid #2b2b2b","borderRadius":"999px","cursor":"pointer","fontSize":"12px","fontWeight":"600","color":"#c9c5bc"}}>
                      {"\n                  "}
                      <input data-dc-tpl="1484" type="color" value={val(v.oeColor)} onChange={v.onOeColor} style={{"width":"20px","height":"20px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","cursor":"pointer"}} />
                      {"\n                  "}
                      <span data-dc-tpl="1485">
                        Egen farge
                      </span>
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span data-dc-tpl="1486" style={{"fontSize":"11px","color":"#6f6b64"}}>
                    Farge brukes av Lyslekkasje, Bokeh og Konfetti.
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <label data-dc-tpl="1487" style={{"display":"flex","alignItems":"center","gap":"10px","fontSize":"13px","cursor":"pointer"}}>
                  {"\n              "}
                  <input data-dc-tpl="1488" type="checkbox" checked={chk(v.oeSync)} onChange={v.onOeSync} style={{"width":"16px","height":"16px","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1489">
                    Farten følger tempoet i musikken (alle slides)
                  </span>
                  {"\n            "}
                </label>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.vigEdOpen ? <>
        {"\n    "}
        <div data-dc-tpl="1491" role="dialog" aria-modal="true" aria-label="Rediger vignett" style={{"position":"fixed","inset":"0","zIndex":"9400","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div data-dc-tpl="1492" style={{"width":"min(1080px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div data-dc-tpl="1493" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1494" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
                {"\n            "}
                <span data-dc-tpl="1495" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  Rediger vignett
                </span>
                {"\n            "}
                <span data-dc-tpl="1496" style={{"fontSize":"12.5px","color":"#9d998f"}}>
                  Dra punktet i bildet for å flytte vignetten.
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <button data-dc-tpl="1497" onClick={v.veDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                Ferdig
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1498" style={{"display":"flex","flexDirection":"column","gap":"8px","paddingBottom":"12px","borderBottom":"1px solid #262626"}}>
              {"\n          "}
              <div data-dc-tpl="1499" style={{"display":"flex","justifyContent":"space-between","alignItems":"baseline","gap":"10px","flexWrap":"wrap"}}>
                {"\n            "}
                <span data-dc-tpl="1500" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                  Slides
                </span>
                {"\n            "}
                <span data-dc-tpl="1501" style={{"fontSize":"12px","color":"#9d998f"}}>
                  {I(v.veOnCount)}{" · trykk på en slide for å redigere den"}
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1502" style={{"display":"flex","gap":"8px","overflowX":"auto","paddingBottom":"4px"}}>
                {"\n            "}
                {list(v.veSlides).map(($it1, $i1) => {
                  const v1 = { ...v, "v": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <div data-dc-tpl="1504" onClick={v1.v?.onPick} style={css(`flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid ${v1.v?.border ?? ""}; border-radius:10px; background:${v1.v?.bg ?? ""}; cursor:pointer;`, "flex:0 0 190px; display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid {{ v.border }}; border-radius:10px; background:{{ v.bg }}; cursor:pointer;")}>
                      {"\n                "}
                      <div data-dc-tpl="1505" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"8px"}}>
                        {"\n                  "}
                        <span data-dc-tpl="1506" style={{"fontSize":"11px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                          {I(v1.v?.num)}{" · "}{I(v1.v?.kind)}
                        </span>
                        {"\n                  "}
                        <button data-dc-tpl="1507" onClick={v1.v?.onToggle} role="switch" aria-label="Vignett av/på for sliden" style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.v?.track ?? ""}; cursor:pointer; transition:background .18s ease;`, "flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ v.track }}; cursor:pointer; transition:background .18s ease;")}>
                          <span data-dc-tpl="1508" style={css(`position:absolute; top:3px; left:${v1.v?.kx ?? ""}; width:16px; height:16px; border-radius:999px; background:${v1.v?.knob ?? ""}; transition:left .18s ease;`, "position:absolute; top:3px; left:{{ v.kx }}; width:16px; height:16px; border-radius:999px; background:{{ v.knob }}; transition:left .18s ease;")} />
                        </button>
                        {"\n                "}
                      </div>
                      {"\n                "}
                      <span data-dc-tpl="1509" style={css(`font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:${v1.v?.op ?? ""};`, "font-size:12.5px; font-weight:700; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:{{ v.op }};")}>
                        {I(v1.v?.title)}
                      </span>
                      {"\n                "}
                      <span data-dc-tpl="1510" style={css(`font-size:11px; color:${v1.v?.statusColor ?? ""};`, "font-size:11px; color:{{ v.statusColor }};")}>
                        {I(v1.v?.status)}
                      </span>
                      {"\n              "}
                    </div>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1511" style={{"display":"flex","alignItems":"center","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1512" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212"}}>
                {"\n            "}
                <button data-dc-tpl="1513" onClick={v.veToSlide} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.veScopeSlide?.bg ?? ""}; color:${v.veScopeSlide?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:{{ veScopeSlide.bg }}; color:{{ veScopeSlide.fg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                  Denne sliden
                </button>
                {"\n            "}
                <button data-dc-tpl="1514" onClick={v.veToAll} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:${v.veScopeAll?.bg ?? ""}; color:${v.veScopeAll?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:{{ veScopeAll.bg }}; color:{{ veScopeAll.fg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                  Alle slides
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <span data-dc-tpl="1515" style={{"flex":"1 1 220px","minWidth":"0","fontSize":"12px","color":"#9d998f","lineHeight":"1.45","textWrap":"pretty"}}>
                {I(v.veScopeNote)}
              </span>
              {"\n          "}
              {v.veHasOwn ? <>
                {"\n            "}
                <button data-dc-tpl="1517" onClick={v.veUseAll} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                  Bruk innstillingene for alle slides
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1518" style={{"display":"flex","alignItems":"center","gap":"6px","flexWrap":"wrap"}}>
              {"\n          "}
              {list(v.veLayers).map(($it1, $i1) => {
                const v1 = { ...v, "l": $it1, $index: $i1 };
                return <React.Fragment key={$i1}>
                  {"\n            "}
                  <button data-dc-tpl="1520" onClick={v1.l?.onClick} style={css(`height:32px; min-height:0; padding:0 14px; border:1px solid #2b2b2b; border-radius:999px; background:${v1.l?.bg ?? ""}; color:${v1.l?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:1px solid #2b2b2b; border-radius:999px; background:{{ l.bg }}; color:{{ l.fg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                    {I(v1.l?.label)}
                  </button>
                  {"\n          "}
                </React.Fragment>;
              })}
              {"\n          "}
              {v.veCanAdd ? <>
                {"\n            "}
                <button data-dc-tpl="1522" onClick={v.veAdd} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"1px dashed #555555","borderRadius":"999px","background":"transparent","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer"}} className="scp1">
                  + Legg til vignett
                </button>
                {"\n          "}
              </> : null}
              {"\n          "}
              {v.veIsExtra ? <>
                {"\n            "}
                <button data-dc-tpl="1524" onClick={v.veRemove} style={{"height":"32px","minHeight":"0","padding":"0 12px","border":"0","borderRadius":"999px","background":"transparent","color":"#ff8f7d","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","marginLeft":"auto"}}>
                  Fjern denne vignetten
                </button>
                {"\n          "}
              </> : null}
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1525" style={{"display":"flex","gap":"18px","flexWrap":"wrap","alignItems":"flex-start"}}>
              {"\n          "}
              <div data-dc-tpl="1526" ref={v.vigEdWrap} onPointerDown={v.onVigEdDown} style={css(`position:${v.vePos ?? "relative"}; top:0; flex:0 0 auto; width:${v.vePW ?? ""}; height:${v.vePH ?? ""}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000; cursor:grab; touch-action:none; user-select:none;`, "position:relative; flex:0 0 auto; width:{{ vePW }}; height:{{ vePH }}; border:1px solid #262626; border-radius:8px; overflow:hidden; background:#000; cursor:grab; touch-action:none; user-select:none;")}>
                {"\n            "}
                <canvas data-dc-tpl="1527" ref={v.vigEdCanvas} style={{"display":"block","width":"100%","height":"100%","pointerEvents":"none"}} />
                {"\n            "}
                <div data-dc-tpl="1528" style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:30px; height:30px; margin:-15px 0 0 -15px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 2px rgba(0,0,0,0.55); pointer-events:none;`, "position:absolute; left:{{ veX }}; top:{{ veY }}; width:30px; height:30px; margin:-15px 0 0 -15px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 2px rgba(0,0,0,0.55); pointer-events:none;")} />
                {"\n            "}
                <div data-dc-tpl="1529" style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:80px; height:2px; margin:-1px 0 0 -40px; background:linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 25%, #ffffff 75%, rgba(255,255,255,0) 100%); transform:rotate(${v.veRotDeg ?? ""}); pointer-events:none;`, "position:absolute; left:{{ veX }}; top:{{ veY }}; width:80px; height:2px; margin:-1px 0 0 -40px; background:linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 25%, #ffffff 75%, rgba(255,255,255,0) 100%); transform:rotate({{ veRotDeg }}); pointer-events:none;")} />
                {"\n            "}
                <div data-dc-tpl="1530" style={css(`position:absolute; left:${v.veX ?? ""}; top:${v.veY ?? ""}; width:6px; height:6px; margin:-3px 0 0 -3px; border-radius:50%; background:#ffffff; pointer-events:none;`, "position:absolute; left:{{ veX }}; top:{{ veY }}; width:6px; height:6px; margin:-3px 0 0 -3px; border-radius:50%; background:#ffffff; pointer-events:none;")} />
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1531" style={{"flex":"1 1 260px","minWidth":"0","display":"flex","flexDirection":"column","gap":"16px"}}>
                {"\n            "}
                <div data-dc-tpl="1532" style={{"display":"flex","flexDirection":"column","gap":"6px","padding":"10px 12px","border":"1px solid #2b2b2b","borderRadius":"10px","background":"#101010"}}>
                  {"\n              "}
                  <div data-dc-tpl="1533" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","gap":"10px"}}>
                    {"\n                "}
                    <span data-dc-tpl="1534" style={{"fontSize":"13px","fontWeight":"700","color":"#f3f1ec"}}>
                      {I(v.veOnLabel)}
                    </span>
                    {"\n                "}
                    <button data-dc-tpl="1535" onClick={v.veToggle} role="switch" aria-label="Vignett av/på" style={css(`flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:${v.veSw0?.track ?? ""}; cursor:pointer; transition:background .18s ease;`, "flex:0 0 auto; position:relative; width:36px; height:22px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ veSw0.track }}; cursor:pointer; transition:background .18s ease;")}>
                      <span data-dc-tpl="1536" style={css(`position:absolute; top:3px; left:${v.veSw0?.x ?? ""}; width:16px; height:16px; border-radius:999px; background:${v.veSw0?.knob ?? ""}; transition:left .18s ease;`, "position:absolute; top:3px; left:{{ veSw0.x }}; width:16px; height:16px; border-radius:999px; background:{{ veSw0.knob }}; transition:left .18s ease;")} />
                    </button>
                    {"\n              "}
                  </div>
                  {"\n              "}
                  <span data-dc-tpl="1537" style={{"fontSize":"11.5px","color":"#9d998f"}}>
                    {I(v.veOnNote)}
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1538" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1539" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    Type
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1540" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(118px, 1fr))","gap":"6px"}}>
                    {"\n                "}
                    {list(v.veTypes).map(($it1, $i1) => {
                      const v1 = { ...v, "t": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="1542" onClick={v1.t?.onClick} style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v1.t?.bd ?? ""}; border-radius:8px; background:${v1.t?.bg ?? ""}; color:${v1.t?.fg ?? ""}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`, "height:34px; min-height:0; padding:0 10px; border:1px solid {{ t.bd }}; border-radius:8px; background:{{ t.bg }}; color:{{ t.fg }}; font:inherit; font-size:12px; font-weight:600; cursor:pointer; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;")}>
                          {I(v1.t?.label)}
                        </button>
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1543" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1544" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1545" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Rotasjon
                    </span>
                    <span data-dc-tpl="1546" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1547" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veRot)}°
                      </span>
                      <button data-dc-tpl="1548" onClick={v.veRot0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0°
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1549" style={{"display":"grid","gridTemplateColumns":"34px minmax(0,1fr) 34px","gap":"8px","alignItems":"center"}}>
                    {"\n                "}
                    <button data-dc-tpl="1550" onClick={v.veRotL} aria-label="Roter mot klokka" style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}}>
                      ⟲
                    </button>
                    {"\n                "}
                    <input data-dc-tpl="1551" type="range" min="-180" max="180" step="1" value={val(v.veRot)} onChange={v.onVeRot} aria-label="Rotasjon" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                    {"\n                "}
                    <button data-dc-tpl="1552" onClick={v.veRotR} aria-label="Roter med klokka" style={{"width":"34px","height":"34px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"15px","cursor":"pointer"}}>
                      ⟳
                    </button>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1553" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1554" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1555" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Styrke
                    </span>
                    <span data-dc-tpl="1556" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1557" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veAmt)}{" %"}
                      </span>
                      <button data-dc-tpl="1558" onClick={v.veAmt100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1559" type="range" min="0" max="200" step="1" value={val(v.veAmt)} onChange={v.onVeAmt} aria-label="Styrke" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1560" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1561">
                      0 % · ingen vignett
                    </span>
                    <span data-dc-tpl="1562">
                      200 % · helt dekket
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1563" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1564" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1565" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Gjennomsiktighet
                    </span>
                    <span data-dc-tpl="1566" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1567" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veTransp)}{" %"}
                      </span>
                      <button data-dc-tpl="1568" onClick={v.veTransp0} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        0 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1569" type="range" min="0" max="100" step="1" value={val(v.veTransp)} onChange={v.onVeTransp} aria-label="Gjennomsiktighet" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1570" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1571">
                      Helt dekkende
                    </span>
                    <span data-dc-tpl="1572">
                      Helt gjennomsiktig
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1573" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1574" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1575" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Diffus
                    </span>
                    <span data-dc-tpl="1576" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1577" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veSoft)}{" %"}
                      </span>
                      <button data-dc-tpl="1578" onClick={v.veSoft50} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        Standard
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1579" type="range" min="0" max="100" step="1" value={val(v.veSoft)} onChange={v.onVeSoft} aria-label="Diffus" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1580" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1581">
                      Skarp kant
                    </span>
                    <span data-dc-tpl="1582">
                      Myk, diffus
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n            "}
                <div data-dc-tpl="1583" style={{"display":"flex","flexDirection":"column","gap":"6px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1584" style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span data-dc-tpl="1585" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                      Størrelse
                    </span>
                    <span data-dc-tpl="1586" style={{"display":"flex","alignItems":"center","gap":"8px","fontSize":"12px","color":"#c9c5bc"}}>
                      <span data-dc-tpl="1587" style={{"fontVariantNumeric":"tabular-nums"}}>
                        {I(v.veSize)}{" %"}
                      </span>
                      <button data-dc-tpl="1588" onClick={v.veSize100} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}}>
                        100 %
                      </button>
                    </span>
                  </span>
                  {"\n              "}
                  <input data-dc-tpl="1589" type="range" min="20" max="300" step="1" value={val(v.veSize)} onChange={v.onVeSize} aria-label="Størrelse" style={{"width":"100%","accentColor":"#e9e7e2"}} />
                  {"\n              "}
                  <span data-dc-tpl="1590" style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"#6f6b64"}}>
                    <span data-dc-tpl="1591">
                      Mindre
                    </span>
                    <span data-dc-tpl="1592">
                      Større
                    </span>
                  </span>
                  {"\n            "}
                </div>
                {"\n\n            "}
                <div data-dc-tpl="1593" style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                  {"\n              "}
                  <span data-dc-tpl="1594" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.14em","textTransform":"uppercase","color":"#9d998f"}}>
                    Farge
                  </span>
                  {"\n              "}
                  <div data-dc-tpl="1595" style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                    {"\n                "}
                    {list(v.veSw).map(($it1, $i1) => {
                      const v1 = { ...v, "w": $it1, $index: $i1 };
                      return <React.Fragment key={$i1}>
                        {"\n                  "}
                        <button data-dc-tpl="1597" data-keep-color="1" onClick={v1.w?.onClick} title={v1.w?.c} aria-label={`Farge ${v1.w?.c ?? ""}`} style={css(`width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:${v1.w?.c ?? ""}; box-shadow:${v1.w?.ring ?? ""}; cursor:pointer;`, "width:26px; height:26px; min-height:0; padding:0; border:0; border-radius:999px; background:{{ w.c }}; box-shadow:{{ w.ring }}; cursor:pointer;")} />
                        {"\n                "}
                      </React.Fragment>;
                    })}
                    {"\n                "}
                    <label data-dc-tpl="1598" style={{"display":"flex","alignItems":"center","gap":"6px","height":"28px","padding":"0 10px 0 4px","border":"1px solid #2b2b2b","borderRadius":"999px","cursor":"pointer","fontSize":"12px","fontWeight":"600","color":"#c9c5bc"}}>
                      {"\n                  "}
                      <input data-dc-tpl="1599" type="color" value={val(v.veColor)} onChange={v.onVeColor} style={{"width":"20px","height":"20px","minHeight":"0","padding":"0","border":"0","borderRadius":"999px","background":"transparent","cursor":"pointer"}} />
                      {"\n                  "}
                      <span data-dc-tpl="1600">
                        Egen farge
                      </span>
                      {"\n                "}
                    </label>
                    {"\n              "}
                  </div>
                  {"\n            "}
                </div>
                {"\n            "}
                <button data-dc-tpl="1601" onClick={v.veCenter} style={{"alignSelf":"flex-start","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                  Midtstill punktet
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.eyedropOn ? <>
        {"\n    "}
        <div data-dc-tpl="1603" style={{"position":"fixed","left":"50%","top":"16px","transform":"translateX(-50%)","zIndex":"9700","display":"flex","alignItems":"center","gap":"12px","padding":"10px 12px 10px 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#0d0d0d","boxShadow":"0 12px 30px rgba(0,0,0,0.6)","fontSize":"13px","color":"#f3f1ec"}}>
          {"\n      "}
          <span data-dc-tpl="1604">
            Klikk i forhåndsvisningen for å hente en farge
          </span>
          {"\n      "}
          <button data-dc-tpl="1605" onClick={v.cancelEyedrop} style={{"height":"30px","minHeight":"0","padding":"0 12px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer"}}>
            Avbryt
          </button>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.hexOpen ? <>
        {"\n    "}
        <div data-dc-tpl="1607" id="hex-pop" role="dialog" aria-label="Velg farge" style={css(`position:fixed; left:${v.hexX ?? ""}; top:${v.hexY ?? ""}; z-index:9600; width:260px; box-sizing:border-box; display:flex; flex-direction:column; gap:10px; padding:12px; border:1px solid #2b2b2b; border-radius:14px; background:#0d0d0d; box-shadow:0 18px 40px rgba(0,0,0,0.6);`, "position:fixed; left:{{ hexX }}; top:{{ hexY }}; z-index:9600; width:260px; box-sizing:border-box; display:flex; flex-direction:column; gap:10px; padding:12px; border:1px solid #2b2b2b; border-radius:14px; background:#0d0d0d; box-shadow:0 18px 40px rgba(0,0,0,0.6);")}>
          {"\n      "}
          <div data-dc-tpl="1608" data-keep-color="1" onPointerDown={v.onPickSV} aria-label="Metning og lysstyrke" style={css(`position:relative; height:140px; border-radius:8px; background-color:${v.pickHueColor ?? ""}; background-image:linear-gradient(to top, #000000, rgba(0,0,0,0)), linear-gradient(to right, #ffffff, rgba(255,255,255,0)); cursor:crosshair; touch-action:none;`, "position:relative; height:140px; border-radius:8px; background-color:{{ pickHueColor }}; background-image:linear-gradient(to top, #000000, rgba(0,0,0,0)), linear-gradient(to right, #ffffff, rgba(255,255,255,0)); cursor:crosshair; touch-action:none;")}>
            {"\n        "}
            <div data-dc-tpl="1609" style={css(`position:absolute; left:${v.pickSX ?? ""}; top:${v.pickVY ?? ""}; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;`, "position:absolute; left:{{ pickSX }}; top:{{ pickVY }}; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;")} />
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="1610" style={{"display":"flex","alignItems":"center","gap":"8px"}}>
            {"\n        "}
            <div data-dc-tpl="1611" onPointerDown={v.onPickHue} aria-label="Fargetone" style={{"position":"relative","flex":"1 1 auto","height":"14px","borderRadius":"999px","background":"linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)","cursor":"pointer","touchAction":"none"}}>
              {"\n          "}
              <div data-dc-tpl="1612" data-keep-color="1" style={css(`position:absolute; left:${v.pickHX ?? ""}; top:50%; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; background:${v.pickHueColor ?? ""}; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;`, "position:absolute; left:{{ pickHX }}; top:50%; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; background:{{ pickHueColor }}; border:2px solid #ffffff; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none;")} />
              {"\n        "}
            </div>
            {"\n        "}
            <button data-dc-tpl="1613" onClick={v.startEyedrop} title="Hent en farge fra bildet" aria-label="Pipette" style={{"flex":"0 0 auto","width":"32px","height":"32px","minHeight":"0","padding":"0","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} className="scp1">
              <svg data-dc-tpl="1614" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path data-dc-tpl="1615" d="m2 22 1-1h3l9-9" />
                <path data-dc-tpl="1616" d="M3 21v-3l9-9" />
                <path data-dc-tpl="1617" d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
              </svg>
            </button>
            {"\n      "}
          </div>
          {"\n      "}
          <div data-dc-tpl="1618" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
            {"\n        "}
            <span data-dc-tpl="1619" data-keep-color="1" style={css(`flex:0 0 auto; width:38px; height:38px; border-radius:10px; border:1px solid #3a3a3a; background:${v.hexSwatch ?? ""};`, "flex:0 0 auto; width:38px; height:38px; border-radius:10px; border:1px solid #3a3a3a; background:{{ hexSwatch }};")} />
            {"\n        "}
            <label data-dc-tpl="1620" style={{"flex":"1 1 auto","minWidth":"0","display":"flex","flexDirection":"column","gap":"3px"}}>
              {"\n          "}
              <span data-dc-tpl="1621" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.12em","textTransform":"uppercase","color":"#9d998f"}}>
                Hex-kode
              </span>
              {"\n          "}
              <input data-dc-tpl="1622" value={val(v.hexDraft)} onChange={v.onHexInput} onKeyDown={v.onHexKey} maxlength="7" spellcheck="false" autocomplete="off" autofocus="autofocus" placeholder="#RRGGBB" style={css(`height:34px; min-height:0; padding:0 10px; border:1px solid ${v.hexBorder ?? ""}; border-radius:8px; background:#000; color:#f3f1ec; font:600 14px ui-monospace, Menlo, monospace; letter-spacing:0.06em; outline:none; min-width:0;`, "height:34px; min-height:0; padding:0 10px; border:1px solid {{ hexBorder }}; border-radius:8px; background:#000; color:#f3f1ec; font:600 14px ui-monospace, Menlo, monospace; letter-spacing:0.06em; outline:none; min-width:0;")} />
              {"\n        "}
            </label>
            {"\n      "}
          </div>
          {"\n\n      "}
          <label data-dc-tpl="1623" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
            {"\n        "}
            <span data-dc-tpl="1624" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
              <span data-dc-tpl="1625" style={{"fontWeight":"600"}}>
                Toning
              </span>
              <span data-dc-tpl="1626" style={{"fontVariantNumeric":"tabular-nums"}}>
                {I(v.hexToneLabel)}
              </span>
            </span>
            {"\n        "}
            <input data-dc-tpl="1627" data-keep-color="1" type="range" min="-100" max="100" step="1" value={val(v.hexTone)} onChange={v.onHexTone} aria-label="Toning" style={css(`width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:${v.hexToneBg ?? ""}; -webkit-appearance:none; appearance:none; cursor:pointer;`, "width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:{{ hexToneBg }}; -webkit-appearance:none; appearance:none; cursor:pointer;")} />
            {"\n        "}
            <span data-dc-tpl="1628" style={{"display":"flex","justifyContent":"space-between","fontSize":"10.5px","color":"#6f6b64"}}>
              <span data-dc-tpl="1629">
                Mørkere
              </span>
              <span data-dc-tpl="1630">
                Lysere
              </span>
            </span>
            {"\n      "}
          </label>
          {"\n      "}
          <label data-dc-tpl="1631" style={{"display":"flex","flexDirection":"column","gap":"5px"}}>
            {"\n        "}
            <span data-dc-tpl="1632" style={{"display":"flex","justifyContent":"space-between","fontSize":"11.5px","color":"#9d998f"}}>
              <span data-dc-tpl="1633" style={{"fontWeight":"600"}}>
                Varme
              </span>
              <span data-dc-tpl="1634" style={{"fontVariantNumeric":"tabular-nums"}}>
                {I(v.hexWarmLabel)}
              </span>
            </span>
            {"\n        "}
            <input data-dc-tpl="1635" data-keep-color="1" type="range" min="-100" max="100" step="1" value={val(v.hexWarm)} onChange={v.onHexWarm} aria-label="Varme" style={css(`width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:${v.hexWarmBg ?? ""}; -webkit-appearance:none; appearance:none; cursor:pointer;`, "width:100%; height:14px; min-height:0; margin:0; border-radius:999px; background:{{ hexWarmBg }}; -webkit-appearance:none; appearance:none; cursor:pointer;")} />
            {"\n        "}
            <span data-dc-tpl="1636" style={{"display":"flex","justifyContent":"space-between","fontSize":"10.5px","color":"#6f6b64"}}>
              <span data-dc-tpl="1637">
                Kaldere
              </span>
              <span data-dc-tpl="1638">
                Varmere
              </span>
            </span>
            {"\n      "}
          </label>
          {"\n      "}
          <button data-dc-tpl="1639" onClick={v.hexAdjReset} style={{"alignSelf":"flex-start","border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"11.5px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px","marginTop":"-4px"}} className="scp4">
            Nullstill toning og varme
          </button>
          {"\n      "}
          <div data-dc-tpl="1640" style={{"display":"flex","gap":"8px"}}>
            {"\n        "}
            <button data-dc-tpl="1641" onClick={v.hexWheel} style={{"flex":"1 1 auto","height":"34px","minHeight":"0","padding":"0 10px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"7px"}} className="scp2">
              <span data-dc-tpl="1642" style={{"width":"14px","height":"14px","borderRadius":"999px","background":"conic-gradient(#ff5d5d, #ffd23f, #6ee07a, #4fc3ff, #b18cff, #ff5d5d)"}} />
              <span data-dc-tpl="1643">
                Fargehjul
              </span>
            </button>
            {"\n        "}
            <button data-dc-tpl="1644" onClick={v.hexOk} style={{"flex":"0 0 auto","height":"34px","minHeight":"0","padding":"0 16px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
              OK
            </button>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.panModal ? <>
        {"\n    "}
        <div data-dc-tpl="1646" role="dialog" aria-modal="true" aria-label="Rediger bilde" style={{"position":"fixed","inset":"0","zIndex":"9500","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div data-dc-tpl="1647" style={{"width":"min(980px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            <div data-dc-tpl="1648" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","alignSelf":"flex-start"}}>
              {"\n          "}
              <button data-dc-tpl="1649" onClick={v.edTabPan} title={v.edPanTitle} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                Flytt utsnitt
              </button>
              {"\n          "}
              <button data-dc-tpl="1650" onClick={v.edTabCrop} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"transparent","color":"#c9c5bc","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                Beskjær
              </button>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1651" style={{"display":"flex","flexDirection":"column","gap":"4px"}}>
              {"\n          "}
              <span data-dc-tpl="1652" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                Flytt utsnitt
              </span>
              {"\n          "}
              <span data-dc-tpl="1653" style={{"fontSize":"12.5px","color":"#9d998f","textWrap":"pretty"}}>
                Dra rammen dit du vil. Det som er inne i rammen, vises i videoen. Bildet beskjæres ikke.
              </span>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1654" style={{"display":"flex","justifyContent":"center","padding":"4px 0"}}>
              {"\n          "}
              <div data-dc-tpl="1655" ref={v.panWrapRef} style={css(`position:relative; width:${v.panDispW ?? ""}; height:${v.panDispH ?? ""}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;`, "position:relative; width:{{ panDispW }}; height:{{ panDispH }}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;")}>
                {"\n            "}
                <div data-dc-tpl="1656" style={css(`width:100%; height:100%; background-image:${v.panImgBg ?? ""}; background-size:100% 100%; pointer-events:none;`, "width:100%; height:100%; background-image:{{ panImgBg }}; background-size:100% 100%; pointer-events:none;")} />
                {"\n            "}
                <div data-dc-tpl="1657" onPointerDown={v.onPanFrameDown} style={css(`position:absolute; left:${v.pfL ?? ""}; top:${v.pfT ?? ""}; width:${v.pfW ?? ""}; height:${v.pfH ?? ""}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:grab; touch-action:none; display:flex; align-items:center; justify-content:center;`, "position:absolute; left:{{ pfL }}; top:{{ pfT }}; width:{{ pfW }}; height:{{ pfH }}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:grab; touch-action:none; display:flex; align-items:center; justify-content:center;")}>
                  {"\n              "}
                  <div data-dc-tpl="1658" style={{"position":"absolute","left":"33.333%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1659" style={{"position":"absolute","left":"66.666%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1660" style={{"position":"absolute","top":"33.333%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1661" style={{"position":"absolute","top":"66.666%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1662" style={{"width":"44px","height":"44px","borderRadius":"999px","background":"rgba(0,0,0,0.55)","border":"1px solid rgba(255,255,255,0.6)","display":"flex","alignItems":"center","justifyContent":"center","color":"#ffffff","pointerEvents":"none"}}>
                    <svg data-dc-tpl="1663" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path data-dc-tpl="1664" d="M12 2v20M2 12h20M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" />
                    </svg>
                  </div>
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1665" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
              {"\n          "}
              <button data-dc-tpl="1666" onClick={v.panReset} style={{"border":"0","padding":"0","minHeight":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                Midtstill
              </button>
              {"\n          "}
              <div data-dc-tpl="1667" style={{"display":"flex","gap":"8px","marginLeft":"auto"}}>
                {"\n            "}
                <button data-dc-tpl="1668" onClick={v.panCancel} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                  Avbryt
                </button>
                {"\n            "}
                <button data-dc-tpl="1669" onClick={v.panDone} style={{"height":"40px","padding":"0 22px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                  Ferdig
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.cropOpen ? <>
        {"\n    "}
        <div data-dc-tpl="1671" role="dialog" aria-modal="true" aria-label={v.cropTitle} style={{"position":"fixed","inset":"0","zIndex":"9500","background":"rgba(0,0,0,0.9)","display":"flex","alignItems":"center","justifyContent":"center","padding":"12px"}}>
          {"\n      "}
          <div data-dc-tpl="1672" style={{"width":"min(980px, 100%)","maxHeight":"100%","overflow":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"18px","border":"1px solid #2b2b2b","borderRadius":"16px","background":"#0a0a0a","boxSizing":"border-box"}}>
            {"\n        "}
            {v.cropIsEdit ? <>
              {"\n        "}
              <div data-dc-tpl="1674" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","alignSelf":"flex-start"}}>
                {"\n          "}
                <button data-dc-tpl="1675" onClick={v.edTabPan} title={v.edPanTitle} style={css(`height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:transparent; color:${v.edPanFg ?? ""}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;`, "height:32px; min-height:0; padding:0 14px; border:0; border-radius:999px; background:transparent; color:{{ edPanFg }}; font:inherit; font-size:12.5px; font-weight:700; cursor:pointer;")}>
                  Flytt utsnitt
                </button>
                {"\n          "}
                <button data-dc-tpl="1676" onClick={v.edTabCrop} style={{"height":"32px","minHeight":"0","padding":"0 14px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"12.5px","fontWeight":"700","cursor":"pointer"}}>
                  Beskjær
                </button>
                {"\n        "}
              </div>
              {"\n        "}
            </> : null}
            {"\n        "}
            <div data-dc-tpl="1677" style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"12px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1678" style={{"display":"flex","flexDirection":"column","gap":"4px","minWidth":"0"}}>
                {"\n            "}
                <span data-dc-tpl="1679" style={{"fontSize":"12px","fontWeight":"600","letterSpacing":"0.22em","textTransform":"uppercase","color":"#e9e7e2"}}>
                  {I(v.cropTitle)}
                </span>
                {"\n            "}
                <span data-dc-tpl="1680" style={{"fontSize":"12.5px","color":"#9d998f","textWrap":"pretty"}}>
                  Dra i rammen for å flytte utsnittet, og i hjørnene for å endre størrelsen.
                </span>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1681" style={{"display":"flex","gap":"3px","padding":"3px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","flexWrap":"wrap"}}>
                {"\n            "}
                {list(v.cropAspects).map(($it1, $i1) => {
                  const v1 = { ...v, "a": $it1, $index: $i1 };
                  return <React.Fragment key={$i1}>
                    {"\n              "}
                    <button data-dc-tpl="1683" onClick={v1.a?.onClick} style={css(`height:30px; padding:0 11px; border:0; border-radius:999px; background:${v1.a?.bg ?? ""}; color:${v1.a?.fg ?? ""}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`, "height:30px; padding:0 11px; border:0; border-radius:999px; background:{{ a.bg }}; color:{{ a.fg }}; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;")}>
                      {I(v1.a?.label)}
                    </button>
                    {"\n            "}
                  </React.Fragment>;
                })}
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1684" style={{"display":"flex","justifyContent":"center","padding":"4px 0"}}>
              {"\n          "}
              <div data-dc-tpl="1685" ref={v.cropWrapRef} style={css(`position:relative; width:${v.cropDispW ?? ""}; height:${v.cropDispH ?? ""}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;`, "position:relative; width:{{ cropDispW }}; height:{{ cropDispH }}; overflow:hidden; touch-action:none; user-select:none; -webkit-user-select:none; background:#000;")}>
                {"\n            "}
                <div data-dc-tpl="1686" style={css(`width:100%; height:100%; background-image:${v.cropBg ?? ""}; background-size:100% 100%; pointer-events:none;`, "width:100%; height:100%; background-image:{{ cropBg }}; background-size:100% 100%; pointer-events:none;")} />
                {"\n            "}
                <div data-dc-tpl="1687" onPointerDown={v.cropMove} style={css(`position:absolute; left:${v.cropL ?? ""}; top:${v.cropT ?? ""}; width:${v.cropW ?? ""}; height:${v.cropH ?? ""}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:move; touch-action:none;`, "position:absolute; left:{{ cropL }}; top:{{ cropT }}; width:{{ cropW }}; height:{{ cropH }}; box-shadow:0 0 0 9999px rgba(0,0,0,0.62); outline:2px solid #ffffff; cursor:move; touch-action:none;")}>
                  {"\n              "}
                  <div data-dc-tpl="1688" style={{"position":"absolute","left":"33.333%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1689" style={{"position":"absolute","left":"66.666%","top":"0","bottom":"0","width":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1690" style={{"position":"absolute","top":"33.333%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1691" style={{"position":"absolute","top":"66.666%","left":"0","right":"0","height":"1px","background":"rgba(255,255,255,0.35)","pointerEvents":"none"}} />
                  {"\n              "}
                  <div data-dc-tpl="1692" onPointerDown={v.cropNW} style={css(`position:absolute; left:${v.cropHO ?? ""}; top:${v.cropHO ?? ""}; cursor:nwse-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`, "position:absolute; left:{{ cropHO }}; top:{{ cropHO }}; cursor:nwse-resize; width:{{ cropHS }}; height:{{ cropHS }}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1693" onPointerDown={v.cropNE} style={css(`position:absolute; right:${v.cropHO ?? ""}; top:${v.cropHO ?? ""}; cursor:nesw-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`, "position:absolute; right:{{ cropHO }}; top:{{ cropHO }}; cursor:nesw-resize; width:{{ cropHS }}; height:{{ cropHS }}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1694" onPointerDown={v.cropSW} style={css(`position:absolute; left:${v.cropHO ?? ""}; bottom:${v.cropHO ?? ""}; cursor:nesw-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`, "position:absolute; left:{{ cropHO }}; bottom:{{ cropHO }}; cursor:nesw-resize; width:{{ cropHS }}; height:{{ cropHS }}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1695" onPointerDown={v.cropSE} style={css(`position:absolute; right:${v.cropHO ?? ""}; bottom:${v.cropHO ?? ""}; cursor:nwse-resize; width:${v.cropHS ?? ""}; height:${v.cropHS ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;`, "position:absolute; right:{{ cropHO }}; bottom:{{ cropHO }}; cursor:nwse-resize; width:{{ cropHS }}; height:{{ cropHS }}; background:#ffffff; border:2px solid #000000; border-radius:4px; box-sizing:border-box; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1696" onPointerDown={v.cropN} style={css(`position:absolute; left:${v.cropELo ?? ""}; top:${v.cropETo ?? ""}; width:${v.cropEL ?? ""}; height:${v.cropET ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;`, "position:absolute; left:{{ cropELo }}; top:{{ cropETo }}; width:{{ cropEL }}; height:{{ cropET }}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1697" onPointerDown={v.cropS} style={css(`position:absolute; left:${v.cropELo ?? ""}; bottom:${v.cropETo ?? ""}; width:${v.cropEL ?? ""}; height:${v.cropET ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;`, "position:absolute; left:{{ cropELo }}; bottom:{{ cropETo }}; width:{{ cropEL }}; height:{{ cropET }}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ns-resize; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1698" onPointerDown={v.cropW2} style={css(`position:absolute; top:${v.cropELo ?? ""}; left:${v.cropETo ?? ""}; width:${v.cropET ?? ""}; height:${v.cropEL ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;`, "position:absolute; top:{{ cropELo }}; left:{{ cropETo }}; width:{{ cropET }}; height:{{ cropEL }}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;")} />
                  {"\n              "}
                  <div data-dc-tpl="1699" onPointerDown={v.cropE} style={css(`position:absolute; top:${v.cropELo ?? ""}; right:${v.cropETo ?? ""}; width:${v.cropET ?? ""}; height:${v.cropEL ?? ""}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;`, "position:absolute; top:{{ cropELo }}; right:{{ cropETo }}; width:{{ cropET }}; height:{{ cropEL }}; background:#ffffff; border:2px solid #000000; border-radius:999px; box-sizing:border-box; cursor:ew-resize; touch-action:none;")} />
                  {"\n            "}
                </div>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n        "}
            <div data-dc-tpl="1700" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","gap":"10px","flexWrap":"wrap"}}>
              {"\n          "}
              <div data-dc-tpl="1701" style={{"display":"flex","alignItems":"center","gap":"10px"}}>
                {"\n            "}
                <span data-dc-tpl="1702" style={{"fontSize":"12px","color":"#9d998f","fontVariantNumeric":"tabular-nums"}}>
                  {I(v.cropSize)}
                </span>
                {"\n            "}
                <button data-dc-tpl="1703" onClick={v.cropReset} style={{"border":"0","padding":"0","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"12px","fontWeight":"600","cursor":"pointer","textDecoration":"underline","textUnderlineOffset":"2px"}} className="scp4">
                  Nullstill
                </button>
                {"\n          "}
              </div>
              {"\n          "}
              <div data-dc-tpl="1704" style={{"display":"flex","gap":"8px","flexWrap":"wrap","marginLeft":"auto"}}>
                {"\n            "}
                <button data-dc-tpl="1705" onClick={v.cropCancel} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"transparent","color":"#9d998f","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp4">
                  Avbryt
                </button>
                {"\n            "}
                <button data-dc-tpl="1706" onClick={v.cropFull} style={{"height":"40px","padding":"0 16px","border":"1px solid #2b2b2b","borderRadius":"999px","background":"#121212","color":"#f3f1ec","font":"inherit","fontSize":"13px","fontWeight":"600","cursor":"pointer"}} className="scp2">
                  Bruk hele bildet
                </button>
                {"\n            "}
                <button data-dc-tpl="1707" onClick={v.cropApply} style={{"height":"40px","padding":"0 20px","border":"0","borderRadius":"999px","background":"#f3f1ec","color":"#000000","font":"inherit","fontSize":"13px","fontWeight":"700","cursor":"pointer"}} className="scp8">
                  Bruk utsnitt
                </button>
                {"\n          "}
              </div>
              {"\n        "}
            </div>
            {"\n      "}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n\n  "}
      {v.mobile ? <>
        {"\n    "}
        <div data-dc-tpl="1709" style={{"position":"fixed","left":"0","right":"0","bottom":"36px","zIndex":"51","display":"flex","gap":"8px","padding":"8px 12px calc(8px + env(safe-area-inset-bottom))","background":"rgba(0,0,0,0.92)","borderTop":"1px solid #262626","backdropFilter":"blur(10px)"}}>
          {"\n      "}
          {list(v.mobileTabs).map(($it1, $i1) => {
            const v1 = { ...v, "m": $it1, $index: $i1 };
            return <React.Fragment key={$i1}>
              {"\n        "}
              <button data-dc-tpl="1711" onClick={v1.m?.onClick} style={css(`flex:1; height:46px; border:1px solid ${v1.m?.border ?? ""}; border-radius:999px; background:${v1.m?.bg ?? ""}; color:${v1.m?.color ?? ""}; font:inherit; font-size:14px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer;`, "flex:1; height:46px; border:1px solid {{ m.border }}; border-radius:999px; background:{{ m.bg }}; color:{{ m.color }}; font:inherit; font-size:14px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer;")}>
                {I(v1.m?.label)}
              </button>
              {"\n      "}
            </React.Fragment>;
          })}
          {"\n    "}
        </div>
        {"\n  "}
      </> : null}
      {"\n  "}
      <footer data-dc-tpl="1712" style={{"position":"fixed","left":"0","right":"0","bottom":"0","zIndex":"50","height":"36px","display":"flex","alignItems":"center","justifyContent":"center","background":"#000","borderTop":"1px solid #262626"}}>
        {"\n    "}
        <span data-dc-tpl="1713" style={{"fontSize":"11px","fontWeight":"600","letterSpacing":"0.24em","textTransform":"uppercase","color":"#9d998f"}}>
          Design by Kristen Utvikling
        </span>
        {"\n  "}
      </footer>
      {"\n\n  "}
      <input data-dc-tpl="1714" type="file" accept="video/*" ref={v.fileVideo} onChange={v.onVideoFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1715" type="file" accept="image/*" ref={v.fileImg} onChange={v.onImgFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1716" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.m4v,.webm" ref={v.fileSlideVid} onChange={v.onSlideVidFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1717" type="file" accept="image/*" ref={v.filePip} onChange={v.onPipFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1718" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" ref={v.fileAudio} onChange={v.onAudioFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1719" type="file" multiple={true} accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" ref={v.fileLib} onChange={v.onLibFiles} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1720" type="file" accept="image/*" ref={v.fileRule} onChange={v.onRuleFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1721" type="file" accept="image/*" ref={v.fileLogo} onChange={v.onLogoFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1722" type="file" accept="image/*" ref={v.fileOcr} onChange={v.onOcrFile} style={{"display":"none"}} />
      {"\n  "}
      <input data-dc-tpl="1723" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" ref={v.fileText} onChange={v.onTextFile} style={{"display":"none"}} />
    </div>
    </>
  );
}
