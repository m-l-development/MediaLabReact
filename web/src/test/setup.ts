import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Byggeverdien finnes ikke i testene; da kjører appen som «uten backend».
;(globalThis as Record<string, unknown>).__CH_BACKEND__ = null

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
