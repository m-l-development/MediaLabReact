import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { DEFAULT_TEMPLATES, renderMail, TEMPLATE_KEYS, TEMPLATE_NAMES, templateProblem, type Template, type TemplateKey } from '../../shared/mail/mail-render'
import type { MailService, MailSettings, MailStatus, OutboxRow, SavedTemplate } from '../../services/mail'
import { Head } from './common'
import { useAdmin } from './context'
import { fmt } from './lib'
import { Cancelled } from './members'
import { Badge, Btn, Card, Empty, Field, List } from './ui'

/**
 * Mail-fanen (ADM-11), portert fra dagens mail.jsx: e-postmalene ConnectHub sender, med blokker, fast lenkeboks, logo og
 * forhåndsvisning. Forhåndsvisningen bruker samme gjengivelse som serveren (kontrollert av build/mail-render.test.ts) i en
 * sandkasset iframe uten skript. Databasen kontrollerer rolle, MFA og malens innhold på nytt, og loggfører alt.
 */
const BLOCK_NAME: Record<string, string> = { logo: 'Logo', h: 'Overskrift', p: 'Avsnitt', small: 'Liten tekst', hr: 'Skillelinje', link: 'Lenkeboks' }
const KIND: Record<string, string> = { invite: 'Invitasjon', recovery: 'Nytt passord', test: 'Test', request_received: 'Forespørsel mottatt', request_notify: 'Ny forespørsel (til stab)' }
const copy = (t: Template): Template => JSON.parse(JSON.stringify(t)) as Template
const toDataUrl = (blob: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(blob) })
/** Malene, status, innstillinger og utsendinger på én gang; status uten oppsett gir «ikke satt opp». */
const fetchAll = async (mail: MailService) => Promise.all([mail.templates(), mail.status().catch((e: { code?: string }): MailStatus => ({ configured: false, error: e.code })), mail.settings(), mail.outbox().catch((): OutboxRow[] => [])])
/** Logoen i forhåndsvisningen (egen logo fra serveren, ellers standardsymbolet) som data:-adresse. */
const fetchLogo = async (mail: MailService) => {
  const url = await mail.logoUrl().catch(() => null)
  const blob = await fetch(url || '/images/app-icon-192.png').then((r) => r.blob()).catch(() => null)
  return blob ? toDataUrl(blob) : null
}
const confirmOr = (text: string) => { if (!window.confirm(text)) throw new Cancelled('cancel') }

