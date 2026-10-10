import type { ContentHash } from '../../domain/ids'

/** SHA-256 av innholdet (hex). Samme fil gir alltid samme hash, så innholdet lagres bare én gang. */
export async function sha256(blob: Blob): Promise<ContentHash> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') as ContentHash
}
