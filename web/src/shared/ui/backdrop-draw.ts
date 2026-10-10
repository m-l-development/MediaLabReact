/**
 * Tegning av Media Labs bakgrunner. Gjenskaper uttrykket i dagens app (forsidens 3D-gitter i
 * media-lab/src/pages/media-lab/logic.js og linjefeltet i src/legacy/ml-bg.js) som rene funksjoner.
 */

export type Ink = { rgb: string; alpha: number }

export const inkFor = (light: boolean, lightAlpha: number): Ink =>
  light ? { rgb: '60,54,44', alpha: lightAlpha } : { rgb: '255,255,255', alpha: 1 }

function prepare(canvas: HTMLCanvasElement, maxDpr: number): { g: CanvasRenderingContext2D; W: number; H: number } | null {
  const d = Math.min(maxDpr, window.devicePixelRatio || 1)
  const W = canvas.clientWidth
  const H = canvas.clientHeight
  if (!W || !H) return null
  const w = Math.round(W * d)
  const h = Math.round(H * d)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const g = canvas.getContext('2d')
  if (!g) return null
  g.setTransform(d, 0, 0, d, 0, 0)
  g.clearRect(0, 0, W, H)
  g.lineWidth = 1
  return { g, W, H }
}

/** Toner ut toppen av lerretet, så linjene går over i bakgrunnen. */
function fadeTop(g: CanvasRenderingContext2D, W: number, H: number, share: number) {
  const fade = g.createLinearGradient(0, 0, 0, H * share)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = fade
  g.fillRect(0, 0, W, H * share)
  g.globalCompositeOperation = 'source-over'
}

/** Høyden i gitteret i punkt (x, z) ved tid t. */
export function meshHeight(x: number, z: number, t: number): number {
  return 0.34 * Math.sin(x * 1.3 + t * 0.35) * Math.cos(z * 0.9 - t * 0.22) + 0.2 * Math.sin((x - z) * 1.7 + t * 0.28)
}

/** Forsiden: bølgende 3D-gitter i perspektiv. */
export function drawMesh(canvas: HTMLCanvasElement, t: number, light: boolean, maxDpr: number): void {
  const p = prepare(canvas, maxDpr)
  if (!p) return
  const { g, W, H } = p
  const NX = 44
  const NZ = 30
  const pts: [number, number][][] = []
  for (let j = 0; j < NZ; j++) {
    const z = 1 + j * 0.2
    const row: [number, number][] = []
    for (let i = 0; i < NX; i++) {
      const x = -3.2 + i * (6.4 / (NX - 1))
      const y = meshHeight(x, z, t)
      row.push([W / 2 + (x / z) * W * 0.42, H * 0.12 + ((1.1 - y) / z) * H * 0.78])
    }
    pts.push(row)
  }
  const ink = inkFor(light, 0.8)
  for (let j = 0; j < NZ; j++) {
    g.strokeStyle = `rgba(${ink.rgb},${((0.05 + 0.2 * (1 - j / NZ)) * ink.alpha).toFixed(3)})`
    g.beginPath()
    pts[j]?.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)))
    g.stroke()
  }
  const gr = g.createLinearGradient(0, H, 0, 0)
  gr.addColorStop(0, `rgba(${ink.rgb},${(0.22 * ink.alpha).toFixed(3)})`)
  gr.addColorStop(1, `rgba(${ink.rgb},0.03)`)
  g.strokeStyle = gr
  for (let i = 0; i < NX; i++) {
    g.beginPath()
    for (let j = 0; j < NZ; j++) {
      const pt = pts[j]?.[i]
      if (!pt) continue
      if (j) g.lineTo(pt[0], pt[1])
      else g.moveTo(pt[0], pt[1])
    }
    g.stroke()
  }
  fadeTop(g, W, H, 0.45)
}

/** Verktøysidene (menyer og startskjermer): rolig, bølgende linjefelt. */
export function drawLines(canvas: HTMLCanvasElement, t: number, light: boolean, maxDpr: number): void {
  const p = prepare(canvas, maxDpr)
  if (!p) return
  const { g, W, H } = p
  const ink = inkFor(light, 0.75)
  const N = 22
  const step = Math.max(6, W / 160)
  for (let j = 0; j < N; j++) {
    const f = j / (N - 1)
    const base = H * (0.18 + 0.8 * Math.pow(f, 1.25))
    const amp = H * (0.03 + 0.07 * f)
    const ph = j * 0.42
    g.strokeStyle = `rgba(${ink.rgb},${((0.03 + 0.13 * f) * ink.alpha).toFixed(3)})`
    g.beginPath()
    for (let x = -step; x <= W + step; x += step) {
      const u = x / W
      const y = base + amp * (Math.sin(u * 5.2 + ph + t * 0.16) * 0.65 + Math.sin(u * 11.3 - ph * 0.7 - t * 0.11) * 0.35)
      if (x < 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  fadeTop(g, W, H, 0.5)
}

/** Svake enheter (få kjerner, lite minne eller «spar data»): færre bilder i sekundet og lavere oppløsning. */
export function isLowPowerDevice(nav: Navigator = navigator): boolean {
  const n = nav as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4 || !!n.connection?.saveData
}
