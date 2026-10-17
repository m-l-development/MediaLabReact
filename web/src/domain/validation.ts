/**
 * Små, avhengighetsfrie validatorer for data som kommer inn i appen (lagring, filer, API).
 * En validator returnerer enten verdien med riktig type, eller en liste med feil og stien til feilen.
 */

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] }

export type Validator<T> = (input: unknown, path?: string) => Validation<T>

const ok = <T>(value: T): Validation<T> => ({ ok: true, value })
const fail = (path: string, message: string): Validation<never> => ({ ok: false, errors: [`${path || 'verdi'}: ${message}`] })

export function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

export const string: Validator<string> = (input, path = '') =>
  typeof input === 'string' ? ok(input) : fail(path, 'forventet tekst')

export const number: Validator<number> = (input, path = '') =>
  typeof input === 'number' && Number.isFinite(input) ? ok(input) : fail(path, 'forventet tall')

export const boolean: Validator<boolean> = (input, path = '') =>
  typeof input === 'boolean' ? ok(input) : fail(path, 'forventet sann/usann')

export function literal<const T extends string | number>(...values: readonly T[]): Validator<T> {
  return (input, path = '') =>
    (values as readonly unknown[]).includes(input) ? ok(input as T) : fail(path, `forventet en av ${values.join(', ')}`)
}

export function array<T>(item: Validator<T>): Validator<T[]> {
  return (input, path = '') => {
    if (!Array.isArray(input)) return fail(path, 'forventet liste')
    const out: T[] = []
    const errors: string[] = []
    input.forEach((x, i) => {
      const r = item(x, `${path}[${i}]`)
      if (r.ok) out.push(r.value)
      else errors.push(...r.errors)
    })
    return errors.length ? { ok: false, errors } : ok(out)
  }
}

export function optional<T>(inner: Validator<T>): Validator<T | undefined> {
  return (input, path = '') => (input === undefined ? ok(undefined) : inner(input, path))
}

export function nullable<T>(inner: Validator<T>): Validator<T | null> {
  return (input, path = '') => (input === null ? ok(null) : inner(input, path))
}

type Shape = Record<string, Validator<unknown>>
type ShapeValue<S extends Shape> = { [K in keyof S]: S[K] extends Validator<infer V> ? V : never }

/** Objekt med kjente felt. Ukjente felt beholdes ikke (validert verdi inneholder bare feltene i formen). */
export function object<S extends Shape>(shape: S): Validator<ShapeValue<S>> {
  return (input, path = '') => {
    if (!isRecord(input)) return fail(path, 'forventet objekt')
    const out: Record<string, unknown> = {}
    const errors: string[] = []
    for (const [key, validate] of Object.entries(shape)) {
      const r = validate(input[key], path ? `${path}.${key}` : key)
      if (!r.ok) errors.push(...r.errors)
      else if (r.value !== undefined) out[key] = r.value
    }
    return errors.length ? { ok: false, errors } : ok(out as ShapeValue<S>)
  }
}

/** Kjører en ekstra regel etter at typen er godkjent. */
export function refine<T>(inner: Validator<T>, test: (value: T) => boolean, message: string): Validator<T> {
  return (input, path = '') => {
    const r = inner(input, path)
    if (!r.ok) return r
    return test(r.value) ? r : fail(path, message)
  }
}

/** Godtar hva som helst uten å endre det (for verktøyspesifikke data som valideres av verktøyet selv). */
export const unknownValue: Validator<unknown> = (input) => ok(input)
