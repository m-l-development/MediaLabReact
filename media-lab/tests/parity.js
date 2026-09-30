// Felles verktøy for flyttester: samme steg kjøres på originalen (/_original/…) og React-versjonen,
// og etter hvert steg sammenlignes synlig tekst, skjermbilde (piksler) og eventuelle nedlastinger.
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const IMG = path.resolve('public/images/sondag.jpeg');
/* bakgrunnsbølgene fra ml-bg.js tegnes etter tiden siden skriptet startet; bare dette lerretet maskeres */
export const ML_BG = 'body > div[aria-hidden="true"][data-keep-color] canvas';
export const IMG2 = path.resolve('public/images/tirsdag.png');

/* andel piksler som er synlig ulike, beregnet i nettleseren */
export async function pixelDiff(page, a, b, tol = 30) {
  return page.evaluate(async ([a, b, tol]) => {
    const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, bm.width, bm.height); };
    const [x, y] = await Promise.all([load(a), load(b)]);
    if (x.width !== y.width || x.height !== y.height) return 1;
    let n = 0; for (let i = 0; i < x.data.length; i += 4) if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) + Math.abs(x.data[i + 3] - y.data[i + 3]) > tol) n++;
    return n / (x.width * x.height);
  }, [a.toString('base64'), b.toString('base64'), tol]);
}

/* Lokal buffer for CDN og AI-modeller (jsdelivr, unpkg, Hugging Face), så de bare lastes ned én gang.
   Innholdet leveres uendret; bare overføringskoding fjernes. */
const CACHE = path.resolve('.cache/cdn'), inflight = new Map();
const CDN = /^https:\/\/([a-z0-9-]+\.)*(cdn\.jsdelivr\.net|unpkg\.com|huggingface\.co|hf\.co|tessdata\.projectnaptha\.com)\//;
export async function cacheCdn(ctx) {
  fs.mkdirSync(CACHE, { recursive: true });
  await ctx.route(u => CDN.test(u.href), async route => {
    const req = route.request(); if (req.method() !== 'GET') return route.continue();
    const key = crypto.createHash('sha1').update(req.url()).digest('hex'), f = path.join(CACHE, key);
    if (!fs.existsSync(f + '.json')) {
      if (!inflight.has(key)) inflight.set(key, (async () => {
        const r = await route.fetch({ maxRedirects: 20, timeout: 600_000 });
        const h = Object.fromEntries(Object.entries(r.headers()).filter(([k]) => !/^(content-encoding|content-length|transfer-encoding|set-cookie)$/i.test(k)));
        h['access-control-allow-origin'] = '*';
        fs.writeFileSync(f, await r.body()); fs.writeFileSync(f + '.json', JSON.stringify({ status: r.status(), headers: h }));
      })().finally(() => inflight.delete(key)));
      await inflight.get(key);
    }
    const meta = JSON.parse(fs.readFileSync(f + '.json', 'utf8'));
    return route.fulfill({ status: meta.status, headers: meta.headers, body: fs.readFileSync(f) });
  });
}

/* Styrt klokke: performance.now og requestAnimationFrame går bare fram når testen sier det (__step),
   så animasjoner og videoforhåndsvisning står likt i begge versjonene. */
export const CLOCK = () => {
  let T = 1000; const q = [];
  performance.now = () => T;
  window.requestAnimationFrame = cb => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = ms => { const end = T + ms; while (T < end) { T = Math.min(end, T + 16); q.splice(0).forEach(f => { try { f(T); } catch (e) { console.error(e); } }); } };
};

