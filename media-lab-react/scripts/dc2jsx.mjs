/* Konverterer en .dc.html-side (dc-runtime) til React/JSX, mekanisk og uten å endre oppførsel.
   Oversettelsen følger support.js regel for regel:
   - <x-dc>-malen → src/pages/<id>/template.jsx (funksjon av renderVals())
   - <script data-dc-script> → src/pages/<id>/logic.js (klassen ordrett, extends DCLogic)
   - style-hover/style-focus → src/pages/<id>/pseudo.css (samme !important-regler)
   - <head> + <helmet> → <id>.html med samme meta, lenker og stiler
   Bruk: node scripts/dc2jsx.mjs [side-id …]   (uten argumenter: alle i PAGES) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment, serializeOuter } from 'parse5';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ML = path.resolve(ROOT, '../media-lab');

/* id → kilde i media-lab/ og html-fil i dette prosjektet */
/* React-sidene får samme filnavn som originalene, så lenker og bokmerker virker uendret */
export const PAGES = {
  'media-lab': { src: 'media-lab.dc.html' },
  'admin': { src: 'admin.dc.html' },
  'mockups': { src: 'mockups.dc.html' },
  'loop-studio': { src: 'loop-studio.dc.html' },
  'isolate-subject': { src: 'isolate-subject.dc.html' },
  'photo-design': { src: 'photo-design.dc.html' },
  'thumbnail-studio': { src: 'thumbnail-studio.dc.html' },
  'motion-design': { src: 'motion-design.dc.html' },
};

/* ---------- kopier av dc-runtime (support.js) ---------- */
const CAMEL_ATTR = 'sc-camel-';
const RAW_WRAP = { select: 'sc-raw-select', table: 'sc-raw-table', tbody: 'sc-raw-tbody', thead: 'sc-raw-thead', tfoot: 'sc-raw-tfoot', tr: 'sc-raw-tr', td: 'sc-raw-td', th: 'sc-raw-th', caption: 'sc-raw-caption' };
const RAW_UNWRAP = Object.fromEntries(Object.entries(RAW_WRAP).map(([k, v]) => [v, k]));
const EVENT_MAP = { onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onsubmit: 'onSubmit', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp', onkeypress: 'onKeyPress', onmousedown: 'onMouseDown', onmouseup: 'onMouseUp', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave', onfocus: 'onFocus', onblur: 'onBlur', ondoubleclick: 'onDoubleClick', oncontextmenu: 'onContextMenu', onmousemove: 'onMouseMove', onmouseover: 'onMouseOver', onmouseout: 'onMouseOut', onpointerdown: 'onPointerDown', onpointerup: 'onPointerUp', onpointermove: 'onPointerMove', onpointerenter: 'onPointerEnter', onpointerleave: 'onPointerLeave', onpointercancel: 'onPointerCancel', onpointerover: 'onPointerOver', onpointerout: 'onPointerOut', ongotpointercapture: 'onGotPointerCapture', onlostpointercapture: 'onLostPointerCapture', ontouchstart: 'onTouchStart', ontouchend: 'onTouchEnd', ontouchmove: 'onTouchMove', ontouchcancel: 'onTouchCancel', ondragstart: 'onDragStart', ondragend: 'onDragEnd', ondragenter: 'onDragEnter', ondragleave: 'onDragLeave', ondragover: 'onDragOver', onanimationstart: 'onAnimationStart', onanimationend: 'onAnimationEnd', onanimationiteration: 'onAnimationIteration', ontransitionend: 'onTransitionEnd' };
const ATTRS = `(?:[^>"']|"[^"]*"|'[^']*')*`;
const IMPORT_SELF_CLOSE_RE = new RegExp('<(x-import|dc-import)(' + ATTRS + ')/>', 'gi');
function encodeCase(html) {
  html = html.replace(IMPORT_SELF_CLOSE_RE, (_, t, a) => '<' + t + a + '></' + t + '>');
  html = html.replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>');
  html = html.replace(/(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g, (_, sp, name, eq) => sp + CAMEL_ATTR + name.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + eq);
  for (const [real, alias] of Object.entries(RAW_WRAP)) html = html.replace(new RegExp('(</?)' + real + '(?=[\\s>])', 'gi'), '$1' + alias);
  return html;
}
const kebabToCamel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function cssToObj(css) {
  const o = {};
  for (const decl of css.split(';')) { const i = decl.indexOf(':'); if (i < 0) continue; const prop = decl.slice(0, i).trim(); o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim(); }
  return o;
}
function scanUnquotedUrl(css, i) {
  if ((css[i] !== 'u' && css[i] !== 'U') || css.slice(i, i + 4).toLowerCase() !== 'url(' || /[a-z0-9_-]/i.test(css[i - 1] ?? '')) return -1;
  let j = i + 4; while (j < css.length && /\s/.test(css[j])) j++;
  if (css[j] === '"' || css[j] === "'") return -1;
  while (j < css.length && css[j] !== ')') { if (css[j] === '\\') j++; j++; }
  return j < css.length ? j + 1 : css.length;
}
function stripComments(css) {
  let out = '', quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') { out += c + (css[i + 1] ?? ''); i++; continue; } if (c === quote) quote = ''; out += c; }
    else if (c === "'" || c === '"') { quote = c; out += c; }
    else if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end === -1 ? css.length : end + 1; out += ' '; }
    else { const end = scanUnquotedUrl(css, i); if (end === -1) out += c; else { out += css.slice(i, end); i = end - 1; } }
  }
  return out;
}
function importantify(css) {
  css = stripComments(css);
  const decls = []; let start = 0, depth = 0, quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) { decls.push(css.slice(start, i)); start = i + 1; }
    else { const end = scanUnquotedUrl(css, i); if (end !== -1) i = end - 1; }
  }
  decls.push(css.slice(start));
  return decls.map(d => d.trim()).filter(Boolean).map(d => (/!\s*important$/i.test(d) ? d : d + ' !important')).join(';');
}

