# Samhandling i Media Lab: mus, styreflate, tastatur, menyer og tallverdier

Denne siden beskriver samhandlingsmodellen i Media Lab, hvilke referanseplattformer den bygger på, og hvordan
mønstrene er tilpasset hver app. **Kravene til Media Lab går foran plattformenes standard.** Viktigst: loddrett
rulling over en arbeidsflate zoomer og flytter ikke flaten opp og ned.

Kildene er offisiell dokumentasjon der den finnes. «Dokumentert» betyr at det står i plattformens egen hjelp.
«Ikke offisielt bekreftet» betyr at kilden er et forum, en bok eller en tredjepart, eller at vi ikke fant noen offisiell side.

## 1. Referansene: hva de gjør, hva vi lærer, hva Media Lab gjør

| Plattform | Hva den gjør (kilde) | Hva vi lærer | Media Lab |
|---|---|---|---|
| **Photoshop** | Mellomrom = midlertidig Hånd-verktøy. Hjulzoom slås på i Preferences → General («Zoom With Scroll Wheel»). Scrubby sliders: dra over etiketten, Shift = 10×, verdien kan skrives inn og godtas med Enter. ([Hånd](https://helpx.adobe.com/photoshop/using/tool-techniques/hand-tool.html), [zoom](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/zoom-images.html), [paneler](https://helpx.adobe.com/photoshop/using/panels-menus.html)) | Midlertidig verktøy med mellomrom. Zoom ved hjul er et godt valg for bildearbeid. Shift gir større steg. | Mellomrom + dra panorerer på alle lerreter. Hjulet zoomer. Shift + pil gir ti steg i tallfelt. |
| **Lightroom Classic** | Ctrl/⌘ + = / − zoomer. Ctrl/⌘ + Alt + 0 gir 100 %. Page Up/Down ruller i et innzoomet bilde. Mellomrom bytter mellom to zoomnivåer (eldre side). ([snarveier](https://helpx.adobe.com/lightroom-classic/desktop/introduction-to-lightroom-classic/keyboard-shortcuts.html)) | Faste zoomnivåer: tilpass og 100 %. | 0 / Shift+1 tilpasser, Shift+0 gir 100 %. **Ctrl/⌘ ± brukes ikke**, fordi det er nettleserens egen zoom. |
| **Capture One** | Hjulet zoomer i faste trinn (25, 33, 50, 67, 100 % …), uansett verktøy. Mellomrom = midlertidig panorering. Midtknapp panorerer fra 16.8.5. ([zoom](https://support.captureone.com/hc/en-us/articles/360002473237-Viewing-a-magnified-image), [16.8.5](https://support.captureone.com/hc/en-us/articles/38417592388381-Capture-One-16-8-5-release-notes)) | Zoom med musehjulet i faste trinn, og at hjulet virker med alle verktøy. | Ett hakk = 1,25×. Det virker med alle verktøy. Midtknapp + dra panorerer. |
| **Affinity Photo / Designer** | «Use mouse wheel to zoom» finnes som innstilling. Zoomen følger pekeren. En brukerrapport viser at innstillingen ikke skiller mellom mus og styreflate. Ikke offisielt bekreftet. ([bok](https://packtpub.com/en-ua/product/up-and-running-with-affinity-designer-9781801079068/chapter/chapter-1-getting-familiar-with-the-affinity-designers-interface-2/section/navigation-tools-overview-ch02lvl1sec12), [forum](https://forum.affinity.serif.com/index.php?%2Ftopic%2F107209-pinch-to-zoom%2F=)) | Mus og styreflate må behandles hver for seg, ellers blir styreflaten ubrukelig. | Hjul med hakk gir zoom i trinn. Styreflate gir jevn zoom. Sidelengs styreflatebevegelse panorerer. Knip zoomer. |
| **Premiere Pro** | Snarveiene er knyttet til panelet som er aktivt. Ctrl+Alt+K / ⌘⌥K viser panelets snarveier. = / − zoomer tidslinjen. ([snarveier](https://helpx.adobe.com/premiere/desktop/get-started/keyboard-shortcuts/default-keyboard-shortcuts.html)) | Snarveier per panel. En egen oversikt over snarveiene. | Tastene gjelder der fokus er. Snarveiene er av mens en dialog eller meny er åpen og mens man skriver. Snarveipanelet åpnes med «?». |
| **DaVinci Resolve** | Alt/⌥ + hjul zoomer tidslinjen. Vanlig hjul ruller loddrett, Shift + hjul ruller i tid. Ikke offisielt bekreftet: kilden er manualen for 18.6 (speil) og forum. ([18.6](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part3562.htm), [forum](https://forum.blackmagicdesign.com/viewtopic.php?p=772257)) | En tidslinje er ikke et lerret: hjulet ruller, og zoom krever en modifikatortast. | Motion: hjul ruller mellom spor, Shift ruller i tid. Alt + hjul og Ctrl/⌘ + hjul zoomer ved pekeren. |
| **Final Cut Pro** | ⌘+ / ⌘− zoomer. Shift-Z = Zoom to Fit. Option-Shift-Z tilpasser høyden. Hold Z = midlertidig zoomverktøy. ([tidslinje](https://support.apple.com/guide/final-cut-pro/zoom-in-to-and-out-of-the-timeline-ver4e2edcc/mac)) | Shift-Z som «tilpass». | Shift+Z tilpasser tidslinjen (Avansert-modus). |
| **CapCut** | Ctrl/⌘ + B deler, Shift+Z tilpasser, Ctrl ± zoomer. Ikke offisielt bekreftet: bare tredjepartslister. ([liste](https://www.skillademia.com/shortcuts/capcut-shortcuts/)) | Shift+Z går igjen også her. | Samme Shift+Z. Media Lab beholder S for «del» (som før). |
| **Figma** | Shift+1 tilpasser, Shift+2 zoomer til markeringen. Mellomrom eller H gir hånd. Knip og Ctrl/⌘ + hjul zoomer. Piltaster panorerer når ingenting er valgt. Snarveipanel med Ctrl+Shift+?. F6 / Ctrl+F6 gir verktøylinjen fokus. ([zoom](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options), [tastatur](https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard)) | Shift+1 / Shift+0, snarveipanel, tastaturnavigering. | Shift+1 tilpasser og Shift+0 gir 100 %. Snarveipanel med «?» eller Ctrl/⌘+Shift+?. F6 er ikke tatt med (se § 4). |
| **FigJam** | Mellomrom = midlertidig hånd. Shift + hjul ruller sideveis. Ctrl/⌘ + hjul zoomer, og vanlig hjul kan slås på som zoom. Zoomprosenten kan skrives inn. Shift+1 / Shift+2. ([pan og zoom](https://help.figma.com/hc/en-us/articles/1500004414582-Pan-and-zoom-in-FigJam)) | Zoomprosenten kan skrives inn. | Zoomprosenten kan skrives inn i Photo Design og i maskeredigeringen. |
| **Canva** | Ctrl ± zoomer, Ctrl+0 gir faktisk størrelse, Alt+Ctrl+0 tilpasser. Ctrl+D dupliserer, Ctrl+G grupperer, Alt+Shift+L låser. ([snarveier](https://www.canva.com/help/canva-keyboard-shortcuts/)) | Dupliser, grupper og lås som vanlige handlinger. | Ctrl/⌘ + D og Ctrl/⌘ + G. Lås og skjul ligger i høyreklikkmenyen. |
| **Illustrator** | Ctrl ± zoomer. Ctrl + mellomrom gir zoomverktøyet. Fant ingen offisiell innstilling for zoom med hjulet. ([navigasjon](https://helpx.adobe.com/illustrator/desktop/get-started/learn-the-basics/navigate-and-zoom-artwork.html)) | Vektorprogrammene ruller som standard, derfor er hjulzoom et bevisst valg hos oss. | Hjulzoom på lerreter (kravet ditt). Rulling i paneler er uendret. |
| **After Effects** | `.` / `,` zoomer visningen, Shift+/ tilpasser, / gir 100 %. = / − zoomer i tid, Shift+; viser hele komposisjonen. D sentrerer på spillehodet. ([snarveier](https://helpx.adobe.com/after-effects/using/keyboard-shortcuts-reference.html), [visninger](https://helpx.adobe.com/after-effects/desktop/view-and-preview/preview-video-and-audio/modifying-using-views.html)) | Zoom i tid forankres ved spillehodet når tastene brukes. | + / − i Motion zoomer rundt spillehodet. Hjulet zoomer ved pekeren. |
| **Blender** | Hjulet zoomer. Shift + midtknapp panorerer, Shift + hjul panorerer. Home viser alt, Numpad . viser det valgte. Tallfelt: klikk og skriv, Enter godtar, Esc avbryter, Ctrl + hjul endrer verdien. ([navigasjon](https://docs.blender.org/manual/en/latest/editors/3dview/navigate/navigation.html), [felt](https://docs.blender.org/manual/en/latest/interface/controls/buttons/fields.html)) | Hjulet zoomer i arbeidsflater. Tallfelt fungerer med Enter og Esc. | Hjulet zoomer. Shift + hjul panorerer sideveis. Tallfelt bruker Enter og Escape. Ctrl + hjul over tallfelt er ikke tatt med, fordi det er nettleserens zoom. |
| **Miro** | Musmodus: hjulet zoomer, høyre knapp + dra panorerer. Styreflatemodus: to fingre panorerer, knip zoomer. Mellomrom + dra panorerer. V/H bytter verktøy. ([mus og styreflate](https://help.miro.com/hc/en-us/articles/360017731053-Using-Miro-with-a-mouse-trackpad-or-touchscreen), [snarveier](https://help.miro.com/hc/en-us/articles/360017731033-Shortcuts-and-hotkeys)) | Mus og styreflate trenger ulike regler. | Hakk gir trinn, styreflate gir jevn bevegelse. Høyre knapp + dra er **ikke** tatt med, fordi høyreklikk skal gi en meny. |

## 2. Modellen Media Lab bruker

**Lerreter: Photo Design, Thumbnail Studio, maskeredigeringen, Loop-forhåndsvisningen** (`shared/lib/workspace-nav.ts`, `useStageNav.ts`)
- Loddrett hjul og to fingre zoomer rundt pekeren. Hakk gir 1,25× per hakk, opptil 3 hakk per hendelse. Styreflate og knip gir `exp(−dy·0,01)`.
- Dominerende sidelengs bevegelse og Shift + hjul ruller sideveis. Alt + hjul endrer penselstørrelsen i maskeredigeringen.
- Mellomrom + dra og midtknapp + dra panorerer. Verktøyet får ikke klikket, så panorering tegner, flytter eller markerer aldri noe.
- `+` / `−` zoomer. `0` og Shift+1 tilpasser, Shift+0 gir 100 %, Alt+0 gir forrige visning. Ctrl/⌘ ± og Ctrl/⌘ + 0 tilhører nettleseren og brukes ikke.
- Escape under en draing avbryter: dokumentet går tilbake til slik det var, uten angresteg (Photo, Thumbnail, maskeredigeringen og Motion).
- Når bildet er mindre enn flaten, står det sentrert. Forankringen ved pekeren gjelder når bildet er større enn flaten, som i Photoshop.

**Tidslinjen i Motion Design**
- Hjulet ruller mellom spor, og Shift + hjul ruller i tid.
- Ctrl/⌘ + hjul, Alt + hjul og knip zoomer i tid ved pekeren.
- `+` / `−` zoomer rundt spillehodet. Shift+Z tilpasser hele tidslinjen.

**Paneler, menyer, lister og tekstfelt** ruller som vanlig. Hjulet fanges bare over selve arbeidsflaten. Elementer med egen rulling kan merkes `data-scroll-native`.

**Høyreklikkmenyer** (`shared/ui/ContextMenu.tsx`)
- Menyen åpnes ved pekeren og holder seg innenfor vinduet. Første valg får fokus. Piltaster, Home og End flytter, Enter og mellomrom velger, Escape og Tab lukker, og fokus går tilbake dit det var.
- Shift+F10 og menytasten åpner menyen når arbeidsflaten eller kortet har fokus.
- Høyreklikk i seg selv endrer aldri noe. I tekstfelt og på steder uten egne handlinger vises nettleserens vanlige meny.

**Hurtigtaster** (`shared/ui/shortcuts.ts`, `ShortcutsPanel.tsx`)
- Ctrl på Windows og ⌘ på macOS. Like handlinger har samme tast i alle appene.
- Tastene virker ikke mens man skriver, eller mens en dialog eller meny er åpen.
- Panelet er søkbart og åpnes med «?» eller Ctrl/⌘+Shift+?, eller med tastatur-knappen nederst til høyre i hver app.

**Tallverdier** (`shared/ui/NumField.tsx`)
- Klikk, Enter eller F2 gir et felt der hele verdien er markert.
- Enter (og klikk utenfor) godtar, Escape forkaster. Pil opp/ned endrer med ett steg, Shift med ti.
- Desimalkomma, minus og enhet godtas. Verdien holdes innenfor grensene. Ugyldig tekst gir en beskjed med `role="alert"`, og siste gyldige verdi beholdes.
- Verdien vises med stiplet understrek og har tydelig fokusmarkering. Det tilgjengelige navnet er «Etikett: verdi».

## 3. Endringer per app

| App | Endret |
|---|---|
| **Photo Design** | Hjul og knip zoomer ved pekeren. Panorering med mellomrom eller midtknapp. Tallfelt i alle glidere og zoomprosent som kan skrives inn, med egen tilpass-knapp. Escape avbryter draing. Ctrl/⌘ + C/X/V for lag. Forrige visning (Alt+0). Høyreklikkmeny for lag (kopier, klipp ut, lim inn, dupliser, grupper / del opp, flytt fram / bak, skjul, lås, slett, angre, visning) og for tom flate (lim inn, velg alle, visning). Arbeidsflaten kan få fokus, og Shift+F10 åpner menyen. Delete og Ctrl+Z i maskedialogen virker ikke lenger på dokumentet bak. |
| **Thumbnail Studio** | Samme lerretsmodell. Escape avbryter draing. Forrige visning. Lagmenyen bruker den felles menyen og har fått visningshandlinger. Shift+F10 virker. Taster sperres mens maskeredigering eller meny er åpen. |
| **Maskeredigeringen** (Isolate, Photo, Thumbnail) | Ny hjul- og styreflateregel. Høyreklikkmeny (Behold/Fjern, verktøy, angre, visning). Penselstørrelse, hardhet og zoom kan skrives inn. Escape avbryter strøket. |
| **Isolate Subject** | «Myke kanter» og «Stram inn kantene» viser og tar imot tall. |
| **Motion Design** | Alt + hjul zoomer i tid, og musehjulet zoomer i trinn. Tall ved glidere og effekter kan skrives inn. Tidslinjens mønster er dokumentert. |
| **Loop Studio** | Rulling zoomer uten Ctrl. Tallene ved glidebryterne er merket, kan klikkes (før: bare dobbeltklikk), nås med Tab og har navn. Pil opp/ned virker, og ugyldig tekst gir en beskjed. |
| **Mockups** | Høyreklikkmeny på mockupen (bytt eller plasser design, vis hele, roter, speil, tilbakestill, fjern, angre / gjør om, forrige / neste). «Gjør om» (Ctrl/⌘+Shift+Z, Ctrl+Y) og egen knapp. Arbeidsflaten kan få fokus. Felles tallfelt. |
| **Dine medier** | Kortene kan få fokus. Høyreklikk og Shift+F10 gir «Åpne i …», «Last ned» og «Slett …» (spør først). Delete på et kort sletter etter bekreftelse. |
| **Fyllredigeringen** (Photo, Thumbnail) | Posisjon, mengde, retning, overgang, skarphet og antall kan skrives inn. |
| **Alle apper** | Søkbart snarveipanel. Fokusmarkering for arbeidsflater (`data-focus-region`). |

## 4. Bevisste avvik og begrensninger

- **Ctrl/⌘ ± og Ctrl/⌘ + 0** zoomer siden i nettleseren. Media Lab bruker derfor `+`, `−`, `0`, Shift+1 og Shift+0.
- **F6** gir fokus til adressefeltet i nettleseren. Media Lab bruker vanlig Tab-rekkefølge og synlig fokus i stedet.
- **Høyre knapp + dra for å panorere** (Miro) passer ikke, fordi høyreklikk skal gi en meny.
- **Zoom til markering** (Figma Shift+2) og **dra over etiketten for å endre verdien** (Photoshop, Blender) er ikke laget ennå.
- Dra og slipp har allerede terskel og slippemarkering i Photo, Thumbnail, Motion og Loop. Escape-avbryt er lagt til der den manglet. Slipp mellom apper går via «Bruk i …» og Dine medier.
- Fysisk mus og styreflate er ikke prøvd. Testene sender hjul-, peker- og tastehendelser med de verdiene nettleserne gir: hakk på 100/120 eller `deltaMode` 1, brøkdeler for styreflate, og `ctrlKey` for knip.