export function MailView() {
  const { act, say, t } = useAdmin()
  const { mail, requestInbox: RQ } = useServices()
  const [key, setKey] = useState<TemplateKey>('welcome')
  const [saved, setSaved] = useState<Partial<Record<string, SavedTemplate>>>({})
  const [draft, setDraft] = useState<Template>(() => copy(DEFAULT_TEMPLATES.welcome))
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [settings, setSettings] = useState<MailSettings | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [outbox, setOutbox] = useState<OutboxRow[]>([])
  const [width, setWidth] = useState(600)
  const [extra, setExtra] = useState(['', '', ''])
  const drag = useRef<number | null>(null)

  const current = (k: TemplateKey): Template => { const s = saved[k]; return s ? { subject: s.subject, blocks: s.blocks } : DEFAULT_TEMPLATES[k] }
  const apply = ([list, st, se, ob]: Awaited<ReturnType<typeof fetchAll>>, k: TemplateKey) => {
    const m = Object.fromEntries((list ?? []).map((x) => [x.key, x]))
    setSaved(m); setStatus(st); setSettings(se); setOutbox(ob ?? [])
    const ex = se?.notify_extra ?? []
    setExtra([0, 1, 2].map((i) => ex[i] ?? ''))
    const s = m[k]
    setDraft(copy(s ? { subject: s.subject, blocks: s.blocks } : DEFAULT_TEMPLATES[k]))
  }
  const load = async (k: TemplateKey = key) => apply(await fetchAll(mail), k)
  useEffect(() => {
    void act(async () => {
      const [[list, st, se, ob], l] = await Promise.all([fetchAll(mail), fetchLogo(mail)])
      const m = Object.fromEntries((list ?? []).map((x) => [x.key, x]))
      setSaved(m); setStatus(st); setSettings(se); setOutbox(ob ?? [])
      const ex = se?.notify_extra ?? []
      setExtra([0, 1, 2].map((i) => ex[i] ?? ''))
      const w = m.welcome
      setDraft(copy(w ? { subject: w.subject, blocks: w.blocks } : DEFAULT_TEMPLATES.welcome))
      setLogo(l)
    })()
  }, [act, mail])

  const dirty = JSON.stringify(draft) !== JSON.stringify(current(key))
  const problem = templateProblem(draft)
  const pick = (k: TemplateKey) => {
    if (k === key) return
    if (dirty && !window.confirm(t('Du har endringer som ikke er lagret. Forkaste dem?'))) return
    setKey(k)
    setDraft(copy(current(k)))
  }
  const setBlock = (i: number, patch: { text?: string; label?: string }) => setDraft((d) => ({ ...d, blocks: d.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }))
  const move = (i: number, to: number) => setDraft((d) => {
    if (to < 0 || to >= d.blocks.length || to === i) return d
    const b = d.blocks.slice()
    const [x] = b.splice(i, 1)
    if (x) b.splice(to, 0, x)
    return { ...d, blocks: b }
  })
  const remove = (i: number) => setDraft((d) => ({ ...d, blocks: d.blocks.filter((_, j) => j !== i) }))
  const add = (ty: string) => setDraft((d) => ({ ...d, blocks: [...d.blocks, ty === 'h' || ty === 'p' || ty === 'small' ? { t: ty, text: '' } : { t: ty }] }))
  const hasLogo = draft.blocks.some((b) => b.t === 'logo')

  const save = act(async () => { if (problem) return; await mail.save(key, draft.subject.trim(), draft.blocks); say(t('Malen er lagret. Den gjelder e-poster som sendes fra nå av.')); await load(key) })
  const reset = act(async () => {
    confirmOr(t('Gjenopprette standardmalen?') + '\n\n' + t('Endringene i denne malen erstattes av standardteksten. Handlingen loggføres.'))
    await mail.reset(key)
    say(t('Standardmalen er gjenopprettet.'))
    await load(key)
  })
  const test = act(async () => {
    if (dirty) confirmOr(t('Testen bruker den lagrede malen, ikke endringene som ikke er lagret. Fortsette?'))
    const r = await mail.test(key)
    say(t('Testen er sendt til') + ' ' + r.to + '.')
    setOutbox(await mail.outbox().catch(() => []))
  })
  const upload = act(async (file: File | undefined) => {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) { say(t('Logoen må være PNG eller JPG.'), false); return }
    if (file.size > 512 * 1024) { say(t('Logoen er for stor (høyst 512 kB).'), false); return }
    await mail.uploadLogo(file)
    say(t('Logoen er lagret og brukes i e-poster fra nå av.'))
    setSettings(await mail.settings())
    setLogo(await fetchLogo(mail))
  })
  const resetLogo = act(async () => {
    confirmOr(t('Bruke standardlogoen (MediaLab-symbolet) igjen?'))
    await mail.resetLogo()
    say(t('Standardlogoen brukes igjen.'))
    setSettings(await mail.settings())
    setLogo(await fetchLogo(mail))
  })
  const saveExtra = (e: FormEvent) => {
    e.preventDefault()
    void act(async () => { await RQ.setNotifyExtra(extra.map((x) => x.trim()).filter(Boolean)); say(t('Varslingsadressene er lagret.')); setSettings(await mail.settings()) })()
  }

  let preview: { subject: string; html: string } | null = null, previewErr: string | null = null
  try {
    preview = renderMail(draft, { link: location.origin + '/login.dc.html?eksempel=1', vars: { navn: 'Ola Nordmann', epost: 'ola.nordmann@example.com', menighet: 'Eksempelmenighet', rolle: 'Bruker' }, logoSrc: logo || 'data:,' })
  } catch (e) {
    previewErr = e instanceof Error ? e.message : String(e)
  }
  const meta = saved[key]

  return (
    <>
      <Head title="Mail" sub="E-postene ConnectHub sender: velkomstmail ved invitasjon og e-post for nytt passord. Lenkene lages alltid av systemet." />
      <Card title="Utsending">
        {!status ? <p className="ch-muted">{t('Laster …')}</p> : status.configured
          ? <p className="ch-muted" data-ch-mailstatus="">{t('E-post sendes fra')} <b>{status.sender}</b>. {t('Malene under brukes for invitasjoner og «Glemt passord».')}</p>
          : <p className="ch-note warn" data-ch-mailstatus="">{t('ConnectHubs e-post er ikke satt opp på serveren ennå. Til da sender Supabase invitasjoner og «Glemt passord» med standardtekst, og malene under brukes ikke.')}{status.error ? ' (' + status.error + ')' : ''}</p>}
      </Card>
      <nav className="ch-tabs" aria-label={t('Maler')}>
        {TEMPLATE_KEYS.map((k) => <a key={k} href="#/mail" className={key === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); pick(k) }}>{t(TEMPLATE_NAMES[k])}</a>)}
      </nav>
      <div className="ch-mail" data-ch-mail="">
        <Card title={TEMPLATE_NAMES[key]} sub={meta ? t('Endret') + ' ' + fmt(meta.updated_at) + (meta.updated_by_name ? ' · ' + meta.updated_by_name : '') : t('Standardmal')}>
          <Field label="Emne"><input className="ch-input" value={draft.subject} maxLength={150} onChange={(e) => { const v = e.target.value.replace(/[\r\n]/g, ''); setDraft((d) => ({ ...d, subject: v })) }} /></Field>
          <p className="ch-muted" style={{ margin: '10px 0' }}>{t('Skriv **fet** eller *kursiv*. Flettefelt:')} <code>{'{navn}'}</code> <code>{'{epost}'}</code> <code>{'{menighet}'}</code> <code>{'{rolle}'}</code>. {t('Dra blokkene, eller bruk pilene, for å flytte dem.')}</p>
          <ol className="ch-blocks" data-ch-blocks="">
            {draft.blocks.map((b, i) => (
              <li key={i} className={'ch-block' + (b.t === 'link' ? ' link' : '')} draggable
                onDragStart={() => { drag.current = i }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag.current !== null) move(drag.current, i); drag.current = null }}>
                <div className="ch-block-head">
                  <span className="ch-grip" aria-hidden="true">⋮⋮</span><b>{t(BLOCK_NAME[b.t] ?? b.t)}</b>
                  <span className="ch-end">
                    <Btn small onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t('Flytt opp')}>↑</Btn>
                    <Btn small onClick={() => move(i, i + 1)} disabled={i === draft.blocks.length - 1} aria-label={t('Flytt ned')}>↓</Btn>
                    {b.t !== 'link' && <Btn small onClick={() => remove(i)} aria-label={t('Fjern blokken')}>×</Btn>}
                  </span>
                </div>
                {b.t === 'h' && <input className="ch-input" value={b.text || ''} maxLength={200} onChange={(e) => setBlock(i, { text: e.target.value })} aria-label={t('Overskrift')} />}
                {(b.t === 'p' || b.t === 'small') && <textarea className="ch-input" style={{ height: 'auto', minHeight: 64, padding: 8 }} value={b.text || ''} maxLength={2000} onChange={(e) => setBlock(i, { text: e.target.value })} aria-label={t(BLOCK_NAME[b.t] ?? '')} />}
                {b.t === 'link' && (
                  <>
                    <Field label="Knappetekst"><input className="ch-input" value={b.label || ''} maxLength={60} onChange={(e) => setBlock(i, { label: e.target.value.replace(/[\r\n]/g, '') })} /></Field>
                    <p className="ch-muted" style={{ margin: '6px 0 0' }}>🔒 {t('Lenken settes inn automatisk av systemet ved utsending og kan ikke endres.')}</p>
                  </>
                )}
                {b.t === 'logo' && <p className="ch-muted" style={{ margin: 0 }}>{t('Logoen fra kortet «Logo» under.')}</p>}
              </li>
            ))}
          </ol>
          <div className="ch-row" style={{ flexWrap: 'wrap', marginTop: 8 }} data-ch-addblock="">
            <Btn small onClick={() => add('h')}>+ {t('Overskrift')}</Btn><Btn small onClick={() => add('p')}>+ {t('Avsnitt')}</Btn>
            <Btn small onClick={() => add('small')}>+ {t('Liten tekst')}</Btn><Btn small onClick={() => add('hr')}>+ {t('Skillelinje')}</Btn>
            <Btn small onClick={() => add('logo')} disabled={hasLogo}>+ {t('Logo')}</Btn>
          </div>
          {problem && <p className="ch-note warn" data-ch-mailproblem="">{t(problem)}</p>}
          <div className="ch-row" style={{ flexWrap: 'wrap', marginTop: 12 }}>
            <Btn kind="primary" onClick={save} disabled={!dirty || !!problem}>{t('Lagre')}</Btn>
            <Btn onClick={() => setDraft(copy(current(key)))} disabled={!dirty}>{t('Angre endringer')}</Btn>
            <Btn onClick={reset} disabled={!meta}>{t('Gjenopprett standard')}</Btn>
            <Btn onClick={test} disabled={!status?.configured}>{t('Send test til meg')}</Btn>
          </div>
        </Card>
        <Card title="Forhåndsvisning" sub={preview ? preview.subject : ''}>
          <div className="ch-row" style={{ marginBottom: 8 }}><Btn small kind={width === 600 ? 'primary' : ''} onClick={() => setWidth(600)}>{t('PC')}</Btn><Btn small kind={width === 360 ? 'primary' : ''} onClick={() => setWidth(360)}>{t('Mobil')}</Btn></div>
          {preview ? <iframe title={t('Forhåndsvisning av e-posten')} sandbox="" srcDoc={preview.html} data-ch-mailpreview=""
            style={{ width: '100%', maxWidth: width, height: 560, border: '1px solid var(--line2)', borderRadius: 12, background: '#f1efe9', display: 'block' }} />
            : <Empty>{t(previewErr || 'Ugyldig mal.')}</Empty>}
          <p className="ch-muted" style={{ marginTop: 8 }}>{t('Eksempelverdier vises for flettefeltene, og knappen peker på en eksempeladresse.')}</p>
        </Card>
      </div>
      <Card title="Logo" sub={settings?.custom_logo ? t('Egen logo') : t('Standard: MediaLab-symbolet')}>
        <div className="ch-row" style={{ flexWrap: 'wrap', alignItems: 'center' }} data-ch-maillogo="">
          {logo && <img src={logo} alt={t('Logo i e-postene')} style={{ width: 88, height: 'auto', background: '#fff', borderRadius: 8, padding: 6 }} />}
          <label className="ch-btn primary">{t(settings?.custom_logo ? 'Bytt logo' : 'Last opp logo')}<input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void upload(f) }} /></label>
          {settings?.custom_logo && <Btn onClick={resetLogo}>{t('Bruk standardlogo')}</Btn>}
        </div>
        <p className="ch-muted" style={{ marginTop: 8 }}>{t('PNG eller JPG, høyst 512 kB. Logoen legges inn i e-posten som vedlegg, så den vises uten lenke til ConnectHub. Gjelder e-poster som sendes etter endringen.')}</p>
      </Card>
      <Card title="Varslingsadresser" sub={t('Nye forespørsler om konto')}>
        <form className="ch-form" data-ch-notify="" onSubmit={saveExtra}>
          <p className="ch-muted">{t('Varsel om nye forespørsler sendes til ConnectHubs avsenderadresse')}{status?.sender ? ' (' + status.sender + ')' : ''} {t('og til ekstra adresser under (høyst 3). Varselet inneholder bare navn og menighet – telefon og e-post vises bare i ConnectHub.')}</p>
          {extra.map((v, i) => <input key={i} className="ch-input" type="email" placeholder={t('Ekstra adresse') + ' ' + (i + 1)} aria-label={t('Ekstra adresse') + ' ' + (i + 1)} value={v} maxLength={254} onChange={(e) => { const x = e.target.value; setExtra((a) => a.map((y, j) => (j === i ? x : y))) }} />)}
          <div className="ch-row"><Btn kind="primary" type="submit">{t('Lagre adresser')}</Btn></div>
        </form>
      </Card>
      <Card title="Siste utsendinger" sub={outbox.length}>
        <List cols="minmax(0,1.4fr) auto auto" head={['Mottaker', 'Type', 'Status']} empty="Ingen utsendinger ennå."
          rows={outbox.map((o) => ({ key: o.id, cells: [
            <div key="m"><span style={{ wordBreak: 'break-all' }}>{o.to_email}</span><div className="ch-muted">{fmt(o.created_at)}</div></div>,
            <span key="k" className="ch-muted">{t(KIND[o.kind] ?? o.kind)}</span>,
            o.status === 'sent' ? <Badge key="s" tone="ok">{t('Sendt')}</Badge> : o.status === 'skipped' ? <Badge key="s">{t('Hoppet over (valgfrie e-poster er av)')}</Badge> : <Badge key="s" tone="bad">{t('Feilet')}{o.error_code ? ' · ' + o.error_code : ''}</Badge>] }))} />
      </Card>
    </>
  )
}