/* ---------- {{ uttrykk }} → JS (samme grammatikk som resolve() i runtimen) ---------- */
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/;
function parensWrapWhole(e) { let d = 0; for (let i = 0; i < e.length - 1; i++) { if (e[i] === '(') d++; else if (e[i] === ')') { d--; if (d === 0) return false; } } return true; }
function findTopLevelEquality(e) {
  let d = 0;
  for (let i = 0; i < e.length; i++) {
    const c = e[i];
    if (c === '[' || c === '(') d++;
    else if (c === ']' || c === ')') d--;
    else if (d === 0 && (c === '=' || c === '!') && e[i + 1] === '=') {
      if (i > 0 && (e[i - 1] === '=' || e[i - 1] === '!')) continue;
      if (!e.slice(0, i).trim()) continue;
      return { index: i, op: e[i + 2] === '=' ? c + '==' : c + '=' };
    }
  }
  return null;
}
function ex(src, V) {
  const e = String(src).trim();
  if (!e) return 'undefined';
  if (e[0] === '(' && e[e.length - 1] === ')' && parensWrapWhole(e)) return ex(e.slice(1, -1), V);
  const eq = findTopLevelEquality(e);
  if (eq) return '(' + ex(e.slice(0, eq.index), V) + ' ' + eq.op + ' ' + ex(e.slice(eq.index + eq.op.length), V) + ')';
  if (e[0] === '!') return '!' + wrap(ex(e.slice(1), V));
  if (e === 'true' || e === 'false' || e === 'null' || e === 'undefined') return e;
  if (/^-?\d+(\.\d+)?$/.test(e)) return String(Number(e));
  if (e.length >= 2 && (e[0] === '"' || e[0] === "'") && e[e.length - 1] === e[0]) return JSON.stringify(e.slice(1, -1));
  const head = e.match(IDENT_RE); if (!head) return 'undefined';
  let out = V + (/^[A-Za-z_$][\w$]*$/.test(head[0]) ? '.' + head[0] : '[' + JSON.stringify(head[0]) + ']'), i = head[0].length;
  while (i < e.length) {
    if (e[i] === '.') {
      const m = e.slice(i + 1).match(IDENT_RE) || e.slice(i + 1).match(/^\d+/); if (!m) return 'undefined';
      out += /^\d/.test(m[0]) ? '?.[' + m[0] + ']' : '?.' + m[0]; i += 1 + m[0].length;
    } else if (e[i] === '[') {
      let d = 1, j = i + 1;
      while (j < e.length && d > 0) { if (e[j] === '[') d++; else if (e[j] === ']') { d--; if (d === 0) break; } j++; }
      if (d !== 0) return 'undefined';
      out += '?.[' + ex(e.slice(i + 1, j), V) + ']'; i = j + 1;
    } else return 'undefined';
  }
  return out;
}
const wrap = s => (/^[\w$.?[\]"]+$/.test(s) && !/^\d/.test(s) ? s : '(' + s + ')');
const WHOLE = /^\s*\{\{([\s\S]+?)\}\}\s*$/;
/* attributtverdi → { code, dyn } */
function attrValue(raw, V) {
  const w = raw.match(WHOLE);
  if (w) return { code: ex(w[1], V), dyn: true, whole: true };
  if (raw.includes('{{')) {
    const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
    return { code: '`' + parts.map((s, i) => (i & 1 ? '${' + ex(s, V) + ' ?? ""}' : s.replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${'))).join('') + '`', dyn: true };
  }
  return { code: JSON.stringify(raw), dyn: false, str: raw };
}

/* ---------- mal → JSX ---------- */
function convertTemplate(html) {
  const frag = parseFragment(encodeCase(html));
  const pseudo = []; const pseudoMap = new Map(); const helmet = [];
  const used = new Set();
  const pc = (kind, value) => { const k = kind + '|' + value; if (!pseudoMap.has(k)) { const cls = 'scp' + pseudoMap.size.toString(36); pseudoMap.set(k, cls); const pe = kind === 'before' || kind === 'after'; pseudo.push('.' + cls + (pe ? '::' : ':') + kind + '{' + (pe ? value : importantify(value)) + '}'); } return pseudoMap.get(k); };
  let depth = 0;
  const pad = n => '  '.repeat(n);

  function text(node, V, ind) {
    const t = node.value;
    if (!t.includes('{{')) {
      if (!t.trim() && !t.includes(' ')) return null;
      return pad(ind) + textLit(t);
    }
    const parts = t.split(/\{\{([\s\S]+?)\}\}/g);
    const out = parts.map((p, i) => (i & 1 ? '{I(' + ex(p, V) + ')}' : p ? textLit(p) : '')).filter(Boolean);
    used.add('I');
    return pad(ind) + out.join('');
  }
  const textLit = t => (/^[^{}<>&\n\r\t"'`\\]+$/.test(t) && t.trim() === t && !/ {2}/.test(t) ? t : '{' + JSON.stringify(t) + '}');

  function kids(node, V, ind) { return node.childNodes.map(c => walk(c, V, ind)).filter(s => s != null); }
  function block(lines, ind) { return lines.length ? '\n' + lines.join('\n') + '\n' + pad(ind) : ''; }

  function walk(node, V, ind) {
    if (node.nodeName === '#text') return text(node, V, ind);
    if (!node.tagName) return null;
    const tag = node.tagName;
    const get = n => { const a = node.attrs.find(x => x.name === n); return a ? a.value : null; };
    if (tag === 'sc-helmet') { helmet.push(...node.childNodes.filter(c => c.tagName)); return null; }
    if (tag === 'sc-if') {
      const c = attrValue(get('value') || '', V);
      return pad(ind) + '{' + wrap(c.code) + ' ? <>' + block(kids(node, V, ind + 1), ind) + '</> : null}';
    }
    if (tag === 'sc-for') {
      used.add('list');
      const c = attrValue(get('list') || '', V), as = get('as') || 'item';
      depth++; const V2 = 'v' + depth, it = '$it' + depth, ix = '$i' + depth;
      const body = kids(node, V2, ind + 2);
      depth--;
      return pad(ind) + '{list(' + c.code + ').map((' + it + ', ' + ix + ') => {\n' +
        pad(ind + 1) + 'const ' + V2 + ' = { ...' + V + ', ' + JSON.stringify(as) + ': ' + it + ', $index: ' + ix + ' };\n' +
        pad(ind + 1) + 'return <React.Fragment key={' + ix + '}>' + block(body, ind + 1) + '</React.Fragment>;\n' + pad(ind) + '})}';
    }
    if (tag === 'x-import' || tag === 'dc-import') throw new Error('x-import/dc-import støttes ikke ennå');
    const real = RAW_UNWRAP[tag] || tag;
    const props = []; const pcs = []; let cls = null;
    for (const { name, value } of node.attrs) {
      if (name === 'sc-name' || name === 'data-dc-tpl') continue;
      let key = name.startsWith(CAMEL_ATTR) ? kebabToCamel(name.slice(CAMEL_ATTR.length)) : name;
      if (key === 'hint-size') continue;
      if (key.startsWith('style-')) { pcs.push(pc(key.slice(6), value)); continue; }
      if (key === 'class') key = 'className'; else if (key === 'for') key = 'htmlFor';
      else if (key.startsWith('on')) key = EVENT_MAP[key] || 'on' + key[2].toUpperCase() + key.slice(3);
      const a = attrValue(value, V);
      let code;
      if (key === 'style') {
        if (!a.dyn) code = JSON.stringify(cssToObj(a.str));
        else if (a.whole) { used.add('sty'); code = 'sty(' + a.code + ')'; }
        else { used.add('css'); code = 'css(' + a.code + ')'; }
      } else if ((key === 'value' || key === 'checked') && a.dyn) { const f = key === 'value' ? 'val' : 'chk'; used.add(f); code = f + '(' + a.code + ')'; }
      else code = a.code;
      if (key === 'className') { cls = { code, dyn: a.dyn }; continue; }
      props.push([key, code, !a.dyn && key !== 'style' ? a.str : null]);
    }
    if (cls || pcs.length) {
      if (!pcs.length) props.push(['className', cls.code, cls.dyn ? null : JSON.parse(cls.code)]);
      else if (!cls || !cls.dyn) { const s = [cls && JSON.parse(cls.code), ...pcs].filter(Boolean).join(' '); props.push(['className', JSON.stringify(s), s]); }
      else { used.add('cx'); props.push(['className', 'cx(' + cls.code + ', ' + JSON.stringify(pcs.join(' ')) + ')', null]); }
    }
    const attrs = props.map(([k, code, str]) => {
      const name = /^[A-Za-z_$][\w$-]*$/.test(k) ? k : null;
      if (!name) return '{...{' + JSON.stringify(k) + ': ' + code + '}}';
      if (str != null && /^[^"&{}<>\\\n]*$/.test(str)) return name + '="' + str + '"';
      return name + '={' + code + '}';
    });
    const open = '<' + real + (attrs.length ? ' ' + attrs.join(' ') : '');
    const ch = kids(node, V, ind + 1);
    if (!ch.length) return pad(ind) + open + ' />';
    return pad(ind) + open + '>' + block(ch, ind) + '</' + real + '>';
  }

  const body = kids(frag, 'v', 2);
  return { body, pseudo, helmet, used };
}

/* ---------- side ---------- */
function convertPage(id) {
  const cfg = PAGES[id]; if (!cfg) throw new Error('Ukjent side: ' + id);
  const src = fs.readFileSync(path.join(ML, cfg.src), 'utf8');
  const open = /<x-dc(?:\s[^>]*)?>/.exec(src), close = src.lastIndexOf('</x-dc>');
  const template = src.slice(open.index + open[0].length, close);
  const script = /<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/.exec(src)[1];
  const head = /<head>([\s\S]*?)<\/head>/.exec(src)[1];
  /* innhold i <body> foran <x-dc> (f.eks. #boot-splash) beholdes foran #dc-root, som i originalen */
  const bodyPre = src.slice(src.indexOf('<body>') + 6, open.index).trim();

  const { body, pseudo, helmet, used } = convertTemplate(template);
  const out = path.join(ROOT, 'src/pages', id); fs.mkdirSync(out, { recursive: true });
  const GEN = '/* GENERERT av scripts/dc2jsx.mjs fra media-lab/' + cfg.src + ' – ikke rediger for hånd før siden er ferdig sammenlignet. */\n';

  const helpers = ['I', 'css', 'sty', 'val', 'chk', 'list', 'cx'].filter(h => used.has(h));
  fs.writeFileSync(path.join(out, 'template.jsx'), GEN +
    "import React from 'react';\n" + (helpers.length ? 'import { ' + helpers.join(', ') + " } from '../../shared/dc.jsx';\n" : '') +
    '\nexport default function template(v) {\n  return (\n    <>\n' + body.join('\n') + '\n    </>\n  );\n}\n');

  fs.writeFileSync(path.join(out, 'logic.js'), GEN +
    "import React from 'react';\nimport { DCLogic } from '../../shared/dc.jsx';\n" + script.replace(/^\n/, '') + '\nexport default Component;\n');

  fs.writeFileSync(path.join(out, 'pseudo.css'), GEN + pseudo.join('\n') + '\n');

  /* legacy-skript i <head> blir import i main.jsx (samme rekkefølge); support.js faller bort */
  const imports = [];
  let headOut = head.replace(/[ \t]*<script\b([^>]*)><\/script>\s*/g, (m, attrs) => {
    const s = /src="([^"]+)"/.exec(attrs); if (!s) return m;
    const file = s[1].replace(/^\.?\//, '').replace(/\?.*$/, '');
    if (/^https?:/.test(s[1])) return m;
    if (file !== 'support.js') imports.push(file);
    return '';
  });
  headOut = headOut.replace(/\n\s*\n/g, '\n');
  /* skript i <helmet> med lokal src blir også import (etter head-skriptene); eksterne beholdes */
  const helmetKeep = helmet.filter(n => {
    if (n.tagName !== 'script') return true;
    const src = (n.attrs.find(a => a.name === 'src') || {}).value || '';
    if (!src || /^https?:/.test(src)) return true;
    const file = src.replace(/^\.?\//, '').replace(/\?.*$/, '');
    if (!imports.includes(file)) imports.push(file);
    return false;
  });
  const helmetHtml = helmetKeep.map(n => '  ' + serializeOuter(n)).join('\n');
  fs.writeFileSync(path.join(ROOT, cfg.src), '<!DOCTYPE html>\n<!-- GENERERT av scripts/dc2jsx.mjs fra media-lab/' + cfg.src + ' -->\n<html>\n<head>' + headOut.trimEnd() + '\n' + helmetHtml + '\n</head>\n<body>\n' + (bodyPre ? bodyPre + '\n' : '') + '<div id="dc-root"></div>\n<script type="module" src="/src/pages/' + id + '/main.jsx"></script>\n</body>\n</html>\n');

  const name = cfg.src.replace(/\.dc\.html$/, '');
  fs.writeFileSync(path.join(out, 'main.jsx'), GEN +
    imports.map(f => "import '@ml/" + f + "';\n").join('') +
    "import { mountPage } from '../../shared/dc.jsx';\nimport Logic from './logic.js';\nimport template from './template.jsx';\nimport './pseudo.css';\n\nmountPage(" + JSON.stringify(name) + ', Logic, template);\n');
  console.log(id + ': ' + body.length + ' toppnoder, ' + pseudo.length + ' pseudo-regler, ' + helmet.length + ' helmet-elementer, legacy: ' + imports.join(', '));
}

const ids = process.argv.slice(2);
(ids.length ? ids : Object.keys(PAGES)).forEach(convertPage);
