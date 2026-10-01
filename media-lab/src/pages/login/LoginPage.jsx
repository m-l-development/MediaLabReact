import React from 'react';
import { auth, safeNext, passwordProblem } from '../../services/auth.js';
import { whoami, isStaff } from '../../services/data/me.js';
import { acceptInvitation } from '../../services/admin.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const ERR = {
  invalid_credentials: 'Feil e-post eller passord.',
  email_not_confirmed: 'E-posten er ikke bekreftet ennå. Bruk lenken i invitasjonen.',
  over_request_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.',
  over_email_send_rate_limit: 'For mange forsøk. Vent litt og prøv igjen.',
  mfa_verification_failed: 'Feil kode. Prøv igjen.',
  invalid_credentials_mfa: 'Feil kode. Prøv igjen.',
  weak_password: 'Passordet er for svakt.',
  same_password: 'Velg et annet passord enn det gamle.',
  otp_expired: 'Lenken er utløpt eller allerede brukt. Be om en ny.',
  lenke_ugyldig: 'Lenken er utløpt eller allerede brukt. Be om en ny.',
  flow_state_not_found: 'Lenken må åpnes i samme nettleser som du ba om den fra. Be om en ny.',
  invitation_invalid: 'Invitasjonen er ikke gyldig lenger. Be om en ny invitasjon.',
  invitation_expired: 'Invitasjonen er utløpt. Be om en ny invitasjon.',
  wrong_email: 'Invitasjonen gjelder en annen e-postadresse enn den du er logget inn med. Logg ut og åpne lenken fra e-posten på nytt.',
  email_not_confirmed: 'E-postadressen din er ikke bekreftet. Åpne lenken fra e-posten på nytt.',
  user_disabled: 'Kontoen er deaktivert. Kontakt administrator.',
  admin_exists: 'Menigheten har allerede en administrator. Kontakt den som inviterte deg.',
  church_inactive: 'Menigheten er ikke aktiv. Kontakt den som inviterte deg.',
  inviter_lost_access: 'Den som inviterte deg, har ikke lenger tilgang til å invitere. Be om en ny invitasjon.',
};
const INVITE_KEY = 'ch.invite';
const readInvite = () => { try { return sessionStorage.getItem(INVITE_KEY); } catch (e) { return null; } };
const dropInvite = () => { try { sessionStorage.removeItem(INVITE_KEY); } catch (e) {} };
const cleanUrl = q => history.replaceState(null, '', location.pathname + (q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : ''));
const msg = e => T(ERR[e] || 'Noe gikk galt. Prøv igjen.');

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif', background: 'radial-gradient(1200px 600px at 50% -10%, #1b1b1b, #000 60%)' },
  card: { width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: '14px', padding: '28px 24px', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '20px', background: 'rgba(12,12,12,0.85)' },
  brand: { fontSize: '12px', fontWeight: 700, letterSpacing: '0.3em', color: '#9d998f', textTransform: 'uppercase' },
  h: { margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '0.02em' },
  p: { margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: '#b3afa6' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#b3afa6' },
  input: { height: '42px', padding: '0 12px', border: '1px solid #2b2b2b', borderRadius: '12px', background: '#0e0e0e', color: '#f3f1ec', fontSize: '15px' },
  primary: { height: '42px', border: 0, borderRadius: '999px', background: '#f3f1ec', color: '#000', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  link: { alignSelf: 'flex-start', padding: 0, border: 0, background: 'transparent', color: '#e9e7e2', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' },
  err: { margin: 0, padding: '10px 12px', borderRadius: '10px', background: 'rgba(155,28,60,0.25)', color: '#ffb4c4', fontSize: '13px' },
  ok: { margin: 0, padding: '10px 12px', borderRadius: '10px', background: 'rgba(42,157,143,0.2)', color: '#bdf0e7', fontSize: '13px' },
};

function Field({ label, ...p }) { return <label style={S.label}><span>{T(label)}</span><input style={S.input} {...p} /></label>; }

export default function LoginPage() {
  const q = new URLSearchParams(location.search);
  /* Invitasjonstokenet flyttes fra adressen til denne fanen (sessionStorage) og slettes når det er brukt. */
  if (/^[A-Za-z0-9_-]{43}$/.test(q.get('invite') || '')) { try { sessionStorage.setItem(INVITE_KEY, q.get('invite')); } catch (e) {} }
  const next = safeNext(q.get('next'));
  const [mode, setMode] = React.useState('loading');
  const [err, setErr] = React.useState(null);
  const [info, setInfo] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [code, setCode] = React.useState('');
  const [mfa, setMfa] = React.useState(null);
  const [enroll, setEnroll] = React.useState(null);

  /* Sikring mot rundgang (innlogging → side → sperre → innlogging) hvis nettleseren ikke tar vare på cookien. */
  const go = () => {
    try {
      const v = JSON.parse(sessionStorage.getItem('ch.loop') || '{"n":0,"t":0}'), n = Date.now() - v.t < 15000 ? v.n + 1 : 1;
      sessionStorage.setItem('ch.loop', JSON.stringify({ n, t: Date.now() }));
      if (n > 3) { setErr('Innloggingen ble ikke husket. Sjekk at nettleseren tillater informasjonskapsler for denne siden, og prøv igjen.'); setMode('login'); return; }
    } catch (e) {}
    location.replace(next);
  };

  /* Etter innlogging/nytt passord: MFA-trinn, kobling og eventuelt oppsett av autentiseringsapp for stab. */
  /* Godtar en ventende invitasjon etter innlogging. true = ok/ingen, 'wrong' = annen e-post, false = annen feil (vist). */
  const acceptPending = async () => {
    const t = readInvite(); if (!t) return true;
    try { await acceptInvitation(t); dropInvite(); setInfo(T('Invitasjonen er godtatt.')); return true; }
    catch (e) { dropInvite(); setErr(msg(e.code)); return e.code === 'wrong_email' ? 'wrong' : false; }
  };

  const proceed = React.useCallback(async () => {
    if (await acceptPending() === 'wrong') { setMode('inviteerr'); return; }
    const st = await auth.mfaStatus().catch(() => null);
    if (st && st.next === 'aal2' && st.current !== 'aal2' && st.factors.length) { setMfa(st); setMode('mfa'); return; }
    let me = null; try { me = await whoami(); } catch (e) { setErr('Kunne ikke kontakte ConnectHub. Prøv igjen.'); setMode('login'); return; }
    if (!me) { setMode('notlinked'); return; }
    if (isStaff(me) && st && !st.factors.length) { setMode('enroll'); return; }
    go();
  }, []);

  React.useEffect(() => { (async () => {
    if (!auth.available()) { setErr('ConnectHub er ikke konfigurert for dette bygget.'); setMode('login'); return; }
    const hasLink = q.get('code') || q.get('token_hash') || /access_token=|error_description=/.test(location.hash);
    if (hasLink) {
      const r = await auth.completeFromUrl(location.href);
      cleanUrl(q);
      if (!r.ok) { setErr(msg(r.error)); setMode('login'); return; }
      await auth.session();
      if (r.type === 'invite') { if (await acceptPending() !== true) { setMode('inviteerr'); return; } setMode('setpw'); return; }
      if (r.type === 'recovery') { setMode('setpw'); return; }
      await proceed(); return;
    }
    if (q.get('invite')) cleanUrl(q);
    const s = await auth.session().catch(() => null);
    if (s && q.get('reason') !== 'notlinked') { await proceed(); return; }
    if (!s && readInvite()) setInfo(T('Logg inn med e-postadressen invitasjonen ble sendt til, så godtas den.'));
    if (s && q.get('reason') === 'notlinked') { setMode('notlinked'); return; }
    setMode('login');
  })(); }, []);

  const run = fn => async e => { e && e.preventDefault(); if (busy) return; setBusy(true); setErr(null); setInfo(null); try { await fn(); } finally { setBusy(false); } };

  const onLogin = run(async () => {
    const r = await auth.signIn(email, pw); setPw('');
    if (!r.ok) { setErr(msg(r.error)); return; }
    await auth.session(); await proceed();
  });
  const onMfa = run(async () => {
    const r = await auth.mfaVerify(mfa.factors[0].id, code); setCode('');
    if (!r.ok) { setErr(msg(r.error === 'invalid_credentials' ? 'invalid_credentials_mfa' : r.error)); return; }
    await auth.session(); await proceed();
  });
  const startEnroll = run(async () => { const r = await auth.mfaEnroll(); if (!r.ok) { setErr(msg(r.error)); return; } setEnroll(r); });
  const onEnroll = run(async () => {
    const r = await auth.mfaVerify(enroll.factorId, code); setCode('');
    if (!r.ok) { setErr(msg(r.error === 'invalid_credentials' ? 'invalid_credentials_mfa' : r.error)); return; }
    await auth.session(); go();
  });
  const onForgot = run(async () => { await auth.requestPasswordReset(email); setMode('forgot-sent'); });
  const onSetPw = run(async () => {
    const p = passwordProblem(pw); if (p) { setErr(T(p)); return; }
    if (pw !== pw2) { setErr(T('Passordene er ikke like.')); return; }
    const r = await auth.setPassword(pw); setPw(''); setPw2('');
    if (!r.ok) { setErr(msg(r.error)); return; }
    setInfo(T('Passordet er lagret.')); await auth.session(); await proceed();
  });
  const onLogout = run(async () => { await auth.signOut(); setMode('login'); });

  let body = null;
  if (mode === 'loading') body = <p style={S.p}>{T('Laster …')}</p>;
  if (mode === 'login') body = <form onSubmit={onLogin} style={{ display: 'contents' }}>
    <h1 style={S.h}>{T('Logg inn')}</h1>
    <Field label="E-post" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
    <Field label="Passord" type="password" autoComplete="current-password" required value={pw} onChange={e => setPw(e.target.value)} />
    <button type="submit" style={S.primary} disabled={busy}>{T(busy ? 'Logger inn …' : 'Logg inn')}</button>
    <button type="button" style={S.link} onClick={() => { setErr(null); setMode('forgot'); }}>{T('Glemt passordet?')}</button>
    <p style={S.p}>{T('Kontoer opprettes bare ved invitasjon. Kontakt administrator i menigheten din hvis du trenger tilgang.')}</p>
  </form>;
  if (mode === 'mfa') body = <form onSubmit={onMfa} style={{ display: 'contents' }}>
    <h1 style={S.h}>{T('Totrinnsbekreftelse')}</h1>
    <p style={S.p}>{T('Skriv inn den 6-sifrede koden fra autentiseringsappen din.')}</p>
    <Field label="Kode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={e => setCode(e.target.value)} autoFocus />
    <button type="submit" style={S.primary} disabled={busy}>{T('Bekreft')}</button>
    <button type="button" style={S.link} onClick={onLogout}>{T('Avbryt og logg ut')}</button>
  </form>;
  if (mode === 'enroll') body = <form onSubmit={onEnroll} style={{ display: 'contents' }}>
    <h1 style={S.h}>{T('Sett opp totrinnsbekreftelse')}</h1>
    <p style={S.p}>{T('Rollen din (Developer eller Moderator) krever totrinnsbekreftelse. Skann koden med en autentiseringsapp og skriv inn koden appen viser. Uten dette er de utvidede rettighetene dine ikke aktive.')}</p>
    {!enroll ? <button type="button" style={S.primary} onClick={startEnroll} disabled={busy}>{T('Vis QR-kode')}</button> : <>
      <img src={enroll.qr} alt={T('QR-kode for autentiseringsapp')} width="180" height="180" style={{ alignSelf: 'center', background: '#fff', borderRadius: '12px', padding: '8px' }} />
      <p style={{ ...S.p, fontSize: '12px', wordBreak: 'break-all' }} data-no-i18n="1">{enroll.secret}</p>
      <Field label="Kode" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} />
      <button type="submit" style={S.primary} disabled={busy}>{T('Bekreft og fortsett')}</button>
    </>}
    <button type="button" style={S.link} onClick={go}>{T('Hopp over for nå')}</button>
  </form>;
  if (mode === 'forgot') body = <form onSubmit={onForgot} style={{ display: 'contents' }}>
    <h1 style={S.h}>{T('Glemt passordet')}</h1>
    <p style={S.p}>{T('Skriv inn e-postadressen din. Har du en konto, får du en lenke for å sette nytt passord. Åpne lenken i denne nettleseren.')}</p>
    <Field label="E-post" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
    <button type="submit" style={S.primary} disabled={busy}>{T('Send lenke')}</button>
    <button type="button" style={S.link} onClick={() => setMode('login')}>{T('Tilbake til innlogging')}</button>
  </form>;
  if (mode === 'forgot-sent') body = <>
    <h1 style={S.h}>{T('Sjekk e-posten din')}</h1>
    <p style={S.p}>{T('Hvis adressen har en konto, er det sendt en lenke for å sette nytt passord. Lenken kan bare brukes én gang og utløper etter kort tid.')}</p>
    <button type="button" style={S.link} onClick={() => setMode('login')}>{T('Tilbake til innlogging')}</button>
  </>;
  if (mode === 'setpw') body = <form onSubmit={onSetPw} style={{ display: 'contents' }}>
    <h1 style={S.h}>{T('Velg passord')}</h1>
    <p style={S.p}>{T('Minst 10 tegn, med både bokstaver og tall.')}</p>
    <Field label="Nytt passord" type="password" autoComplete="new-password" required value={pw} onChange={e => setPw(e.target.value)} />
    <Field label="Gjenta passordet" type="password" autoComplete="new-password" required value={pw2} onChange={e => setPw2(e.target.value)} />
    <button type="submit" style={S.primary} disabled={busy}>{T('Lagre passord')}</button>
  </form>;
  if (mode === 'inviteerr') body = <>
    <h1 style={S.h}>{T('Invitasjonen kunne ikke godtas')}</h1>
    <button type="button" style={S.primary} onClick={onLogout} disabled={busy}>{T('Logg ut')}</button>
    <button type="button" style={S.link} onClick={run(async () => { setErr(null); await proceed(); })}>{T('Fortsett uten invitasjonen')}</button>
  </>;
  if (mode === 'notlinked') body = <>
    <h1 style={S.h}>{T('Kontoen er ikke aktiv')}</h1>
    <p style={S.p}>{T('Du er logget inn, men kontoen er ikke koblet til en aktiv ConnectHub-bruker, eller den er deaktivert. Kontakt administrator.')}</p>
    <button type="button" style={S.primary} onClick={onLogout} disabled={busy}>{T('Logg ut')}</button>
  </>;

  return <main style={S.page}>
    <div style={S.card}>
      <span style={S.brand}>ConnectHub</span>
      {err && <p role="alert" style={S.err}>{T(err)}</p>}
      {info && <p role="status" style={S.ok}>{info}</p>}
      {body}
    </div>
  </main>;
}
