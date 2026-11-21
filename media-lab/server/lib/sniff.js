/* Innholdskontroll for opplastede filer: typen bestemmes av de første bytene (magiske bytes), aldri av filnavn eller
   oppgitt type. Bare PNG, JPEG, WebP og GIF godtas. Video gjenkjennes og avvises uansett navn – fast krav. */

const VIDEO_NAME = /\.(mp4|m4v|mov|qt|webm|mkv|avi|wmv|mpe?g|mts|m2ts|ts|3gp|3g2|flv|f4v|ogv|vob|mxf|hevc|h264|h265)$/i;
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
/* Videonavn avvises allerede før en direkte opplasting starter (innholdet kontrolleres etterpå). */
export const isVideoName = name => VIDEO_NAME.test(String(name || ''));

/* Kjenner igjen vanlige videoformater (for tydelig avvisning og logging). */
export function looksLikeVideo(b) {
  if (b.length >= 12 && ascii(b, 4, 4) === 'ftyp') return true;                         // MP4, MOV, 3GP, M4V (ISO BMFF)
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true; // WebM/Matroska (EBML)
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'AVI ') return true;
  if (b.length >= 4 && b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && (b[3] === 0xba || b[3] === 0xb3)) return true; // MPEG-PS/ES
  if (b.length >= 4 && b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75) return true; // ASF/WMV
  if (b.length >= 3 && ascii(b, 0, 3) === 'FLV') return true;
  if (b.length >= 189 && b[0] === 0x47 && b[188] === 0x47) return true;                     // MPEG-TS
  if (b.length >= 4 && ascii(b, 0, 4) === 'OggS') return true;                              // Ogg (kan være video)
  return false;
}

/* Returnerer { mime, ext } for godkjente bilder, ellers null. */
export function sniffImage(b) {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: 'image/png', ext: 'png' };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return { mime: 'image/gif', ext: 'gif' };
  return null;
}

/* Full kontroll. Returnerer { ok: true, mime, ext } eller { ok: false, error }. */
export function checkUpload(bytes, name) {
  if (!bytes || !bytes.length) return { ok: false, error: 'empty' };
  if (VIDEO_NAME.test(String(name || '')) || looksLikeVideo(bytes)) return { ok: false, error: 'video_not_allowed' };
  const t = sniffImage(bytes);
  return t ? { ok: true, ...t } : { ok: false, error: 'type_not_allowed' };
}

/* Trygt visningsnavn med riktig filendelse. */
export function cleanName(name, ext) {
  const base = String(name || 'bilde').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\.[A-Za-z0-9]{1,5}$/, '').trim().slice(0, 150) || 'bilde';
  return base + '.' + ext;
}

/* Innboksen (Menighetsbruker): flere filtyper enn Fellesmappen – bilder, PDF, dokumenter, video, tekst og prosjekter.
   Typen bestemmes av innholdet der formatet har kjennetegn (magiske bytes); filendelsen avgjør bare innenfor samme familie
   (f.eks. DOCX/XLSX er begge ZIP). HTML, SVG, skript og programfiler godtas aldri. Video godtas bare her (eiers krav
   2026-11-21: felleskontoens innboks skal kunne motta video; Fellesmappen avviser fortsatt video). */
export const INBOX_TYPES = {
  png: ['image/png', 'image'], jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], webp: ['image/webp', 'image'], gif: ['image/gif', 'image'],
  pdf: ['application/pdf', 'document'],
  mp4: ['video/mp4', 'video'], m4v: ['video/mp4', 'video'], mov: ['video/quicktime', 'video'], webm: ['video/webm', 'video'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'document'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'document'],
  odt: ['application/vnd.oasis.opendocument.text', 'document'], ods: ['application/vnd.oasis.opendocument.spreadsheet', 'document'],
  odp: ['application/vnd.oasis.opendocument.presentation', 'document'],
  doc: ['application/msword', 'document'], xls: ['application/vnd.ms-excel', 'document'], ppt: ['application/vnd.ms-powerpoint', 'document'],
  txt: ['text/plain', 'document'], csv: ['text/csv', 'document'], json: ['application/json', 'project'],
  zip: ['application/zip', 'project'], motion: ['application/octet-stream', 'project'],
};
export const inboxExt = name => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };
/* Oppgitt navn → { mime, ext, kind } (før opplastingen), eller null. */
export function inboxTypeOf(name) {
  const ext = inboxExt(name), t = INBOX_TYPES[ext];
  return t ? { mime: t[0], ext, kind: t[1] } : null;
}
const isText = b => { if (b.includes(0)) return false; try { new TextDecoder('utf-8', { fatal: true }).decode(b); return true; } catch (e) { return false; } };
/* Full kontroll av innholdet. Returnerer { ok: true, mime, ext, kind } eller { ok: false, error }. */
export function checkInbox(bytes, name) {
  if (!bytes || !bytes.length) return { ok: false, error: 'empty' };
  const t = inboxTypeOf(name);
  if (!t) return { ok: false, error: 'type_not_allowed' };
  const b = bytes, fam = (...e) => e.includes(t.ext);
  const img = sniffImage(b);
  if (img) return fam('png', 'jpg', 'jpeg', 'webp', 'gif') ? { ok: true, mime: img.mime, ext: img.ext, kind: 'image' } : { ok: false, error: 'type_mismatch' };
  if (fam('png', 'jpg', 'jpeg', 'webp', 'gif')) return { ok: false, error: 'type_mismatch' };
  if (fam('pdf')) return b.length >= 5 && ascii(b, 0, 5) === '%PDF-' ? { ok: true, ...t } : { ok: false, error: 'type_mismatch' };
  if (fam('mp4', 'm4v', 'mov')) {
    if (!(b.length >= 12 && ascii(b, 4, 4) === 'ftyp')) return { ok: false, error: 'type_mismatch' };
    return ascii(b, 8, 4) === 'qt  ' ? { ok: true, mime: 'video/quicktime', ext: 'mov', kind: 'video' } : { ok: true, mime: 'video/mp4', ext: t.ext === 'mov' ? 'mp4' : t.ext, kind: 'video' };
  }
  if (fam('webm')) return b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 ? { ok: true, ...t } : { ok: false, error: 'type_mismatch' };
  if (fam('docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'zip')) return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 ? { ok: true, ...t } : { ok: false, error: 'type_mismatch' };
  if (fam('doc', 'xls', 'ppt')) return b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 ? { ok: true, ...t } : { ok: false, error: 'type_mismatch' };
  if (fam('txt', 'csv', 'json')) return isText(b) && !/^\s*<(?:!doctype|html|svg|script)/i.test(new TextDecoder().decode(b.subarray(0, 512))) ? { ok: true, ...t } : { ok: false, error: 'type_mismatch' };
  if (fam('motion')) return looksLikeVideo(b) || sniffImage(b) || (b.length >= 2 && b[0] === 0x4d && b[1] === 0x5a) ? { ok: false, error: 'type_mismatch' } : { ok: true, ...t };
  return { ok: false, error: 'type_not_allowed' };
}
