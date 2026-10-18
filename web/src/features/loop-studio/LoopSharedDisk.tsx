'use no memo'
/* Menighetens disk på startsiden (TB-BB67CB): looper som alle i menigheten kan åpne og endre. Bare Admin ser
   «Slett» (databasen avviser sletting fra andre uansett). Listen hentes på nytt når fanen blir synlig og hvert 30. sekund,
   som felles grunnoppsett (TB-596FE4). Video og musikk følger ikke med en delt loop. */
import { useEffect, useState, type CSSProperties } from 'react'
import type { LoopDiskRow } from '../../services/loop-disk'
import type { HomeVals } from './home-controller'

const NAMES: Record<string, string> = { week: 'Ukeprogram', sunday: 'Søndagsmøte', youth: 'Ungdomsmøte', blank: 'Tom mal' }
const card: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px', padding: '18px 20px', border: '1px solid var(--ml-line, rgba(255,255,255,0.16))', borderRadius: '18px', background: 'var(--ml-card, rgba(12,12,12,0.55))', backdropFilter: 'blur(14px)' }
const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', height: '34px', padding: '0 16px', border: '1px solid var(--ml-fg, #f3f1ec)', borderRadius: '999px', color: 'var(--ml-fg, #f3f1ec)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit' }

export function LoopSharedDisk({ v, tx }: { v: HomeVals; tx: (s: unknown) => string }) {
  const D = v.sharedDisk
  const church = D?.churchId() ?? null
  const [s, setS] = useState<{ rows: LoopDiskRow[]; loading: boolean; err: string }>({ rows: [], loading: true, err: '' })
  const load = () => {
    const c = D?.churchId()
    if (!D || !c) return
    D.svc.list(c).then(
      (rows) => setS({ rows, loading: false, err: '' }),
      () => setS((x) => ({ ...x, loading: false, err: 'Menighetens disk kunne ikke hentes.' })),
    )
  }
  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const t = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load bruker bare stabile tjenester
  }, [church])
  if (!D || !church) return null
  const admin = D.isAdmin()
  const del = async (e: LoopDiskRow) => {
    if (!v.bases.confirm(tx('Slette loopen') + ' «' + e.name + '»?\n\n' + tx('Den slettes fra menighetens disk for alle i menigheten.'))) return
    try {
      await D.svc.remove(e.id)
      load()
    } catch {
      setS((y) => ({ ...y, err: 'Loopen kunne ikke slettes. Bare Admin kan slette.' }))
    }
  }
  return (
    <section data-ch-loop-shared="1" style={{ width: '100%', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--ml-label, #9d998f)' }}>{tx('Menighetens disk')}</div>
      {s.err ? <p role="alert" style={{ margin: 0, color: '#ff8f7d', fontSize: '13px' }}>{tx(s.err)}</p> : null}
      {!s.rows.length ? (
        <p data-ch-loop-shared-empty="1" style={{ margin: 0, fontSize: '13.5px', color: 'var(--ml-muted, #b3afa6)' }}>
          {tx(s.loading ? 'Laster …' : 'Ingen looper på menighetens disk ennå. Velg «Menighetens disk» når du lagrer en loop.')}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {s.rows.map((e) => {
            const q = { mal: e.base, fdisk: e.id }
            const n = Array.isArray(e.data?.slides) ? e.data.slides.length : 0
            return (
              <div key={e.id} data-ch-loop-shared-item={e.name} style={card}>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8fe3cf' }}>
                  {tx('Menighetens disk')} · {tx(NAMES[e.base] ?? 'Egen')}
                </span>
                <b style={{ fontSize: '17px', overflowWrap: 'anywhere' }}>{e.name}</b>
                <span style={{ fontSize: '12.5px', color: 'var(--ml-muted, #b3afa6)' }}>{n} slides · {new Date(e.updated_at).toLocaleDateString()}</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <a
                    href={v.bases.editorHref(q)}
                    data-ch-loop-shared-open="1"
                    style={pill}
                    onClick={(ev) => {
                      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
                      ev.preventDefault()
                      v.bases.open(q)
                    }}
                  >
                    {tx('Åpne')}
                  </a>
                  {admin ? <button type="button" data-ch-loop-shared-del="1" onClick={() => void del(e)} style={{ ...pill, border: '0', color: '#ff8f7d' }}>{tx('Slett')}</button> : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
