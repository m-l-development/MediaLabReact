import { useEffect, useState, type FormEvent } from 'react'
import { DEFAULT_QUOTA_MB, type Church, type StorageUsage } from '../../services/admin'
import type { ChurchSubscription, Plan, SubscriptionRequest } from '../../services/collab'
import { useAdmin } from './context'
import { mb } from './lib'
import { Cancelled } from './members'
import { Badge, Btn, Card, Field, List, StatusBadge } from './ui'

/**
 * Abonnement, planer, kvoter og samlet lagringsgrense (ADM-09), portert fra SubsView, PlanEditor, StorageCard og
 * ChurchQuotaCard i dagens sections.jsx. Ingen betaling. Planene er bare veiledende og endrer aldri menighetenes kvote.
 */
const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }
const isOwnQuota = (c: Church) => c.storage_quota_mb !== DEFAULT_QUOTA_MB

function QuotaBadge({ church }: { church: Church }) {
  const { t } = useAdmin()
  return <Badge tone={isOwnQuota(church) ? 'warn' : ''}>{t(isOwnQuota(church) ? 'Egen kvote' : 'Standard')}</Badge>
}
function usePrice() {
  const { t } = useAdmin()
  return (v: number | null | undefined) => (v === 0 ? t('Gratis') : v ? v + ' kr/mnd' : t('Avtales'))
}

/** Developer endrer planens veiledende lagring og pris. Databasen krever MFA og loggfører gammel og ny verdi. */
function PlanEditor({ plan, onCancel, onDone }: { plan: Plan; onCancel: () => void; onDone: () => Promise<void> }) {
  const { act, say, collabSvc, t } = useAdmin()
  const priceText = usePrice()
  const [f, setF] = useState({ quota: String(plan.storage_quota_mb ?? ''), price: plan.price_nok_month == null ? '' : String(plan.price_nok_month) })
  const qs = f.quota.trim(), ps = f.price.trim()
  const okQ = /^\d{1,5}$/.test(qs) && +qs <= 10240, okP = ps === '' || /^\d{1,7}$/.test(ps)
  const q = okQ ? +qs : null, price = ps === '' ? null : +ps
  const quotaChanged = okQ && q !== plan.storage_quota_mb, priceChanged = okP && price !== plan.price_nok_month
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!okQ || !okP || q == null || (!quotaChanged && !priceChanged)) return
    void act(async () => {
      const lines = [t('Lagre endringen for') + ' «' + t(plan.name) + '»?']
      if (quotaChanged) lines.push(t('Planens lagring (veiledende)') + ': ' + String(plan.storage_quota_mb) + ' MB → ' + q + ' MB')
      if (priceChanged) lines.push(t('Pris') + ': ' + priceText(plan.price_nok_month) + ' → ' + priceText(price))
      lines.push(t('Menighetenes faktiske kvoter endres ikke.'))
      confirmOr(lines.join('\n'))
      await collabSvc.subscriptions.updatePlan(plan.code, q, price)
      say(t('Planen er endret.'))
      await onDone()
    })()
  }
  return (
    <form className="ch-form ch-plan-edit" onSubmit={save} aria-label={t('Endre plan') + ' ' + t(plan.name)}>
      <Field label="Planens lagring (MB, veiledende, 0–10240)"><input className="ch-input" inputMode="numeric" value={f.quota} onChange={(e) => setF((x) => ({ ...x, quota: e.target.value }))} aria-invalid={!okQ} /></Field>
      <Field label="Pris (kr/mnd, tom = Avtales)"><input className="ch-input" inputMode="numeric" value={f.price} onChange={(e) => setF((x) => ({ ...x, price: e.target.value }))} aria-invalid={!okP} /></Field>
      {(!okQ || !okP) && <p className="ch-note bad">{t('Lagring må være et helt tall mellom 0 og 10240. Pris må være et helt tall (eller tom).')}</p>}
      <div className="ch-row">
        <Btn kind="primary" type="submit" disabled={!okQ || !okP || (!quotaChanged && !priceChanged)}>{t('Lagre plan')}</Btn>
        <Btn onClick={onCancel}>{t('Avbryt')}</Btn>
      </div>
      <p className="ch-muted">{t('Endringen loggføres med gammel og ny verdi. Planens lagring er bare veiledende – menighetenes faktiske kvoter endres ikke. Ingen filer slettes.')}</p>
    </form>
  )
}

