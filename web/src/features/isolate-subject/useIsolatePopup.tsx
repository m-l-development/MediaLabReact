import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react'

/** Popupen lastes først når den åpnes (Isolate Subject og AI-koden skal ikke gjøre editorene tyngre å åpne). */
const IsolatePopup = lazy(() => import('./IsolatePopup'))

type Apply = (png: Blob, name: string) => void | Promise<void>
interface Open { blob: Blob; name: string; apply: Apply }

/**
 * «Isoler motiv …» i en editor: `open(blob, navn, sett inn)` viser hele Isolate Subject i en popup med bildet; «Ferdig –
 * sett inn» kaller `apply` med PNG-en, Avbryt lukker uten endringer. `popup` rendres et sted i editoren.
 */
export function useIsolatePopup(): { open: (blob: Blob, name: string, apply: Apply) => void; popup: ReactNode } {
  const [cur, setCur] = useState<Open | null>(null)
  const open = useCallback((blob: Blob, name: string, apply: Apply) => setCur({ blob, name, apply }), [])
  const popup = cur ? (
    <Suspense fallback={null}>
      <IsolatePopup
        blob={cur.blob}
        name={cur.name}
        onClose={() => setCur(null)}
        onInsert={(png, name) => {
          setCur(null)
          void cur.apply(png, name)
        }}
      />
    </Suspense>
  ) : null
  return { open, popup }
}
