/* «Send forespørsel om opprettelse av bruker» på innloggingssiden (før innlogging). Panelet åpnes under innloggingsfeltet,
   så kortet vokser nedover. Ingen konto opprettes – Developer/Moderator behandler forespørselen i ConnectHub. Svaret er
   det samme uansett om adressen finnes fra før. Vern på serveren: signert skjemanøkkel, felle-felt og grenser. */
import React from 'react';
import { requests } from '../../services/requests.js';

const EMAIL = /^[^@\s,;<>"]{1,64}@[^@\s,;<>"]+\.[A-Za-z]{2,}$/;
const ERR = { form_expired: 'Skjemaet var åpent for lenge eller ble sendt for raskt. Prøv igjen.', network: 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.', timeout: 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.' };

export default function RequestPanel({ S, T, Field }) {
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ name: '', phone: '', email: '', church: '', website: '' });
  const [token, setToken] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [done, setDone] = React.useState(false);
  const ref = React.useRef(null);
  const newToken = () => requests.formToken().then(setToken).catch(() => setToken(null));
  const toggle = () => { const o = !open; setOpen(o); setErr(null); if (o) { newToken(); setTimeout(() => ref.current && ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); } };
  const set = k => e => { const v = e.target.value; setF(x => ({ ...x, [k]: v })); };
  const problem = f.name.trim().length < 2 ? 'Skriv navnet ditt.' : !/^[0-9+ ()-]{8,20}$/.test(f.phone.trim()) ? 'Skriv et gyldig telefonnummer (8–20 sifre).'
    : !EMAIL.test(f.email.trim()) ? 'Skriv en gyldig e-postadresse.' : f.church.trim().length < 2 ? 'Skriv menighet eller annet.' : null;
  const submit = async e => {
    e.preventDefault(); if (busy) return;
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr(null);
    try { await requests.submit({ ...f, token }); setDone(true); }
    catch (x) { setErr(ERR[x.code] || 'Forespørselen kunne ikke sendes. Prøv igjen.'); if (x.code === 'form_expired') await newToken(); }
    finally { setBusy(false); }
  };
  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }} data-ch-request>
    {!open && <button type="button" style={{ ...S.primary, background: 'transparent', color: '#f3f1ec', border: '1px solid rgba(255,255,255,0.35)' }} onClick={toggle} data-ch-request-open>{T('Send forespørsel om opprettelse av bruker')}</button>}
    {open && (done ? <>
      <p role="status" style={S.ok} data-ch-request-done>{T('Takk! Forespørselen er mottatt. Du får svar på e-post når den er behandlet.')}</p>
      <button type="button" style={S.link} onClick={() => { setOpen(false); setDone(false); setF({ name: '', phone: '', email: '', church: '', website: '' }); }}>{T('Lukk')}</button>
    </> : <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} noValidate>
      <h2 style={{ ...S.h, fontSize: '18px' }}>{T('Forespørsel om brukerkonto')}</h2>
      <p style={S.p}>{T('Fyll ut skjemaet, så behandler en administrator forespørselen. Du får en e-post med invitasjon hvis den blir godkjent.')}</p>
      {err && <p role="alert" style={S.err}>{T(err)}</p>}
      <Field label="Navn" autoComplete="name" maxLength={100} required value={f.name} onChange={set('name')} />
      <Field label="Telefonnummer" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} required value={f.phone} onChange={set('phone')} />
      <Field label="E-postadresse" type="email" autoComplete="email" maxLength={254} required value={f.email} onChange={set('email')} />
      <Field label="Menighet / annet" maxLength={200} required value={f.church} onChange={set('church')} />
      <label aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>Nettsted<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} name="website" /></label>
      <button type="submit" style={S.primary} disabled={busy || !token}>{T(busy ? 'Sender …' : 'Send forespørsel')}</button>
      <button type="button" style={S.link} onClick={toggle}>{T('Avbryt')}</button>
    </form>)}
  </div>;
}
