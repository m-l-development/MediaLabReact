import type { Slide } from './types'

export interface ProgramEvent { time: string; title: string; place: string }
export interface ProgramDay { key: string; base: string; name: string; date: string; extra?: boolean; events: ProgramEvent[] }
export interface Program { week: string | null; days: ProgramDay[] }

export interface BeatInfo {
  bpm: number
  first: number
  clarity: number
  kick: number
  rate: number
  dyn: number
  genre: string
  style: 'calm' | 'groove'
  env: number[]
  envRate: number
  guess?: boolean
}

export function parse(text: string): Program
export function serialize(daySlides: Pick<Slide, 'extra' | 'day' | 'date' | 'time' | 'title' | 'place'>[]): string
export function keyOf(name: string): string
export function toDataURL(blob: Blob): Promise<string>
export function detectBeat(buf: AudioBuffer): BeatInfo | null
export function embeddedFontCSS(url?: string): Promise<string>
export const SAMPLE: string
export const FONT_CSS: string
