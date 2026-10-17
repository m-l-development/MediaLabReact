import type { DataAdapter } from './auth/types'

export interface CollabGroup {
  id: string
  name: string
  status: string
  my_church: boolean
}

/** Samarbeidsgrupper brukeren ser (databasen gir bare egne grupper; `public.my_groups()`). */
export function createCommunityService(data: DataAdapter | null) {
  return {
    async myGroups(): Promise<CollabGroup[]> {
      if (!data) return []
      const rows = await data.rpc<unknown>('my_groups')
      return Array.isArray(rows) ? (rows as CollabGroup[]) : []
    },
    /** HUB-02: Samarbeidsmappen vises bare når en av brukerens menigheter er aktivt medlem av en aktiv gruppe. */
    async hasActiveCollab(): Promise<boolean> {
      const groups = await this.myGroups()
      return groups.some((g) => g.status === 'active' && g.my_church)
    },
  }
}

export type CommunityService = ReturnType<typeof createCommunityService>
