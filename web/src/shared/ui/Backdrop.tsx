import { useEffect, useRef } from 'react'
import { useTheme } from '../theme/theme'
import { drawLines, drawMesh, isLowPowerDevice } from './backdrop-draw'
import styles from './Backdrop.module.css'

/** 'mesh' = forsiden, 'lines' = verktøyenes menyer/startskjermer, 'static' = arbeidsflater (fast, jevn, mørk tone). */
export type BackdropVariant = 'mesh' | 'lines' | 'static'

const STARS = [
  { left: '18%', top: '22%', size: 3, blur: 10, spread: 3, alpha: 0.55 },
  { left: '74%', top: '16%', size: 4, blur: 14, spread: 4, alpha: 0.5 },
  { left: '60%', top: '44%', size: 2, blur: 8, spread: 2, alpha: 0.5 },
  { left: '9%', top: '58%', size: 2, blur: 8, spread: 2, alpha: 0.45 },
  { left: '88%', top: '66%', size: 3, blur: 10, spread: 3, alpha: 0.5 },
] as const

/**
 * Felles bakgrunn (PLT-10). Animasjonen stopper når fanen er skjult eller lerretet ikke synes, respekterer
 * «redusert bevegelse» og går saktere på svake enheter – som i dagens app.
 */
export function Backdrop({ variant }: { variant: BackdropVariant }) {
  const theme = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  const light = theme === 'light'

  useEffect(() => {
    const c = canvas.current
    if (!c || variant === 'static') return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const low = isLowPowerDevice()
    const maxDpr = low ? 1.5 : 2
    const step = variant === 'mesh' ? (low ? 50 : 32) : (low ? 80 : 50)
    const draw = variant === 'mesh' ? drawMesh : drawLines
    const t0 = performance.now()
    let raf = 0
    let last = -1
    let seen = true

    const tick = (now: number) => {
      raf = 0
      if (still || !seen || document.hidden) return
      raf = requestAnimationFrame(tick)
      if (now - last < step) return
      last = now
      draw(c, (now - t0) / 1000, light, maxDpr)
    }
    const start = () => {
      if (!raf && !still && seen && !document.hidden) raf = requestAnimationFrame(tick)
    }
    const redraw = () => draw(c, (performance.now() - t0) / 1000, light, maxDpr)

    redraw()
    start()
    document.addEventListener('visibilitychange', start)
    window.addEventListener('resize', redraw)
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
        seen = entries.some((e) => e.isIntersecting)
        start()
      })
      : null
    io?.observe(c)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', start)
      window.removeEventListener('resize', redraw)
      io?.disconnect()
    }
  }, [variant, light])

  return (
    <div className={styles.root} data-variant={variant} aria-hidden="true">
      <div className={styles.anim}>
        <div className={variant === 'mesh' ? styles.glowCenter : styles.glowLeft} />
        <div className={variant === 'mesh' ? styles.glowCorner : styles.glowRight} />
        {variant !== 'static' && <canvas ref={canvas} className={variant === 'mesh' ? styles.meshCanvas : styles.linesCanvas} />}
        {STARS.map((s) => (
          <span
            key={s.left}
            className={styles.star}
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, boxShadow: `0 0 ${s.blur}px ${s.spread}px rgba(255,255,255,${s.alpha})` }}
          />
        ))}
      </div>
      <div className={styles.flat} />
    </div>
  )
}
