/* eslint-disable */
// Portert uendret fra media-lab/src/legacy/ukeloop-engine.js (programtolking, taktanalyse, fonter).
// Ikke skriv om: eksporterte spillere og gamle prosjekter må se helt like ut.
var DAYS = { mandag: 'Mandag', tirsdag: 'Tirsdag', onsdag: 'Onsdag', torsdag: 'Torsdag', fredag: 'Fredag', 'lørdag': 'Lørdag', lordag: 'Lørdag', 'søndag': 'Søndag', sondag: 'Søndag',
  man: 'Mandag', tir: 'Tirsdag', tirs: 'Tirsdag', ons: 'Onsdag', tor: 'Torsdag', tors: 'Torsdag', fre: 'Fredag', 'lør': 'Lørdag', 'søn': 'Søndag' };
var FULL_RE = /^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|lordag|søndag|sondag)(?![a-zæøå])\.?(.*)$/i;
var ABBR_RE = /^(man|tirs|tir|ons|tors|tor|fre|lør|søn)\.?(?=\s*$|\s*[\d(:,–-]|\s+kl)(.*)$/i;
var T = '\\d{1,2}(?:[:.]\\d{2})?';
var TIME_RE = new RegExp('^(?:kl\\.?\\s*(' + T + ')|(\\d{1,2}[:.]\\d{2}))(?:\\s*(?:-|–|—|til)\\s*(' + T + '))?(.*)$', 'i');
var TIME_END = new RegExp('^(.*?)[\\s,–-]*\\bkl\\.?\\s*(' + T + ')(?:\\s*(?:-|–|—|til)\\s*(' + T + '))?\\s*$', 'i');
var TIME_ONLY = new RegExp('^(?:kl\\.?\\s*)?(' + T + ')(?:\\s*[-–—]\\s*(' + T + '))?$', 'i');
var DATE_RE = /^\(?(\d{1,2}\.\s?\d{1,2}\.?(?:\d{2,4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}\.?\s+(?:jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|des)[a-zæøå]*\.?)\)?/i;
var EXTRA_RE = /^ekstra\b\s*[:\-–]?\s*/i;
var DATE_LINE = /^(\d{1,2}\.?\s*(?:[-–]\s*\d{1,2}\.?\s*)?(?:jan|feb|mar|apr|mai|jun|jul|aug|sep|okt|nov|des)[a-zæøå]*\.?)\s*[:–-]?\s*(.*)$/i;
function tidyDate(s) { return String(s || '').replace(/(\d)\.(?=[a-zæøå])/gi, '$1. ').replace(/\.\s*-\s*/g, '.–').replace(/\s+/g, ' ').replace(/[\s:.]+$/, function (m) { return /\d\.$/.test(s.trim()) ? '.' : ''; }).trim(); }
function normT(s) { var p = s.replace('.', ':').split(':'); return ('0' + p[0]).slice(-2) + ':' + (p[1] || '00'); }
function fmtT(a, b) { return a ? 'kl ' + normT(a) + (b ? '–' + normT(b) : '') : ''; }
function keyOf(name) { return String(name || '').toLowerCase().replace(/ø/g, 'o').replace(/å/g, 'a').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function splitPlace(rest) {
  var m = rest.match(/^(.*\S)\s*\(([^)]+)\)$/); if (m) return [m[1], m[2]];
  var seps = [' | ', ' – ', ' — ', ' - ', ' @ '];
  for (var i = 0; i < seps.length; i++) { var k = rest.lastIndexOf(seps[i]); if (k > 0) return [rest.slice(0, k).trim(), rest.slice(k + seps[i].length).trim()]; }
  return [rest, ''];
}
function parseEvent(str) {
  str = str.trim().replace(/^[•*·]\s*/, '').replace(/^[-–]\s+/, '');
  var m = str.match(TIME_RE), time = '', rest = str;
  if (m) { time = fmtT(m[1] || m[2], m[3]); rest = m[4] || ''; }
  else { var e = str.match(TIME_END); if (e) { time = fmtT(e[2], e[3]); rest = e[1]; } }
  rest = rest.replace(/^[\s:–\-|,.]+/, '').replace(/[\s,–-]+$/, '').trim();
  if (!rest && !time) return null;
  var sp = splitPlace(rest);
  return { time: time, title: sp[0], place: sp[1] };
}
function matchDay(line) {
  var m = line.match(FULL_RE) || line.match(ABBR_RE);
  if (!m) return null;
  var name = DAYS[m[1].toLowerCase()], rest = (m[2] || '').replace(/^[\s.,:–-]+/, ''), date = '';
  var dm = rest.match(DATE_RE);
  if (dm) {
    var after = rest.slice(dm[0].length).replace(/^[\s:–\-,]+/, '');
    if (!after || TIME_RE.test(after) || /[\/a-zæøå]/i.test(dm[1])) { date = dm[1].trim(); rest = after; }
  }
  return { name: name, date: date, rest: rest.trim() };
}
function parse(text) {
  var days = [], cur = null, week = null, inline = false;
  function getExtra() { var d = getDay('Ekstra', ''); d.extra = true; return d; }
  function getDay(name, date) {
    date = tidyDate(date || '');
    for (var i = 0; i < days.length; i++) {
      var x = days[i];
      if (x.name === name && (!date || !x.date || x.date === date)) { if (date && !x.date) x.date = date; return x; }
    }
    var base = keyOf(name), key = base, n = 2;
    while (days.some(function (y) { return y.key === key; })) key = base + '-' + (n++);
    var d = { key: key, base: base, name: name, date: date, events: [] }; days.push(d); return d;
  }
  String(text || '').split(/\r?\n/).forEach(function (raw) {
    var line = raw.trim(); if (!line) return;
    var cells = raw.split(/\t|;/).map(function (c) { return c.trim(); });
    if (cells.length >= 3) {
      if (/^(dag|day|ukedag)$/i.test(cells[0])) return;
      var c = cells.slice(), dm = c[0] ? matchDay(c[0]) : null;
      if (dm) { cur = getDay(dm.name, dm.date); c.shift(); } else if (!c[0]) c.shift();
      if (c.length >= 2 && DATE_RE.test(c[0]) && TIME_ONLY.test(c[1])) { if (cur && !cur.date) cur.date = c[0]; c.shift(); }
      var tm = c[0] && c[0].match(TIME_ONLY), time = '';
      if (tm) { time = fmtT(tm[1], tm[2]); c.shift(); }
      var rest = c.filter(Boolean);
      if (!rest.length && !time) return;
      (cur || getExtra()).events.push({ time: time, title: rest[0] || '', place: rest.slice(1).join(', ') });
      return;
    }
    var wk = line.match(/^uke\s*(\d{1,2})\b/i);
    if (wk && !cur) { week = 'Uke ' + wk[1]; return; }
    var d = matchDay(line);
    if (EXTRA_RE.test(line)) { var ex = parseEvent(line.replace(EXTRA_RE, '')); if (ex) getExtra().events.push(ex); return; }
    if (d) { cur = getDay(d.name, d.date); inline = !!d.rest; if (d.rest) { var e0 = parseEvent(d.rest); if (e0) cur.events.push(e0); } return; }
    var dl = line.match(DATE_LINE);
    if (dl) {
      var nm = tidyDate(dl[1]); nm = nm.charAt(0).toUpperCase() + nm.slice(1);
      cur = getDay(nm, ''); inline = !!(dl[2] || '').trim();
      var e1 = parseEvent(dl[2] || ''); if (e1) cur.events.push(e1);
      return;
    }
    if (!cur || inline) { if (/:\s*$/.test(line)) return; var ev0 = parseEvent(line); if (ev0) getExtra().events.push(ev0); return; }
    var ev = parseEvent(line);
    if (ev) cur.events.push(ev);
  });
  return { week: week, days: days };
}
function serialize(daySlides) {
  return daySlides.map(function (s) {
    return (s.extra && !s.day ? 'Ekstra: ' : '') + [s.day, s.date, s.time, s.title].filter(Boolean).join(' ') + (s.place ? ' – ' + s.place : '');
  }).join('\n');
}
/* tempo + downbeat from decoded audio: onset envelope -> autocorrelation -> comb refine */
function detectBeat(buf) {
  var sr = buf.sampleRate, hop = Math.max(1, Math.round(sr / 100)), fps = sr / hop;
  var len = Math.min(buf.length, Math.floor(sr * 360)), n = Math.floor(len / hop);
  if (n < 400) return null;
  var c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  var a = 1 - Math.exp(-2 * Math.PI * 160 / sr), lp = 0, lo = new Float32Array(n), hi = new Float32Array(n), en = new Float32Array(n), f, j;
  for (f = 0; f < n; f++) {
    var el = 0, eh = 0, b = f * hop;
    for (j = 0; j < hop; j++) { var x = c1 ? (c0[b + j] + c1[b + j]) * 0.5 : c0[b + j]; lp += a * (x - lp); el += lp * lp; var h = x - lp; eh += h * h; }
    lo[f] = Math.log(1e-6 + el); hi[f] = Math.log(1e-6 + eh); en[f] = (el + eh) / hop;
  }
  var on = new Float32Array(n), kick = new Float32Array(n);
  for (f = 1; f < n; f++) { var dl = Math.max(0, lo[f] - lo[f - 1]), dh = Math.max(0, hi[f] - hi[f - 1]); kick[f] = dl; on[f] = dl + dh * 0.7; }
  var ps = new Float64Array(n + 1), o2 = new Float32Array(n), Wn = 8;
  for (f = 0; f < n; f++) ps[f + 1] = ps[f] + on[f];
  for (f = 0; f < n; f++) { var l0 = Math.max(0, f - Wn), l1 = Math.min(n, f + Wn + 1); o2[f] = Math.max(0, on[f] - (ps[l1] - ps[l0]) / (l1 - l0)); }
  var acSum = 0, acN = 0, rawBest = 0;
  var best = -1, bestL = 0, minL = Math.floor(fps * 60 / 180), maxL = Math.ceil(fps * 60 / 70);
  for (var L = minL; L <= maxL; L++) {
    var s = 0; for (f = 0; f + L < n; f++) s += o2[f] * o2[f + L];
    s /= (n - L); acSum += s; acN++;
    var bpm = 60 * fps / L, w = Math.exp(-0.5 * Math.pow(Math.log(bpm / 120) / Math.LN2 / 0.7, 2));
    if (s * w > best) { best = s * w; bestL = L; rawBest = s; }
  }
  if (!bestL || best <= 0) return null;
  function samp(t) { var i = Math.floor(t), fr = t - i; if (i < 0 || i + 1 >= n) return 0; return o2[i] * (1 - fr) + o2[i + 1] * fr; }
  var b0 = 60 * fps / bestL, bb = b0, bs = -1, bph = 0;
  for (var bt = b0 - 2.5; bt <= b0 + 2.5; bt += 0.05) {
    var P = 60 * fps / bt;
    for (var ph = 0; ph < P; ph += 1) {
      var s2 = 0, cnt = 0; for (var t = ph; t < n; t += P) { s2 += samp(t); cnt++; }
      s2 /= cnt || 1; if (s2 > bs) { bs = s2; bb = bt; bph = ph; }
    }
  }
  var PP = 60 * fps / bb, dsc = [0, 0, 0, 0], k = 0;
  for (var tt = bph; tt < n; tt += PP, k++) { var ii = Math.round(tt), v = 0; for (var d = -1; d <= 1; d++) v += kick[Math.max(0, Math.min(n - 1, ii + d))]; dsc[k % 4] += v; }
  var dj = 0; for (k = 1; k < 4; k++) if (dsc[k] > dsc[dj]) dj = k;
  var win = Math.round(fps / 2), m = Math.floor(n / win), env = [], i2;
  for (i2 = 0; i2 < m; i2++) { var q = 0; for (j = 0; j < win; j++) q += en[i2 * win + j]; env.push(Math.sqrt(q / win)); }
  var srt = env.slice().sort(function (x, y) { return x - y; }), top = srt[Math.floor(srt.length * 0.95)] || 1, bot = srt[Math.floor(srt.length * 0.1)] || 0;
  var sm = env.map(function (v, i) { var s3 = 0, c3 = 0; for (var d2 = -3; d2 <= 3; d2++) { var y = env[i + d2]; if (y != null) { s3 += y; c3++; } } return s3 / c3; });
  env = sm.map(function (v) { return Math.round(clamp((v - bot) / ((top - bot) || 1), 0, 1) * 100) / 100; });
  var clarity = acN ? rawBest / (acSum / acN) : 1, bpmR = Math.round(bb * 100) / 100;
  var kS = 0, oS = 0, om = 0, ov = 0, peaks = 0;
  for (f = 0; f < n; f++) { kS += kick[f]; oS += on[f]; om += o2[f]; }
  om /= n; for (f = 0; f < n; f++) ov += (o2[f] - om) * (o2[f] - om); var osd = Math.sqrt(ov / n), thr = om + 1.5 * osd;
  for (f = 1; f < n - 1; f++) if (o2[f] > thr && o2[f] >= o2[f - 1] && o2[f] > o2[f + 1]) peaks++;
  var kickShare = oS ? kS / oS : 0, rate = peaks / (n / fps), em = 0, ev = 0;
  env.forEach(function (v) { em += v; }); em /= env.length || 1; env.forEach(function (v) { ev += (v - em) * (v - em); }); var dyn = Math.sqrt(ev / (env.length || 1));
  var g;
  if (clarity < 1.3 || bpmR < 80 || rate < 1.2) g = kickShare < 0.35 ? (bpmR >= 100 && rate >= 2 ? 'episk' : dyn > 0.22 ? 'piano' : 'rolig') : 'lovsang';
  else if (clarity < 1.6 && kickShare < 0.4) g = bpmR >= 100 ? (kickShare < 0.3 ? 'episk' : 'pop') : 'lovsang';
  else if (bpmR >= 118) g = clarity > 2.6 && kickShare > 0.5 ? 'elektronisk' : 'upbeat';
  else if (bpmR < 105 && kickShare > 0.45) g = 'groove';
  else g = 'pop';
  var calmG = g === 'rolig' || g === 'piano' || g === 'lovsang';
  return { bpm: bpmR, first: (bph + dj * PP) / fps, clarity: Math.round(clarity * 100) / 100, kick: Math.round(kickShare * 100) / 100, rate: Math.round(rate * 10) / 10, dyn: Math.round(dyn * 100) / 100, genre: g, style: calmG ? 'calm' : 'groove', env: env, envRate: fps / win };
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function toDataURL(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }
var FONT_CSS = '/fonts/archivo.css';
async function embeddedFontCSS(url) {
  try {
    url = url || FONT_CSS; if (!/^\/fonts\/[a-z0-9-]+\.css$/.test(url)) return '';
    var rules = (await (await fetch(url)).text()).split('\n').filter(function (r) { return r.indexOf('@font-face') === 0 && /font-style:\s*normal/.test(r); });
    var out = '';
    for (var i = 0; i < rules.length; i++) {
      var m = rules[i].match(/url\((\/fonts\/[a-z0-9-]+\.woff2)\)/); if (!m) continue;
      var data = await toDataURL(await (await fetch(m[1])).blob()); out += rules[i].replace(m[0], 'url(' + data + ')') + '\n';
    }
    return out;
  } catch (e) { return ''; }
}
var SAMPLE = [
  'Tirsdag kl 19:00 Kveldsmat i kafeen',
  'Torsdag kl 11:00 Bønn',
  'Fredag kl 19:00 Ungdomsmøte',
  'Søndag kl 11:00 Søndagsmøte'
].join('\n');

export { parse, serialize, keyOf, toDataURL, detectBeat, embeddedFontCSS, SAMPLE, FONT_CSS }