interface Storage { used_bytes: number; limit_mb: number; quota_sum_mb: number; churches: number }
/** Samlet lagringsplass for hele ConnectHub (bare Developer). Overbooking er lov; sperren stopper opplasting når plassen er brukt. */
function StorageCard() {
  const { act, say, admin, t } = useAdmin()
  const [o, setO] = useState<Storage | null>(null), [v, setV] = useState('')
  const load = async () => { const r = (await admin.storageOverview()) as unknown as Storage; setO(r); setV(String(r.limit_mb)) }
  useEffect(() => { void act(async () => { const r = (await admin.storageOverview()) as unknown as Storage; setO(r); setV(String(r.limit_mb)) })() }, [act, admin])
  if (!o) return null
  const lim = o.limit_mb * 1048576, pct = lim ? Math.min(100, Math.round((100 * o.used_bytes) / lim)) : 0
  const ok = /^\d{1,7}$/.test(v.trim()) && +v >= 1 && +v <= 1048576
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!ok || +v === o.limit_mb) return
    void act(async () => {
      confirmOr(t('Endre den samlede lagringsgrensen') + ': ' + o.limit_mb + ' MB → ' + +v + ' MB?\n\n' + t('Ingen filer slettes. Er bruken over den nye grensen, stoppes nye opplastinger.'))
      await admin.setStorageLimit(+v)
      say(t('Den samlede lagringsgrensen er endret.'))
      await load()
    })()
  }
  return (
    <Card title="Samlet lagringsplass">
      <div className="ch-meter" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>
      <p data-ch-storage="">{t('Brukt')}: {mb(o.used_bytes)} {t('av')} {o.limit_mb} MB ({pct} %) · {t('Ledig')}: {mb(Math.max(0, lim - o.used_bytes))}</p>
      <p className="ch-muted">{t('Summen av alle menighetenes kvoter')}: {o.quota_sum_mb} MB ({o.churches} {t('menigheter')}){o.quota_sum_mb > o.limit_mb ? <> · <Badge tone="warn">{t('Overbooket')}</Badge></> : null}</p>
      <form className="ch-form" onSubmit={save}>
        <Field label="Samlet grense (MB)"><input className="ch-input" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} aria-invalid={!ok} /></Field>
        <Btn type="submit" disabled={!ok || +v === o.limit_mb}>{t('Lagre grense')}</Btn>
      </form>
      <p className="ch-muted">{t('Grensen gjelder alle filer i ConnectHub til sammen. Kvotene kan til sammen være større (overbooking); da stoppes opplasting for alle når den samlede plassen er brukt opp. Du får varsel ved 80 % og 90 %. Endringer loggføres.')}</p>
    </Card>
  )
}

/** Menighetens faktiske kvote, brukt og ledig plass (Admin for egen menighet; Developer ser det samme her). */
function ChurchQuotaCard({ church, usage }: { church: Church; usage: StorageUsage | null }) {
  const { t } = useAdmin()
  const quota = usage ? usage.quota_bytes : (church.storage_quota_mb ?? DEFAULT_QUOTA_MB) * 1048576, used = usage ? usage.used_bytes : null
  const sysFree = usage?.system_free_bytes
  return (
    <Card title="Menighetens lagring">
      <div className="ch-row" data-ch-quota=""><span>{t('Faktisk kvote')}: <b>{church.storage_quota_mb} MB</b></span><QuotaBadge church={church} /></div>
      {used != null && <p className="ch-muted">{t('Brukt')}: {mb(used)} · {t('Ledig')}: {mb(Math.min(Math.max(0, quota - used), sysFree ?? Infinity))}{sysFree != null && sysFree < quota - used ? ' (' + t('begrenset av samlet lagringsplass i ConnectHub') + ')' : ''}</p>}
      <p className="ch-muted">{t('Standard er 200 MB. Trenger menigheten mer plass, kan Developer eller Moderator tildele en egen kvote. Abonnementet endrer ikke kvoten.')}</p>
    </Card>
  )
}

