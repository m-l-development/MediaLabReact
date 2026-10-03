/* E-postmaler for ConnectHub: strukturerte blokker → trygg HTML og ren tekst. Samme kode brukes av serveren ved utsending
   og av Mail-fanen til forhåndsvisning, så forhåndsvisningen er nøyaktig det som sendes.
   Sikkerhet: all tekst escapes. Bare **fet**, *kursiv* og linjeskift tolkes, og bare de faste flettefeltene {epost},
   {menighet}, {rolle} og {navn} settes inn (også de escapes). Lenken skrives aldri i malen – systemet setter den inn i lenkeboksen.
   Ingen avhengigheter (kjører både i nettleseren og i Node). */

export const TEMPLATE_KEYS = ['welcome', 'password', 'request_received', 'request_notify'];
export const BLOCK_TYPES = ['logo', 'h', 'p', 'link', 'small', 'hr'];
export const VAR_NAMES = ['navn', 'epost', 'menighet', 'rolle'];
export const LIMITS = { blocks: 30, text: 2000, heading: 200, subject: 150, label: 60 };
export const LOGO_CID = 'medialab-logo';

/* Kontroll av en mal ({ subject, blocks }). Gir null når den er gyldig, ellers en norsk feiltekst. Samme regler i databasen
   (app.mail_template_ok). */
