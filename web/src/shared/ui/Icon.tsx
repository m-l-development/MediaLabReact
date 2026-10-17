import type { ToolId } from '../../domain/tool'

export type IconName =
  | ToolId
  | 'hub' | 'folder' | 'back' | 'external' | 'sun' | 'moon' | 'globe' | 'shield' | 'logout' | 'menu' | 'close'
  | 'alert' | 'refresh' | 'collab' | 'check' | 'trash' | 'trashRead'

const PATHS: Record<IconName, string> = {
  'loop-studio': 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  'thumbnail-studio': 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M8.5 8.5h.01',
  'motion-design': 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  'photo-design': 'M4 4h16v16H4zM4 15l4-4 5 5M14 14l2-2 4 4M15.5 8.5h.01',
  'isolate-subject': 'M12 6a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM6 20a6 6 0 0 1 12 0M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4',
  mockups: 'M3 4h18v12H3zM8 20h8M12 16v4',
  hub: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  collab: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.7',
  back: 'M19 12H5M12 19l-7-7 7-7',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  globe: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5h.01',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  check: 'M4 12.5l5 5L20 6.5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  trashRead: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M9.5 13.5l2 2 3.5-4',
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
