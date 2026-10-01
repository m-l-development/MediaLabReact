/* Innholdskontroll for opplastede filer: typen bestemmes av de første bytene (magiske bytes), aldri av filnavn eller
   oppgitt type. Bare PNG, JPEG, WebP og GIF godtas. Video gjenkjennes og avvises uansett navn – fast krav. */

const VIDEO_NAME = /\.(mp4|m4v|mov|qt|webm|mkv|avi|wmv|mpe?g|mts|m2ts|ts|3gp|3g2|flv|f4v|ogv|vob|mxf|hevc|h264|h265)$/i;
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

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
