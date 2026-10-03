/* Bildevelgeren «Fellesmappe» for verktøyene (Loop Studio, Thumbnail Studio, Photo Design, Motion Design …).
   - Tre kilder: «Faste bilder» (menighetens faste bilder), «Felles ressurser» (logoer og bakgrunner) og «Fellesmappe»
     (menighetens delte bilder). Egne bilder bare på enheten velges med verktøyets egen opplastingsknapp.
   - Viser bare filer i brukerens aktive menighet som er delt med menigheten (aldri private filer, aldri andre menigheters
     filer – databasen gir uansett bare det brukeren har tilgang til).
   - Valg gir en referanse «ch:<fil-id>» til originalen (ingen kopi), pluss bildet som Blob for straks visning.
   - «Last opp» legger nye bilder i Fellesmappe (alle medlemmer kan det; nye bilder deles alltid med menigheten).
   Tilgang kontrolleres av serveren og databasen; velgeren skjuler bare det brukeren ikke kan bruke. */
import { files as F } from '../services/files.js';
import { activeChurch } from './shared-setup.js';

const T = s => (window.MLI18N && window.MLI18N.t ? window.MLI18N.t(s) : s);
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const ERR = { video_not_allowed: 'Video kan aldri lastes opp.', type_not_allowed: 'Bare bilder (PNG, JPG, WebP eller GIF) kan lastes opp.', too_large: 'Filen er for stor (maks 4 MB).',
  quota_exceeded: 'Lagringskvoten er brukt opp.', storage_full: 'Lagringsplassen i ConnectHub er full. Kontakt Developer.', forbidden: 'Du har ikke tilgang til dette.' };
const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; };
const BTN = 'height:34px;padding:0 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:transparent;color:#f3f1ec;font:inherit;font-size:13px;font-weight:600;cursor:pointer';
const AREAS = [
  ['faste', 'Faste bilder', ['faste']],
  ['ressurser', 'Felles ressurser', ['logoer', 'bakgrunner']],
  ['felles', 'Fellesmappe', ['bilder']],
];

