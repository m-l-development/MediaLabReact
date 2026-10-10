/**
 * Verktøyene i Media Lab. SoMe er en mappe på dashboardet med Motion Design og Photo Design;
 * Tools er en mappe med Isolate Subject og Mockups (som i dagens app, HUB-01).
 */
export const TOOL_IDS = [
  'loop-studio',
  'thumbnail-studio',
  'motion-design',
  'photo-design',
  'isolate-subject',
  'mockups',
] as const

export type ToolId = (typeof TOOL_IDS)[number]

export const isToolId = (value: unknown): value is ToolId =>
  typeof value === 'string' && (TOOL_IDS as readonly string[]).includes(value)

export type ToolGroup = 'video' | 'image' | 'some' | 'tools'

export const TOOL_GROUP: Record<ToolId, ToolGroup> = {
  'loop-studio': 'video',
  'thumbnail-studio': 'image',
  'motion-design': 'some',
  'photo-design': 'some',
  'isolate-subject': 'tools',
  mockups: 'tools',
}

/** Kort adresse i dagens app (build/routes.js). Brukes for lenken «Åpne dagens versjon» til verktøyet er bygget på nytt. */
export const LEGACY_PATH: Record<ToolId, string> = {
  'loop-studio': '/loopstudio',
  'thumbnail-studio': '/thumbnailstudio',
  'motion-design': '/motiondesign',
  'photo-design': '/photodesign',
  'isolate-subject': '/isolate',
  mockups: '/mockup',
}
