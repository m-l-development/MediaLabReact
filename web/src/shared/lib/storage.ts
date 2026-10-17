/**
 * localStorage som aldri kaster (privat modus, blokkert lagring, kvote). Brukes bare til små innstillinger;
 * prosjekter og medier ligger i IndexedDB.
 */
export const localStore = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      return false
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // ingenting å gjøre
    }
  },
}

export const sessionStore = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      // ingenting å gjøre
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // ingenting å gjøre
    }
  },
}