export function pickFromFellesmappe({ title = 'Velg bilde fra Fellesmappe', start = 'faste' } = {}) {
  return new Promise(resolve => {
    const church = activeChurch(), prevFocus = document.activeElement;
    const ov = el('div', 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Archivo,"Helvetica Neue",Arial,sans-serif');
    ov.setAttribute('data-ch-picker', '1');
    const box = el('div', 'width:min(860px,100%);max-height:min(88vh,100%);display:flex;flex-direction:column;gap:12px;background:#111;color:#f3f1ec;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.5)');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', T(title));
    const head = el('div', 'display:flex;align-items:center;gap:10px');
    head.append(el('b', 'flex:1;font-size:17px', T(title)));
    const x = el('button', BTN + ';width:34px;padding:0', '✕'); x.type = 'button'; x.setAttribute('aria-label', T('Lukk')); head.append(x);
    const tabs = el('div', 'display:flex;gap:6px;flex-wrap:wrap'); tabs.setAttribute('role', 'tablist');
    const bar = el('div', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap');
    const msg = el('p', 'margin:0;font-size:13px;color:#b3afa6;flex:1;min-width:200px'); msg.setAttribute('role', 'status'); msg.setAttribute('data-ch-picker-msg', '1');
    const up = el('label', BTN + ';display:inline-flex;align-items:center;background:#f3f1ec;color:#111;border-color:#f3f1ec', T('Last opp og del i Fellesmappe'));
    const inp = el('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif'; inp.style.display = 'none'; up.append(inp); up.setAttribute('data-ch-picker-upload', '1');
    const open = el('a', 'font-size:13px;color:#b3afa6', T('Åpne Fellesmappe')); open.href = '/fellesmappe'; open.target = '_blank'; open.rel = 'noopener';
    bar.append(msg, up, open);
    const grid = el('div', 'flex:1;min-height:160px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;align-content:start');
    box.append(head, tabs, bar, grid); ov.append(box); document.body.append(ov);
    const urls = [];
    const close = v => { document.removeEventListener('keydown', key, true); ov.remove(); urls.forEach(u => URL.revokeObjectURL(u)); try { prevFocus && prevFocus.focus(); } catch (e) {} resolve(v || null); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', key, true);
    x.onclick = () => close(null); ov.onclick = e => { if (e.target === ov) close(null); };
    if (!church) { msg.textContent = T('Du er ikke medlem av en menighet. Bilder fra Fellesmappe vises bare for medlemmer.'); up.style.display = 'none'; return; }
    let area = AREAS.some(a => a[0] === start) ? start : 'faste', seq = 0;
    const choose = async (f, objUrl) => {
      try { const b = await (await fetch(objUrl)).blob(); close({ ref: 'ch:' + f.id, id: f.id, name: f.file_name, blob: b }); }
      catch (e) { msg.textContent = T('Bildet kunne ikke hentes. Prøv igjen.'); }
    };
    const paintTabs = () => { tabs.textContent = ''; for (const [k, l] of AREAS) { const b = el('button', BTN + (k === area ? ';background:#f3f1ec;color:#111;border-color:#f3f1ec' : ''), T(l)); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', k === area ? 'true' : 'false'); b.setAttribute('data-ch-picker-tab', k); b.onclick = () => { if (area !== k) { area = k; load(); } }; tabs.append(b); } };
    async function load() {
      const n = ++seq; paintTabs(); grid.textContent = ''; msg.textContent = T('Laster …');
      try {
        const fl = AREAS.find(a => a[0] === area)[2];
        const lists = await Promise.all(fl.map(folder => F.list({ churchId: church.id, folder })));
        const list = lists.flat().filter(f => f.visibility === 'church' && f.church_id === church.id).slice(0, 200);
        if (n !== seq) return;
        if (!list.length) { msg.textContent = T(area === 'faste' ? 'Ingen faste bilder ennå. Admin legger dem inn under Filer → Faste i ConnectHub. Du kan også velge fra Fellesmappe eller laste opp et bilde.' : area === 'ressurser' ? 'Ingen felles ressurser (logoer eller bakgrunner) ennå. Admin legger dem inn under Filer → Faste i ConnectHub.' : 'Fellesmappen er tom. Last opp det første bildet.'); return; }
        msg.textContent = fill(T('{n} bilder – trykk på et bilde for å bruke det.'), { n: list.length });
        const u = {}; for (let i = 0; i < list.length; i += 100) Object.assign(u, await F.objectUrls(list.slice(i, i + 100).map(f => f.id)));
        if (n !== seq) { Object.values(u).forEach(v => URL.revokeObjectURL(v)); return; }
        for (const f of list) {
          if (!u[f.id]) continue; urls.push(u[f.id]);
          const b = el('button', 'display:flex;flex-direction:column;gap:6px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#181818;color:#f3f1ec;font:inherit;font-size:11.5px;text-align:left;cursor:pointer');
          b.type = 'button'; b.setAttribute('data-ch-picker-file', f.file_name); b.title = f.file_name;
          const img = el('span', 'display:block;aspect-ratio:1;border-radius:8px;background:#0b0b0b center/contain no-repeat'); img.style.backgroundImage = 'url("' + u[f.id] + '")';
          b.append(img, el('span', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap', f.file_name));
          b.onclick = () => choose(f, u[f.id]); grid.append(b);
        }
      } catch (e) { if (n === seq) msg.textContent = T('Bildene kunne ikke hentes. Prøv igjen.'); }
    }
    inp.onchange = async () => {
      const file = inp.files && inp.files[0]; inp.value = ''; if (!file) return;
      msg.textContent = T('Laster opp …');
      try { const f = await F.upload(file, { churchId: church.id, folder: 'bilder' }); close({ ref: 'ch:' + f.id, id: f.id, name: f.file_name || file.name, blob: file, uploaded: true }); }
      catch (e) { msg.textContent = T(ERR[e && e.code] || 'Bildet kunne ikke lastes opp. Prøv igjen.'); }
    };
    load(); setTimeout(() => x.focus(), 0);
  });
}