export function SubsView({ churchId }: { churchId: string | null }) {
  const { staff, canManage, churchName, act, say, reload, d, admin, collabSvc, t } = useAdmin()
  const priceText = usePrice()
  const [sub, setSub] = useState<{ plans: Plan[]; current: ChurchSubscription[]; reqs: SubscriptionRequest[]; usage: StorageUsage | null; plan: string; free: boolean; reason: string; note: string }>({ plans: [], current: [], reqs: [], usage: null, plan: 'standard', free: true, reason: '', note: '' })
  const [editing, setEditing] = useState<string | null>(null)
  const churchOf = (id: string) => d.churches.find((c) => c.id === id)
  // planenes veiledende lagring kan bare Developer lese; Admin og User får plannavn og pris
  const load = async () => {
    const [plans, current, reqs, usage] = await Promise.all([
      staff ? collabSvc.subscriptions.plansAdmin() : collabSvc.subscriptions.plans(), collabSvc.subscriptions.current(churchId),
      collabSvc.subscriptions.requests(churchId), churchId ? admin.storageUsage(churchId).catch(() => null) : null,
    ])
    setSub((p) => ({ ...p, plans: plans ?? [], current, reqs, usage }))
  }
  useEffect(() => {
    void act(async () => {
      const [plans, current, reqs, usage] = await Promise.all([
        staff ? collabSvc.subscriptions.plansAdmin() : collabSvc.subscriptions.plans(), collabSvc.subscriptions.current(churchId),
        collabSvc.subscriptions.requests(churchId), churchId ? admin.storageUsage(churchId).catch(() => null) : null,
      ])
      setSub((p) => ({ ...p, plans: plans ?? [], current, reqs, usage }))
    })()
  }, [act, admin, collabSvc, churchId, staff])
  const run = (fn: () => Promise<unknown>, ok: string) => act(async () => { await fn(); say(t(ok)); await load(); await reload() })
  const quotaText = (c: Church | undefined) => (c ? <span className="ch-row"><span>{c.storage_quota_mb} MB</span><QuotaBadge church={c} /></span> : '–')
  const request = (e: FormEvent) => {
    e.preventDefault()
    if (churchId) void run(() => collabSvc.subscriptions.request(churchId, sub.plan, sub.free, sub.reason), 'Forespørselen er sendt.')()
  }
  const church = churchId ? churchOf(churchId) : undefined
  const editPlan = sub.plans.find((p) => p.code === editing)
  return (
    <div className="ch-grid">
      {church && <ChurchQuotaCard church={church} usage={sub.usage} />}
      {staff && !churchId && <StorageCard />}
      <Card title="Planer">
        <List cols={staff ? '1fr auto auto auto' : '1fr auto'} head={staff ? ['Plan', 'Planens lagring (veiledende)', 'Pris', ''] : ['Plan', 'Pris']}
          rows={sub.plans.map((p) => ({ key: p.code, cells: [t(p.name),
            ...(staff ? [String(p.storage_quota_mb) + ' MB'] : []), priceText(p.price_nok_month),
            ...(staff ? [<div key="e" className="ch-end"><Btn small onClick={() => setEditing(editing === p.code ? null : p.code)}>{t(editing === p.code ? 'Lukk' : 'Endre')}</Btn></div>] : [])] }))} />
        {staff && editPlan && <PlanEditor key={editPlan.code} plan={editPlan} onCancel={() => setEditing(null)} onDone={async () => { setEditing(null); await load(); await reload() }} />}
        {staff && <p className="ch-muted">{t('Planens lagring er bare veiledende og gir ikke menigheten mer plass automatisk. Menighetens faktiske kvote er standard 200 MB, eller en egen kvote som du tildeler under Menigheter → Innstillinger.')}</p>}
        <p className="ch-muted">{t('Det tas ikke betalt i ConnectHub ennå. Menigheter kan be om et abonnement eller om gratis abonnement; Developer eller Moderator godkjenner. Abonnementet endrer ikke lagringskvoten.')}</p>
      </Card>
      <Card title="Nåværende abonnement">
        <List cols="1fr auto auto auto" head={['Menighet', 'Plan', 'Gratis', 'Faktisk kvote']} empty="Ingen abonnement registrert. Kvoten er standard 200 MB."
          rows={sub.current.map((c) => ({ key: c.church_id, cells: [churchName(c.church_id), c.plan, t(c.free_of_charge ? 'Ja' : 'Nei'), quotaText(churchOf(c.church_id))] }))} />
        {churchId && canManage(churchId) && !staff && (
          <form className="ch-form" onSubmit={request}>
            <Field label="Plan"><select className="ch-select" value={sub.plan} onChange={(e) => setSub((p) => ({ ...p, plan: e.target.value }))}>{sub.plans.map((p) => <option key={p.code} value={p.code}>{t(p.name)}</option>)}</select></Field>
            <Field label="Begrunnelse (valgfritt)"><input className="ch-input" value={sub.reason} onChange={(e) => setSub((p) => ({ ...p, reason: e.target.value }))} maxLength={1000} /></Field>
            <label className="ch-row ch-muted"><input type="checkbox" checked={sub.free} onChange={(e) => setSub((p) => ({ ...p, free: e.target.checked }))} /> {t('Be om gratis abonnement')}</label>
            <Btn kind="primary" type="submit">{t('Send forespørsel')}</Btn>
          </form>
        )}
      </Card>
      <Card title="Forespørsler" sub={sub.reqs.filter((r) => r.status === 'pending').length + ' ' + t('venter')}>
        {staff && <Field label="Merknad til avgjørelsen (valgfritt)"><input className="ch-input" value={sub.note} onChange={(e) => setSub((p) => ({ ...p, note: e.target.value }))} maxLength={500} /></Field>}
        <List cols="minmax(140px,1fr) auto auto auto" head={['Menighet og plan', 'Gratis', 'Status', '']} empty="Ingen forespørsler."
          rows={sub.reqs.map((r) => ({ key: r.id, cells: [
            <div key="c"><b>{churchName(r.church_id)}</b><div className="ch-muted">{r.plan}{r.reason ? ' · ' + r.reason : ''}{r.decision_note ? ' · ' + r.decision_note : ''}</div>
              {staff && r.status === 'pending' && churchOf(r.church_id) && <div className="ch-row ch-muted">{t('Nåværende kvote')}: {quotaText(churchOf(r.church_id))} · {t('endres ikke ved godkjenning')}</div>}</div>,
            t(r.free_of_charge ? 'Ja' : 'Nei'), <StatusBadge key="s" s={r.status} />,
            r.status === 'pending' ? (staff ? (
              <div key="a" className="ch-end">
                <Btn small kind="primary" onClick={run(() => collabSvc.subscriptions.decide(r.id, true, sub.note), 'Forespørselen er godkjent.')}>{t('Godkjenn')}</Btn>
                <Btn small kind="danger" onClick={run(() => collabSvc.subscriptions.decide(r.id, false, sub.note), 'Forespørselen er avslått.')}>{t('Avslå')}</Btn>
              </div>
            ) : <Btn key="a" small onClick={run(() => collabSvc.subscriptions.withdraw(r.id), 'Forespørselen er trukket tilbake.')}>{t('Trekk tilbake')}</Btn>) : <span key="a" />] }))} />
      </Card>
    </div>
  )
}
