/** Feil fra dynamisk import (ny versjon publisert, nettverksbrudd). */
export function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
    .test(error.message)
}