export function templateProblem(t) {
  if (!t || typeof t !== 'object') return 'Ugyldig mal.';
  const s = t.subject;
  if (typeof s !== 'string' || !s.trim() || s.length > LIMITS.subject || /[\r\n]/.test(s)) return 'Emnet må ha 1–150 tegn på én linje.';
  const b = t.blocks;
  if (!Array.isArray(b) || !b.length || b.length > LIMITS.blocks) return 'Malen må ha 1–30 blokker.';
  let links = 0, logos = 0;
  for (const x of b) {
    if (!x || typeof x !== 'object' || !BLOCK_TYPES.includes(x.t)) return 'Ukjent blokktype.';
    if (x.t === 'link') { links++; if (typeof x.label !== 'string' || !x.label.trim() || x.label.length > LIMITS.label || /[\r\n]/.test(x.label)) return 'Knappeteksten i lenkeboksen må ha 1–60 tegn.'; }
    if (x.t === 'logo') logos++;
    if (x.t === 'h' && (typeof x.text !== 'string' || !x.text.trim() || x.text.length > LIMITS.heading)) return 'En overskrift må ha 1–200 tegn.';
    if ((x.t === 'p' || x.t === 'small') && (typeof x.text !== 'string' || !x.text.trim() || x.text.length > LIMITS.text)) return 'Et avsnitt må ha 1–2000 tegn.';
  }
  if (links !== 1) return 'Malen må ha nøyaktig én lenkeboks.';
  if (logos > 1) return 'Malen kan ha høyst én logo.';
  return null;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (s, vars) => String(s == null ? '' : s).replace(/\{(navn|epost|menighet|rolle)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
/* Tekst → HTML: escape først, så **fet** og *kursiv*, og linjeskift. */
const inline = s => esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/\r?\n/g, '<br>');
const plain = s => String(s).replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
/* Bare absolutte http(s)-adresser uten mellomrom eller tegn som kan bryte ut av attributtet. */
export const safeLink = u => /^https?:\/\/[^\s"'<>\\]+$/.test(String(u || '')) ? String(u) : null;

/* { subject, html, text }. opts: { link, vars, logoSrc } – logoSrc er 'cid:…' ved utsending og en bilde-adresse i
   forhåndsvisningen. Uten gyldig lenke kastes en feil (ingen e-post uten systemlenke). */
export function renderMail(tpl, opts = {}) {
  const problem = templateProblem(tpl); if (problem) throw new Error(problem);
  const link = safeLink(opts.link); if (!link) throw new Error('Ugyldig lenke');
  const vars = opts.vars || {}, logo = opts.logoSrc || 'cid:' + LOGO_CID;
  const H = [], T = [];
  for (const b of tpl.blocks) {
    if (b.t === 'logo') H.push(`<p style="margin:0 0 20px"><img src="${esc(logo)}" alt="MediaLab" width="88" style="display:block;width:88px;max-width:100%;height:auto;border:0"></p>`);
    if (b.t === 'h') { const t = fill(b.text, vars); H.push(`<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1d1d1f">${inline(t)}</h1>`); T.push(plain(t).toUpperCase(), ''); }
    if (b.t === 'p') { const t = fill(b.text, vars); H.push(`<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#1d1d1f">${inline(t)}</p>`); T.push(plain(t), ''); }
    if (b.t === 'small') { const t = fill(b.text, vars); H.push(`<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b6b6b">${inline(t)}</p>`); T.push(plain(t), ''); }
    if (b.t === 'hr') { H.push('<hr style="border:0;border-top:1px solid #e3e1db;margin:20px 0">'); T.push('—', ''); }
    if (b.t === 'link') {
      const l = fill(b.label, vars);
      H.push(`<p style="margin:24px 0"><a href="${esc(link)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:8px">${esc(l)}</a></p>`
        + `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#6b6b6b">Virker ikke knappen? Kopier denne adressen inn i nettleseren:<br><span style="word-break:break-all">${esc(link)}</span></p>`);
      T.push(l + ':', link, '');
    }
  }
  const subject = fill(tpl.subject, vars).replace(/[\r\n]+/g, ' ').trim().slice(0, LIMITS.subject);
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<title>${esc(subject)}</title></head><body style="margin:0;padding:24px 12px;background:#f1efe9;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f">`
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px"><tr><td style="padding:32px 28px">'
    + H.join('') + '</td></tr></table>'
    + '<p style="margin:16px 0 0;font-size:12px;color:#8a8a8a">Denne e-posten er sendt automatisk fra ConnectHub. Du kan ikke svare på den.</p>'
    + '</td></tr></table></body></html>';
  const text = T.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n\n—\nDenne e-posten er sendt automatisk fra ConnectHub.';
  return { subject, html, text };
}

/* Standardmalene (kan gjenopprettes i Mail-fanen). */
export const DEFAULT_TEMPLATES = {
  welcome: {
    subject: 'Velkommen til ConnectHub',
    blocks: [
      { t: 'logo' },
      { t: 'h', text: 'Velkommen til MediaLab!' },
      { t: 'p', text: 'Du er invitert til ConnectHub, verktøykassen for media i menigheten.' },
      { t: 'p', text: 'Her er lenken for å opprette brukeren din. Du velger ditt eget passord når du åpner lenken.' },
      { t: 'link', label: 'Opprett brukeren min' },
      { t: 'small', text: 'Lenken er personlig og kan bare brukes én gang. Virker den ikke lenger, kan den som inviterte deg sende en ny. Har du ikke ventet denne e-posten, kan du se bort fra den.' },
    ],
  },
  request_received: {
    subject: 'Vi har mottatt forespørselen din – ConnectHub',
    blocks: [
      { t: 'logo' },
      { t: 'h', text: 'Takk for forespørselen!' },
      { t: 'p', text: 'Vi har mottatt forespørselen din om en brukerkonto i ConnectHub. En administrator behandler den, og du får en e-post med en invitasjon hvis den blir godkjent.' },
      { t: 'link', label: 'Gå til ConnectHub' },
      { t: 'small', text: 'Du trenger ikke gjøre noe nå. Har du ikke sendt en forespørsel, kan du se bort fra denne e-posten.' },
    ],
  },
  request_notify: {
    subject: 'Ny forespørsel om brukerkonto – ConnectHub',
    blocks: [
      { t: 'logo' },
      { t: 'h', text: 'Ny forespørsel om brukerkonto' },
      { t: 'p', text: 'En ny forespørsel venter på behandling: **{navn}** ({menighet}).' },
      { t: 'link', label: 'Åpne Forespørsler' },
      { t: 'small', text: 'Telefon og e-post vises bare i ConnectHub.' },
    ],
  },
  password: {
    subject: 'Velg nytt passord – ConnectHub',
    blocks: [
      { t: 'logo' },
      { t: 'h', text: 'Velg nytt passord' },
      { t: 'p', text: 'Vi har fått en forespørsel om å sette nytt passord for kontoen din i ConnectHub.' },
      { t: 'link', label: 'Velg nytt passord' },
      { t: 'small', text: 'Lenken kan bare brukes én gang og slutter å virke etter kort tid. Har du ikke bedt om dette, kan du se bort fra e-posten. Ingenting endres før lenken brukes.' },
    ],
  },
};
export const TEMPLATE_NAMES = { welcome: 'Velkomstmail (invitasjon)', password: 'Nytt passord', request_received: 'Forespørsel mottatt', request_notify: 'Ny forespørsel (til stab)' };