export async function openSide(browser, url, { viewport = { width: 1440, height: 900 }, route, dialogs, init, cdn, clock, fixedNow, permissions = [] } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: 'Europe/Oslo', locale: 'nb-NO', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write', ...permissions] });
  /* norsk og mørk ved start – bare hvis ingenting er valgt, så valg overlever navigasjon mellom sider */
  await ctx.addInitScript(() => { if (!localStorage.getItem('medialab.theme')) localStorage.setItem('medialab.theme', 'dark'); if (!localStorage.getItem('medialab.lang')) localStorage.setItem('medialab.lang', 'no'); });
  /* samme «tilfeldige» tall i begge versjoner (tilfeldige id-er, farger osv.) */
  await ctx.addInitScript(() => { let s = 20260929; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  if (clock) await ctx.addInitScript(CLOCK);
  /* fast Date.now (id-er og tidsstempler i lagrede prosjekter/filer blir like i begge) */
  if (fixedNow) await ctx.addInitScript(t => { const R = Date; class D extends R { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } } window.Date = D; }, fixedNow);
  if (init) await ctx.addInitScript(init);
  if (route) await ctx.route(route[0], route[1]());
  if (cdn) await cacheCdn(ctx);
  const page = await ctx.newPage(), errors = [], downloads = [];
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  /* tidsstempler (f.eks. i advarsler fra onnxruntime) fjernes før sammenligning */
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|\{\{.*\}\}/.test(m.text())) errors.push(m.text().split('\n')[0].replace(/\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+/g, '(tid)')); });
  page.on('dialog', d => (dialogs ? dialogs(d) : d.accept()));
  /* filvelgere får et testbilde, eller filen et steg har satt i page.__nextFile */
  page.on('filechooser', fc => { const f = page.__nextFile || IMG; page.__nextFile = null; fc.setFiles(fc.isMultiple() || !Array.isArray(f) ? f : f[0]).catch(() => {}); });
  page.on('download', async d => { if (process.env.DLLOG) console.log('DOWNLOAD-HENDELSE ' + url + ' ' + d.suggestedFilename()); const p = await d.path().catch(e => { if (process.env.DLLOG) console.log('PATH-FEIL ' + e.message); return null; }); downloads.push({ name: d.suggestedFilename(), sha: p ? crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex') : null, path: p }); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  return { ctx, page, errors, downloads };
}

/* sammenligner PDF-strømmene (utpakket) i to filer */
function pdfDiff(a, b) {
  const str = d => [...d.toString('latin1').matchAll(/\/Length (\d+)[^>]*>>\s*stream\r?\n/g)].map(m => { const s = d.subarray(m.index + m[0].length, m.index + m[0].length + +m[1]); try { return zlib.inflateSync(s); } catch { return s; } });
  const [x, y] = [str(a), str(b)]; const ulikeUtenomBilde = []; let storsteAvvik = 0;
  x.forEach((p, i) => { const q = y[i]; if (!q || p.equals(q)) return; if (p.length !== q.length) { ulikeUtenomBilde.push(i); return; } let m = 0; for (let k = 0; k < p.length; k++) { const dd = Math.abs(p[k] - q[k]); if (dd > m) m = dd; } if (m > 4 || p.length < 100000) ulikeUtenomBilde.push(i); storsteAvvik = Math.max(storsteAvvik, m); });
  return { strommer: [x.length, y.length], ulikeUtenomBilde, storsteAvvik };
}

/* dekoder to videoer i nettleseren og sammenligner bilder ved 10 %, 50 % og 90 % av varigheten */
async function videoDiff(page, a, b) {
  /* egen, lett fane på samme opphav (så lerretet kan leses); videoene serveres av preview-serveren fra
     test-results/ (/__testfiler/, med Range), så også 4K-filer på over 100 MB virker */
  const dir = path.resolve('test-results/_video'); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(a, path.join(dir, 'a.mp4')); fs.copyFileSync(b, path.join(dir, 'b.mp4'));
  const vp = await page.context().newPage();
  try {
    const url = new URL('/__testfiler/_video/', page.url()).href;
    await vp.goto(new URL('/__testfiler/tom.html', page.url()).href);
    return await vp.evaluate(async base => {
      const seek = (v, t) => new Promise(r => { v.onseeked = r; v.currentTime = t; });
      /* én video om gangen: hent bildene ved 10/50/90 %, og slipp videoen før den neste lastes */
      const les = async s => {
        const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = base + s + '.mp4';
        await new Promise((r, j) => { v.onloadeddata = r; v.onerror = j; });
        const meta = { w: v.videoWidth, h: v.videoHeight, dur: Math.round(v.duration * 10) / 10 }, bilder = [];
        for (const f of [0.1, 0.5, 0.9]) { await seek(v, v.duration * f); const c = new OffscreenCanvas(960, 540), g = c.getContext('2d'); g.drawImage(v, 0, 0, 960, 540); bilder.push(g.getImageData(0, 0, 960, 540).data); }
        v.removeAttribute('src'); v.load(); return { meta, bilder };
      };
      const x = await les('a'), y = await les('b');
      const frames = x.bilder.map((p, k) => { const q = y.bilder[k]; let n = 0; for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 30) n++; return Math.round(n / (p.length / 4) * 1e5) / 1e5; });
      return { meta: [x.meta, y.meta], frames };
    }, url);
  } finally { await vp.close(); }
}

/* ---------- utforskning i takt ----------
   Velger en tilfeldig synlig kontroll (samme valg i begge, fast frø) og gjør samme handling i begge versjonene. */
export function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const SEL = 'button, [role="button"], [role="tab"], [role="switch"], [role="slider"], input:not([type=file]):not([type=hidden]), select, textarea, canvas, [contenteditable="true"]';
const KEYS = ['Control+z', 'Control+Shift+z', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Escape', 'Enter', 'Control+d', 'Control+c', 'Control+v'];
async function controls(page) {
  return page.evaluate(sel => [...document.querySelectorAll(sel)].map((e, i) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const vis = r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && !e.disabled && !e.closest('[aria-hidden="true"]') && e.checkVisibility({ opacityProperty: true });
    const label = (e.getAttribute('aria-label') || e.getAttribute('title') || e.innerText || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return vis ? { i, tag: e.tagName.toLowerCase(), type: e.type || '', label, min: e.min, max: e.max, step: e.step, n: e.options ? e.options.length : 0 } : null;
  }).filter(Boolean), SEL);
}
async function exploreStep(A, B, rng, k, opts) {
  const key = c => c.map(x => [x.i, x.tag, x.type, x.label].join('|')).join('\n');
  /* kontroller som legges inn med forsinkelse (f.eks. lys/mørk-knappen fra theme.js etter 900 ms) kan
     mangle et øyeblikk etter at siden er lastet: sjekk på nytt inntil fire ganger */
  let ca, cb;
  for (let tries = 0; ; tries++) {
    [ca, cb] = await Promise.all([controls(A), controls(B)]);
    if (key(ca) === key(cb) || tries >= 4) break;
    await Promise.all([A.waitForTimeout(800), B.waitForTimeout(800)]);
  }
  if (key(ca) !== key(cb)) { console.log('ULIKE KONTROLLER\n' + key(ca).split('\n').filter((l, i) => l !== key(cb).split('\n')[i]).slice(0, 5).join('\n') + '\n≠\n' + key(cb).split('\n').filter((l, i) => l !== key(ca).split('\n')[i]).slice(0, 5).join('\n')); return null; }
  const r = rng();
  if (r < 0.08 || !ca.length) { const kk = KEYS[Math.floor(rng() * KEYS.length)]; return [`u${k} tast ${kk}`, p => p.keyboard.press(kk)]; }
  const c = ca[Math.floor(rng() * ca.length)], v = rng(), v2 = rng(), v3 = rng(), v4 = rng();
  const loc = p => p.locator(SEL).nth(c.i), T = { timeout: 3000 };
  const name = `u${k} ${c.tag}${c.type ? '[' + c.type + ']' : ''} «${c.label}»`;
  if (c.tag === 'select') return [name + ' velg', p => loc(p).selectOption({ index: Math.floor(v * Math.max(1, c.n)) }, T)];
  if (c.tag === 'canvas') return [name + ' dra', async p => { const b = await loc(p).boundingBox(); if (!b) throw 0; await p.mouse.move(b.x + b.width * (0.1 + 0.8 * v), b.y + b.height * (0.1 + 0.8 * v2)); await p.mouse.down(); await p.mouse.move(b.x + b.width * (0.1 + 0.8 * v3), b.y + b.height * (0.1 + 0.8 * v4), { steps: 6 }); await p.mouse.up(); }];
  if (c.tag === 'input' && c.type === 'range') { const mn = +c.min || 0, mx = c.max === '' ? 100 : +c.max, st = +c.step || 1; const val = Math.min(mx, mn + Math.round(v * (mx - mn) / st) * st); return [name + ' = ' + +val.toFixed(4), p => loc(p).fill(String(+val.toFixed(4)), T)]; }
  if (c.tag === 'input' && c.type === 'color') { const hex = '#' + Math.floor(v * 0xffffff).toString(16).padStart(6, '0'); return [name + ' = ' + hex, p => loc(p).fill(hex, T)]; }
  if (c.tag === 'input' && c.type === 'number') { const val = String(Math.round(v * 100)); return [name + ' = ' + val, p => loc(p).fill(val, T)]; }
  if (c.tag === 'input' && (c.type === 'checkbox' || c.type === 'radio')) return [name + ' klikk', p => loc(p).click(T)];
  if (c.tag === 'textarea' || c.tag === 'input' || c.tag !== 'button' && c.type === '' && c.tag !== 'div') { const t = 'Test ' + k; return [name + ' = ' + t, p => loc(p).fill(t, T)]; }
  return [name + ' klikk', p => loc(p).click(T)];
}

/* Kjører stegene likt på begge og sammenligner. mask: selektor for elementer som tegnes etter klokken (f.eks. ml-bg-lerretet).
   opts.explore = { n, seed }: etter stegene gjøres n tilfeldige, like handlinger i begge (utforskning i takt). */
export async function flow(browser, name, origUrl, reactUrl, steps, opts = {}) {
  /* SELVTEST=1: originalen mot seg selv – viser hva som varierer mellom to kjøringer uansett */
  if (process.env.SELVTEST) reactUrl = origUrl;
  if (process.env.SELVTEST_REACT) origUrl = reactUrl;
  const A = await openSide(browser, origUrl, opts), B = await openSide(browser, reactUrl, opts);
  /* synlig tekst + feltverdier + lenker + hele localStorage (lagringsformatet må være uendret) */
  const text = p => p.evaluate(() => JSON.stringify({
    /* filstørrelsen etter videoeksport avhenger av videokoderen (varierer også i originalen) */
    text: document.body.innerText.replace(/\s+/g, ' ').trim().replace(/(Ferdig på \d+ s · )[\d.,]+ MB/g, '$1# MB'),
    values: [...document.querySelectorAll('input:not([type=file]), textarea, select')].map(e => e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value),
    /* blob:-adresser (nedlastinger) får tilfeldig id av nettleseren, også i originalen */
    links: [...document.querySelectorAll('a')].map(a => (a.getAttribute('href') || a.getAttribute('data-ml-href') || '').replace(/^blob:.*/, 'blob:(tilfeldig id)')),
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
    /* rulleposisjon (vindu og rullbare paneler) er også en del av opplevelsen */
    scroll: [Math.round(scrollX), Math.round(scrollY), ...[...document.querySelectorAll('*')].filter(e => e.scrollTop > 0 || e.scrollLeft > 0).map(e => e.tagName + ':' + Math.round(e.scrollLeft) + ',' + Math.round(e.scrollTop) + ' «' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40) + '»')],
  }));
  const shot = P => P.screenshot({ fullPage: !opts.viewportOnly, animations: 'disabled', caret: 'hide', mask: [P.locator(opts.mask || ML_BG)], maskColor: '#000' });
  const report = [], warnings = [];
  const all = [...steps];
  const rng = seeded(opts.explore ? opts.explore.seed : 1);
  for (let si = 0; si < all.length || (opts.explore && si < steps.length + opts.explore.n); si++) {
    if (si >= all.length) {
      const next = await exploreStep(A.page, B.page, rng, si - steps.length + 1, opts);
      if (!next) { expect.soft(null, 'kontrollene på siden er ulike i original og React – utforskningen stoppet').toBe('like'); break; }
      all.push(next);
    }
    const [step, run, stepOpts] = all[si];
    const t = Date.now();
    if (opts.explore && si >= steps.length) {
      const [ra, rb] = await Promise.all([run(A.page).then(() => 'ok', e => 'feil'), run(B.page).then(() => 'ok', e => 'feil')]);
      expect.soft(rb, `utfall av «${step}»`).toBe(ra);
      /* handlingen kan navigere til et annet verktøy (f.eks. «Send til …»): vent, og gå tilbake til siden i begge */
      await Promise.all([A.page, B.page].map(P => P.waitForLoadState('networkidle').catch(() => {})));
      await Promise.all([A.page.waitForTimeout(400), B.page.waitForTimeout(400)]);
      const away = [A.page, B.page].map(P => new URL(P.url()).pathname !== new URL(P === A.page ? origUrl : reactUrl, 'http://x').pathname);
      expect.soft(away[1], `navigerte bort etter «${step}»`).toBe(away[0]);
      for (const P of [A.page, B.page]) if (away[P === A.page ? 0 : 1]) await P.goto(new URL(P === A.page ? origUrl : reactUrl, P.url()).href, { waitUntil: 'networkidle' });
      if (opts.idle) await Promise.all([opts.idle(A.page), opts.idle(B.page)]).catch(() => {});
    } else if (stepOpts && stepOpts.seq) {
      /* tunge steg (f.eks. store AI-modeller) kjøres etter hverandre for å spare minne */
      await run(A.page).catch(e => { throw new Error(`steg «${step}» feilet i originalen: ${e.message.split('\n')[0]}`); });
      await run(B.page).catch(e => { throw new Error(`steg «${step}» feilet i React: ${e.message.split('\n')[0]}`); });
    } else await Promise.all([run(A.page), run(B.page)]).catch(e => { throw new Error(`steg «${step}» feilet: ${e.message.split('\n')[0]}`); });
    if (process.env.STEGLOGG) console.log(`  steg «${step}» ${Date.now() - t} ms`);
    /* KART=1: skriv ut synlige kontroller etter hvert steg (hjelp til å skrive nye steg) */
    if (process.env.KART) console.log(`  KART etter «${step}»: ` + (await B.page.evaluate(() => [...document.querySelectorAll('button,[role=button],input,select')].filter(e => e.checkVisibility()).map(e => (e.tagName === 'INPUT' ? 'input[' + e.type + ']' : '') + (e.getAttribute('aria-label') || e.title || e.innerText || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 22) + '#' + (e.getAttribute('data-dc-tpl') || '')).filter(x => !/^#[0-9a-f]{6}#/.test(x)).join(' | '))).slice(0, 1500));
    await Promise.all([A.page.waitForTimeout(opts.settle ?? 700), B.page.waitForTimeout(opts.settle ?? 700)]);
    if (opts.clock) await Promise.all([A.page.evaluate(ms => window.__step(ms), opts.clock), B.page.evaluate(ms => window.__step(ms), opts.clock)]);
    let ta, tb, sa, sb, d;
    /* asynkront arbeid (eksport, filstørrelse, sidelasting) kan være ulikt langt kommet: sjekk på nytt
       inntil fire ganger. Lik oppførsel ender likt; en ekte forskjell består. */
    for (let tries = 0; ; tries++) {
      [ta, tb] = await Promise.all([text(A.page), text(B.page)]);
      [sa, sb] = await Promise.all([shot(A.page), shot(B.page)]);
      d = await pixelDiff(A.page, sa, sb);
      if ((ta === tb && d < 0.002) || tries >= 4) break;
      /* rulleposisjonen (Playwright ruller elementer inn i bildet før klikk) varierer også når originalen
         kjøres mot seg selv; er den ulik, settes React-versjonens lik originalens før ny sammenligning */
      const pos = await A.page.evaluate(() => ({ win: [scrollX, scrollY], els: [...document.querySelectorAll('#dc-root *')].map((e, i) => [i, e.scrollLeft, e.scrollTop]).filter(x => x[1] || x[2]) }));
      await B.page.evaluate(p => { const I = 'instant', all = document.querySelectorAll('#dc-root *'); for (const e of all) if (e.scrollLeft || e.scrollTop) e.scrollTo({ left: 0, top: 0, behavior: I }); p.els.forEach(([i, l, t]) => { if (all[i]) all[i].scrollTo({ left: l, top: t, behavior: I }); }); window.scrollTo({ left: p.win[0], top: p.win[1], behavior: I }); }, pos);
      await Promise.all([A.page.waitForTimeout(1200), B.page.waitForTimeout(1200)]);
      if (opts.clock) await Promise.all([A.page.evaluate(ms => window.__step(ms), opts.clock), B.page.evaluate(ms => window.__step(ms), opts.clock)]);
    }
    if (d >= Number(process.env.DIFFSAVE ?? 0.002) && d > 0) { const dir = `test-results/${name}-diff`; fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(`${dir}/${step}-original.png`, sa); fs.writeFileSync(`${dir}/${step}-react.png`, sb); }
    if (ta !== tb) { const dir = `test-results/${name}-diff`; fs.mkdirSync(dir, { recursive: true }); const f = s => s.replace(/[\/:*?"<>|]/g, '_'); fs.writeFileSync(`${dir}/${f(step)}-original.json`, JSON.stringify(JSON.parse(ta), null, 1)); fs.writeFileSync(`${dir}/${f(step)}-react.json`, JSON.stringify(JSON.parse(tb), null, 1)); }
    report.push(`${step}: tekst/lenker/lagring ${ta === tb ? 'lik' : 'ULIK'}, piksler ${(d * 100).toFixed(3)} % ulike`);
    /* rulleposisjon varierer også i originalen mot seg selv (Playwright ruller elementer inn i bildet før klikk),
       så den logges som advarsel; alt annet må være likt */
    const [ja, jb] = [JSON.parse(ta), JSON.parse(tb)];
    if (JSON.stringify(ja.scroll) !== JSON.stringify(jb.scroll)) { warnings.push(`${step}: rulleposisjon original ${JSON.stringify(ja.scroll)} / react ${JSON.stringify(jb.scroll)}`); delete ja.scroll; delete jb.scroll; }
    expect.soft(jb, `tekst, felt, lenker og localStorage etter «${step}»`).toEqual(ja);
    expect.soft(d, `piksler etter «${step}»`).toBeLessThan(0.002);
  }
  const dl = D => JSON.stringify(D.map(d => [d.name, d.sha]));
  if (warnings.length) console.log(`ADVARSEL ${name}: ${warnings.length} steg med ulik rulleposisjon, første: ${warnings[0]}`);
  console.log(`--- ${name}\n` + report.join('\n') + `\nnedlastinger: ${dl(A.downloads)} / ${dl(B.downloads)}`);
  /* Video fra WebCodecs er ikke byte-deterministisk (originalen mot seg selv gir også ulike filer),
     så MP4/WebM sammenlignes på varighet, oppløsning og dekodede bilder. Alle andre filer byte for byte. */
  const isVid = d => /\.(mp4|webm)$/i.test(d.name);
  expect.soft(B.downloads.map(d => d.name), 'nedlastede filnavn').toEqual(A.downloads.map(d => d.name));
  /* ulike filer tas vare på for kontroll */
  A.downloads.forEach((a, i) => { const b = B.downloads[i]; if (b && a.sha !== b.sha && a.path && b.path) { const dir = `test-results/${name}-nedlastinger`; fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(a.path, `${dir}/${i}-original-${a.name}`); fs.copyFileSync(b.path, `${dir}/${i}-react-${b.name}`); } });
  /* bildefiler: nettleserens PNG/JPG-koder gir av og til ulike bytes for samme bilde (også originalen mot
     seg selv), så ved ulike bytes sammenlignes pikslene (må være helt like). Andre filer: byte for byte. */
  const isImg = d => /\.(png|jpe?g|webp)$/i.test(d.name), isPdf = d => /\.pdf$/i.test(d.name);
  expect.soft(B.downloads.filter(d => !isVid(d) && !isImg(d) && !isPdf(d)).map(d => d.sha), 'nedlastede filer (innhold)').toEqual(A.downloads.filter(d => !isVid(d) && !isImg(d) && !isPdf(d)).map(d => d.sha));
  /* PDF: ved ulike bytes pakkes strømmene ut (Flate) og sammenlignes; avrunding på høyst 4 per verdi tillates */
  for (let i = 0; i < Math.min(A.downloads.length, B.downloads.length); i++) {
    const a = A.downloads[i], b = B.downloads[i];
    if (!isPdf(a) || a.sha === b.sha || !a.path || !b.path) continue;
    const r = pdfDiff(fs.readFileSync(a.path), fs.readFileSync(b.path));
    console.log(`pdf ${a.name}: ulike bytes; ${JSON.stringify(r)}`);
    expect.soft(r.strommer[1], `pdf ${a.name}: antall strømmer`).toBe(r.strommer[0]);
    expect.soft(r.ulikeUtenomBilde, `pdf ${a.name}: strømmer som ikke er like`).toEqual([]);
    expect.soft(r.storsteAvvik, `pdf ${a.name}: største avvik i bildedata`).toBeLessThanOrEqual(4);
  }
  for (let i = 0; i < Math.min(A.downloads.length, B.downloads.length); i++) {
    const a = A.downloads[i], b = B.downloads[i];
    if (!isImg(a) || a.sha === b.sha || !a.path || !b.path) continue;
    /* avrunding i nettleserens tegning (f.eks. alfa 50 mot 51 i gjennomsiktige lag) tillates: høyst 4 enheter per piksel */
    /* JPEG komprimerer med tap: avrunding i råbildet kan gi litt større avvik i en 8×8-blokk, så JPG får samme
       toleranse som skjermbilder (30 per piksel) og under 0,01 % ulike piksler */
    const jpg = /\.jpe?g$/i.test(a.name), r = await pixelDiff(A.page, fs.readFileSync(a.path), fs.readFileSync(b.path), jpg ? 30 : 4);
    console.log(`bilde ${a.name}: ulike bytes, andel ulike piksler ${r}`);
    if (jpg) expect.soft(r, `bilde ${a.name}: andel ulike piksler`).toBeLessThan(0.0001);
    else expect.soft(r, `bilde ${a.name}: andel ulike piksler`).toBe(0);
  }
  for (let i = 0; i < Math.min(A.downloads.length, B.downloads.length); i++) {
    const a = A.downloads[i], b = B.downloads[i];
    if (!isVid(a) || !a.path || !b.path) continue;
    const r = await videoDiff(A.page, a.path, b.path);
    console.log(`video ${a.name}: ${JSON.stringify(r)}`);
    /* sanntidsopptak (MediaRecorder) kan avvike en tidel i varighet, også i originalen */
    expect.soft([r.meta[1].w, r.meta[1].h], `video ${a.name}: oppløsning`).toEqual([r.meta[0].w, r.meta[0].h]);
    expect.soft(Math.abs(r.meta[1].dur - r.meta[0].dur), `video ${a.name}: avvik i varighet (s)`).toBeLessThanOrEqual(0.2);
    expect.soft(Math.max(...r.frames), `video ${a.name}: største andel ulike piksler i bildene`).toBeLessThan(0.01);
  }
  expect(B.errors, 'JS-feil').toEqual(A.errors);
  await A.ctx.close(); await B.ctx.close();
}
