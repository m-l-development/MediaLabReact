import type { Loc, LoopData, LoopMedia, Slide } from './types'

export interface Renderer {
  drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, data: LoopData, media: LoopMedia, t: number): Loc | null
  locate(slides: Pick<Slide, 'dur'>[], t: number): Loc | null
  /** Kroken for overskrift/kicker med fontpopupens stil (engine/styled.ts). */
  setStyled(f: ((q: import('./styled').StyQ) => import('./styled').StyOut | null) | null): void
  styKey(q: unknown): string
}

export interface AudioSyncOpts { vol?: number; offset?: number; mode?: string; fadeIn?: number; fadeOut?: number }
export interface AudioCtl {
  setBuffer(b: AudioBuffer | null): void
  duration(): number
  lag(tt: number, off?: number): number | null
  stop(): void
  sync(live: boolean, tt: number, total: number, o?: AudioSyncOpts): void
}

export interface PlayerPayload {
  W: number
  H: number
  title?: string
  data: LoopData
  media: { images: Record<string, string>; video: string | null }
  audio: (AudioSyncOpts & { src: string }) | null
  /** Ferdige tekstbilder (overskrift/kicker med fontpopupens stil). */
  sty?: Record<string, unknown>
}

export function __ukeloopRendererFactory(): Renderer
export function __ukeloopAudioCtl(ctx: BaseAudioContext, out: AudioNode): AudioCtl
export function __ukeloopPlayerBoot(P: PlayerPayload, R: Renderer): void
