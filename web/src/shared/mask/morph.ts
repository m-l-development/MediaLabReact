/** Morfologi og myking for masker (én byte per piksel): separable filtre med glidende vindu, O(n) per linje. */
type Mask = Uint8ClampedArray

/** Separabelt minimumsfilter (krymper masken) – glidende vindu med deque, O(n). */
function minLine(inp: Mask, out: Mask, base: number, step: number, len: number, r: number, q: Int32Array) {
  let h = 0
  let t = 0
  for (let k = 0; k < len + r; k++) {
    if (k < len) {
      const v = inp[base + k * step] ?? 0
      while (t > h && (inp[base + (q[t - 1] ?? 0) * step] ?? 0) >= v) t--
      q[t++] = k
    }
    const c = k - r
    if (c >= 0) {
      while ((q[h] ?? 0) < c - r) h++
      out[base + c * step] = inp[base + (q[h] ?? 0) * step] ?? 0
    }
  }
}

/** Separabel boksuskarphet. */
function blurLine(inp: Mask, out: Mask, base: number, step: number, len: number, r: number) {
  let s = 0
  let n = 0
  for (let k = 0; k < Math.min(len, r + 1); k++) {
    s += inp[base + k * step] ?? 0
    n++
  }
  for (let c = 0; c < len; c++) {
    out[base + c * step] = s / n
    const a = c + r + 1
    if (a < len) {
      s += inp[base + a * step] ?? 0
      n++
    }
    const b = c - r
    if (b >= 0) {
      s -= inp[base + b * step] ?? 0
      n--
    }
  }
}

/** Separabelt maksimumsfilter (utvider masken): samme som minLine med motsatt sammenligning. */
function maxLine(inp: Mask, out: Mask, base: number, step: number, len: number, r: number, q: Int32Array) {
  let h = 0
  let t = 0
  for (let k = 0; k < len + r; k++) {
    if (k < len) {
      const v = inp[base + k * step] ?? 0
      while (t > h && (inp[base + (q[t - 1] ?? 0) * step] ?? 0) <= v) t--
      q[t++] = k
    }
    const c = k - r
    if (c >= 0) {
      while ((q[h] ?? 0) < c - r) h++
      out[base + c * step] = inp[base + (q[h] ?? 0) * step] ?? 0
    }
  }
}

export function separable(src: Mask, W: number, H: number, r: number, kind: 'min' | 'max' | 'blur'): Mask {
  const tmp = new Uint8ClampedArray(W * H)
  const out = new Uint8ClampedArray(W * H)
  const q = new Int32Array(Math.max(W, H))
  if (kind === 'min' || kind === 'max') {
    const line = kind === 'min' ? minLine : maxLine
    for (let y = 0; y < H; y++) line(src, tmp, y * W, 1, W, r, q)
    for (let x = 0; x < W; x++) line(tmp, out, x, W, H, r, q)
  } else {
    for (let y = 0; y < H; y++) blurLine(src, tmp, y * W, 1, W, r)
    for (let x = 0; x < W; x++) blurLine(tmp, out, x, W, H, r)
  }
  return out
}
