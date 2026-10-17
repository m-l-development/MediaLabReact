/** Merkede ID-typer, så en AssetId ikke kan brukes der en ProjectId forventes. */
declare const brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [brand]: B }

export type AssetId = Brand<string, 'AssetId'>
export type ProjectId = Brand<string, 'ProjectId'>
export type ElementId = Brand<string, 'ElementId'>
export type UserId = Brand<string, 'UserId'>
export type ChurchId = Brand<string, 'ChurchId'>
/** SHA-256 av innholdet, 64 heksadesimale tegn. */
export type ContentHash = Brand<string, 'ContentHash'>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
export const isContentHash = (value: unknown): value is ContentHash => typeof value === 'string' && SHA256.test(value)

/** Ny, tilfeldig UUID v4. Krever sikker kontekst (https eller localhost), som appen alltid har. */
export function newId<T extends AssetId | ProjectId | ElementId>(): T {
  return crypto.randomUUID() as T
}
