# Media Lab (ny) – medier, objekter og prosjektformat

Status: fase 1 (2026-10-10). Typene implementeres i `web/src/domain/`.

## 1. Fire ting som holdes adskilt

| Begrep | Hva det er | Hvor det lagres |
|---|---|---|
| **Innhold** | Selve bytene (bilde, video, lyd) | `BlobStore`, nøkkel = SHA-256 |
| **Asset** | Identitet + metadata + opphav for ett medium | `assets`-lageret |
| **Prosjekt** | Redigeringsinstruksjoner for ett verktøy; peker på assets med ID | `projects`-lageret |
| **Gjengivelse** | En eksportert fil (PNG, MP4, PDF …) | Nedlasting, eller registreres som ny asset (`origin: 'generated'`) |

Et **bibliotekselement** (gjenbrukbart redigerbart objekt: tekstblokk, form, gruppe, effekt) er et eget objekt med
lag-data og asset-referanser – ikke en fil.

## 2. Typer (utdrag)

```ts
type AssetId = Brand<string, 'AssetId'>          // UUID
type ContentHash = Brand<string, 'ContentHash'>  // sha256 hex
type AssetKind = 'image' | 'video' | 'audio'

interface Asset {
  id: AssetId
  kind: AssetKind
  name: string
  content: { hash: ContentHash; mime: string; size: number }
  meta: { width?: number; height?: number; duration?: number; hasAlpha?: boolean }
  origin:
    | { type: 'upload' }
    | { type: 'generated'; tool: ToolId }                    // f.eks. eksport fra Thumbnail
    | { type: 'derived'; tool: ToolId; from: AssetId; operation: DerivationOp }
    | { type: 'cloud'; fileId: string }                      // ConnectHub-fil (ch:<id>), bare bilder
    | { type: 'builtin'; path: string }                      // /images/…, innebygde mockups
  locations: StorageLocation[]                               // hvor innholdet faktisk ligger
  ownerId: UserId
  createdAt: number
  thumb?: ContentHash                                        // liten forhåndsvisning
}

type StorageLocation =
  | { type: 'local' }                                        // BlobStore i nettleseren
  | { type: 'project-folder'; folderId: string; path: string } // video på brukerens PC
  | { type: 'cloud'; fileId: string }                        // ch-files (bare bilder)
  | { type: 'url'; url: string }                             // innebygde filer

interface DerivationOp { name: string; params?: Record<string, unknown> }  // 'isolate', 'crop', 'export' …
```

## 3. Regler

1. **Originaler endres aldri.** En operasjon som lager nye piksler (isolering, beskjæring som rasteriseres, eksport)
   lager en ny `Asset` med `origin.type = 'derived'` og `from = original`. Originalen er urørt.
2. **Ikke-destruktiv redigering er standard.** Beskjæring, justering og maske i et prosjekt lagres som parametre i
   prosjektet, ikke som nye filer. Først ved «Send til …», eksport eller eksplisitt «Lagre som bilde» rasteriseres det,
   og brukeren ser at resultatet er et nytt bilde.
3. **Samme innhold lagres én gang.** `register(file)` regner ut SHA-256; finnes innholdet, gjenbrukes det.
4. **Referanser, ikke kopier.** Prosjekter lagrer `AssetId`. Et nytt prosjekt som bruker samme bilde, kopierer ikke filen.
5. **Sletting er trygg.** `release(assetId)` sletter bare når ingen prosjekter eller bibliotekselementer refererer til
   assetet (tilsvarer `file_in_use` i databasen). Innhold slettes når ingen assets peker på hashen.
6. **Video aldri i skyen.** `services/assets` avviser `cloud`-lagring for video og lyd; video ligger lokalt eller i
   prosjektmappe.
7. **Ingen binærdata i React.** Komponenter bruker `useAssetUrl(id)`, som lager en object-URL og frigjør den når
   komponenten forsvinner.

## 4. Tjenester

```ts
interface AssetService {
  register(input: Blob | File, opts: { name?: string; origin?: AssetOrigin }): Promise<Asset>
  derive(from: AssetId, result: Blob, op: DerivationOp, tool: ToolId): Promise<Asset>
  get(id: AssetId): Promise<Asset | undefined>
  query(q: { kind?: AssetKind[]; origin?: AssetOrigin['type'][]; text?: string; limit?: number }): Promise<Asset[]>
  open(id: AssetId): Promise<Blob>                 // fra BlobStore, prosjektmappe eller sky
  lineage(id: AssetId): Promise<Asset[]>           // original → avledede
  release(id: AssetId): Promise<'deleted' | 'in-use'>
  subscribe(listener: () => void): () => void
}
```

«Åpne i verktøy» = navigasjon til `/app/<verktøy>?asset=<id>`. Verktøyet henter assetet fra tjenesten; ingenting lastes
opp eller kopieres.

## 5. Delte redigerbare objekter

- **2D-lag** (Photo Design, Thumbnail Studio, frie elementer i Loop Studio): `ImageLayer`, `TextLayer`, `ShapeLayer`,
  `FxLayer`, `GroupLayer` med felles `Transform` (x, y, w, h, rot, flip, opacity, blend) og valgfri `Mask`.
  Verktøyspesifikke felt ligger i `ext` (f.eks. Thumbnail `role`, Photo `back`).
- **Tidslinje** (Motion Design): `Track`, `Clip`, `TextItem`, `Overlay`, `SubtitleCue`, `MusicItem`, `Marker`.
  Loop Studio har slides, ikke en fri tidslinje, og får egen modell; felles er bare effektmotoren der semantikken er lik.
- **Fyll** (`Fill`: solid, gradienttypene fra LE-11) og **justering** (`Adjustments`, `Look`, `Curves`) er felles typer.
- **Bibliotekselement:** `{ id, kind: 'element', name, layers: Layer2D[], assets: AssetId[] }` kan settes inn i ethvert
  2D-verktøy. Innsetting kopierer lagene (ny ID-er), slik at endringer ikke påvirker andre prosjekter.

## 6. Prosjektformat

```ts
interface ProjectEnvelope<TDoc> {
  format: 'medialab.project'
  formatVersion: 1
  id: ProjectId
  tool: ToolId
  schemaVersion: number          // per verktøy, migreres ved åpning
  name: string
  createdAt: number
  updatedAt: number
  scope: 'personal' | 'church'
  doc: TDoc                      // verktøyets data; bare AssetId-referanser
  assets: AssetId[]              // alle referanser (for opprydding og eksport)
  legacy?: { source: string; id: string }   // f.eks. { source: 'photodesign', id: 'p-…' }
}
```

- **Migreringer per verktøy:** `migrations[tool][fromVersion](doc) → doc`, kjøres i rekkefølge ved åpning; feiler en
  migrering, åpnes prosjektet ikke og originalen beholdes uendret med en forståelig feilmelding.
- **Validering** ved åpning, import og før lagring (egne små validatorer i `domain/`).
- **Eksportfil `.mlproj`:** ZIP-fri binær pakke som `.motion` (header, JSON, filer), slik at prosjektet kan flyttes med
  alle medier. Lesing av gamle `.motion`-filer og sikkerhetskopier (JSON) støttes alltid (se migreringsplanen).

## 7. Lagring i nettleseren

Én IndexedDB per bruker: `medialab@<bruker-id>` med lagrene `assets`, `blobs`, `projects`, `elements`, `settings`,
`legacy-imports`. Gamle databaser leses bare (`infrastructure/legacy-import`).
Lagringskvote sjekkes med `navigator.storage.estimate()`; brukeren varsles før det blir fullt, og `persist()` bes om
første gang et prosjekt lagres.
