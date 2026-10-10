import type { Asset } from '../../domain/asset'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function formatDuration(s: number): string {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export function describe(a: Asset): string {
  const parts: string[] = []
  if (a.meta.width && a.meta.height) parts.push(`${a.meta.width}×${a.meta.height}`)
  if (a.meta.duration) parts.push(formatDuration(a.meta.duration))
  parts.push(formatBytes(a.content.size))
  return parts.join(' · ')
}
