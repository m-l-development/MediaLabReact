import { useEffect, useState, type FormEvent } from 'react'
import { useServices } from '../../app/services'
import { passwordChecks } from '../../services/account'
import { USERNAME_RE, type ParishAccount } from '../../services/parish'
import { useAdmin } from './context'
import { errText } from './lib'
import { Badge, Btn, Card, Field } from './ui'

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '–')

/**
 * Brukeradministrasjon: menighetens Menighetsbruker (fast felleskonto for menighetens PC). Bare Admin i menigheten;
 * databasen og serveren avgjør uansett. «Opprett menighetsbruker» med brukernavn og passord (ingen e-post), deretter
 * nytt brukernavn, nytt passord (ny 12-månedersperiode, logger ut innloggingene), utlogging og deaktivering.
 */
export function ParishAccounts() {
  const { me, adminOf, churchName } = useAdmin()
  const { parish } = useServices()
  const mine = adminOf.filter((id) => me.churches.some((c) => c.id === id))
  if (!parish || !mine.length) return null
  return <>{mine.map((id) => <ParishCard key={id} church={id} name={churchName(id)} />)}</>
}

function ParishCard({ church, name }: { church: string; name: string }) {
  const { t, say } = useAdmin()
  const { parish } = useServices()
  const [acc, setAcc] = useState<ParishAccount | null | undefined>(undefined)
  const [form, setForm] = useState<'create' | 'password' | 'rename' | null>(null)
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const [rev, setRev] = useState(0)
  const load = () => setRev((r) => r + 1)
  useEffect(() => {
    if (!parish) return
    let live = true
    parish.get(church).then((a) => { if (live) setAcc(a) }, (e: unknown) => { if (live) { setAcc(null); setErr(errText(e, t)) } })
    return () => { live = false }
  }, [parish, church, t, rev])

  const close = () => { setForm(null); setPw(''); setPw2(''); setUsername(''); setErr(null) }
  const checks = passwordChecks(pw, pw2)
  const pwOk = checks.every((c) => c.ok)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setErr(null)
    try { await fn(); say(t(ok)); close(); load() } catch (e) { setErr(errText(e, t)) }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!parish) return
    const u = username.trim().toLowerCase()
    if ((form === 'create' || form === 'rename') && !USERNAME_RE.test(u)) { setErr(t('Brukernavnet må ha 3–40 tegn: små bokstaver, tall, punktum, bindestrek eller understrek, og starte med bokstav eller tall.')); return }
    if ((form === 'create' || form === 'password') && !pwOk) { setErr(t(pw !== pw2 ? 'Passordene er ikke like.' : 'Passordet må ha minst 10 tegn med både bokstaver og tall.')); return }
    if (form === 'create') void run(() => parish.create(church, u, pw), 'Menighetsbrukeren er opprettet.')
    else if (form === 'rename') void run(() => parish.manage(church, 'rename', { username: u }), 'Brukernavnet er endret.')
    else if (form === 'password') void run(() => parish.manage(church, 'password', { password: pw }), 'Nytt passord er lagret. En ny 12-månedersperiode har startet.')
  }
  const pwFields = (
    <>
      <Field label="Passord"><input className="ch-input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} data-ch-parish-pw="" /></Field>
      <Field label="Bekreft passord"><input className="ch-input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} data-ch-parish-pw2="" /></Field>
      <ul className="ch-muted" style={{ margin: 0, paddingLeft: 18 }}>
        {checks.map((c) => <li key={c.key}>{c.ok ? '✓ ' : '• '}{t(c.key === 'len' ? 'Minst 10 tegn' : c.key === 'mix' ? 'Både bokstaver og tall' : 'Passordene er like')}</li>)}
      </ul>
    </>
  )

  return (
    <Card title="Menighetsbruker (felleskonto)" sub={name}>
      <div data-ch-parish-card={church}>
        {acc === undefined ? <p className="ch-muted">…</p> : acc === null ? (
          <>
            <p className="ch-muted">{t('En fast fellesbruker for menighetens PC på kontoret. Logger inn med brukernavn og passord (ingen e-post), og har en egen innboks der medlemmene kan sende filer. Høyst én per menighet.')}</p>
            {!form && <div className="ch-row"><Btn kind="primary" onClick={() => { setForm('create'); setErr(null) }} data-ch-parish-create="">{t('Opprett menighetsbruker')}</Btn></div>}
          </>
        ) : (
          <>
            <dl className="ch-kv" data-ch-parish-summary="">
              <dt>{t('Brukernavn')}</dt><dd><b data-ch-parish-username="">{acc.username}</b> <Badge tone="role">{t('Felleskonto')}</Badge></dd>
              <dt>{t('Status')}</dt><dd>{acc.status === 'active' ? <Badge tone="ok">{t('Aktiv')}</Badge> : <Badge tone="bad">{t('Deaktivert')}</Badge>}</dd>
              <dt>{t('Passord endret')}</dt><dd>{fmt(acc.pw_changed_at)} · {t('må byttes innen')} {fmt(acc.pw_due_at)}</dd>
              {acc.sessions != null && <><dt>{t('Aktive innlogginger')}</dt><dd data-ch-parish-sessions="">{acc.sessions}</dd></>}
              <dt>{t('Opprettet')}</dt><dd>{fmt(acc.created_at)}</dd>
            </dl>
            <p className="ch-muted">{t('Menigheten har allerede en Menighetsbruker. Brukeren selv kan bare bytte passord i den årlige påminnelsen; du kan endre det når som helst.')}</p>
            {!form && (
              <div className="ch-row">
                <Btn small onClick={() => { setForm('password'); setErr(null) }} data-ch-parish-setpw="">{t('Endre passord')}</Btn>
                <Btn small onClick={() => { setForm('rename'); setUsername(acc.username); setErr(null) }}>{t('Endre brukernavn')}</Btn>
                <Btn small onClick={() => { if (window.confirm(t('Logge ut Menighetsbrukeren på alle enheter? Den må logge inn på nytt med brukernavn og passord.'))) return run(() => parish!.manage(church, 'revoke'), 'Menighetsbrukeren er logget ut på alle enheter.') }} data-ch-parish-revoke="">{t('Logg ut alle innlogginger')}</Btn>
                {acc.status === 'active'
                  ? <Btn small kind="danger" onClick={() => { if (window.confirm(t('Deaktivere Menighetsbrukeren? Den logges ut med en gang og kan ikke logge inn før du aktiverer den igjen. Filene i innboksen beholdes.'))) return run(() => parish!.manage(church, 'disable'), 'Menighetsbrukeren er deaktivert.') }} data-ch-parish-disable="">{t('Deaktiver')}</Btn>
                  : <Btn small onClick={() => run(() => parish!.manage(church, 'enable'), 'Menighetsbrukeren er aktivert.')} data-ch-parish-enable="">{t('Aktiver')}</Btn>}
              </div>
            )}
          </>
        )}
        {form && (
          <form className="ch-form" onSubmit={submit} data-ch-parish-form={form}>
            {(form === 'create' || form === 'rename') && (
              <Field label="Brukernavn"><input className="ch-input" autoComplete="off" autoCapitalize="none" spellCheck={false} value={username} maxLength={40} onChange={(e) => setUsername(e.target.value)} data-ch-parish-user="" /></Field>
            )}
            {(form === 'create' || form === 'password') && pwFields}
            {form === 'password' && <p className="ch-muted">{t('Menighetsbrukeren logges ut på alle enheter og må logge inn med det nye passordet.')}</p>}
            {form === 'create' && <p className="ch-muted">{t('Ingen e-post trengs. Kontoen knyttes til menigheten og må bytte passord hver 12. måned.')}</p>}
            {err && <p className="ch-note warn" role="alert">{err}</p>}
            <div className="ch-row">
              <Btn kind="primary" type="submit">{t(form === 'create' ? 'Opprett menighetsbruker' : form === 'rename' ? 'Lagre brukernavn' : 'Lagre nytt passord')}</Btn>
              <Btn onClick={close}>{t('Avbryt')}</Btn>
            </div>
          </form>
        )}
        {!form && err && <p className="ch-note warn" role="alert">{err}</p>}
      </div>
    </Card>
  )
}
