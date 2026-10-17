// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { connecthubEnv } from '../vite.config.ts'

/** PLT-15: hemmelighetsvernet i den nye appens bygg (samme regler som dagens, media-lab/build/env-guard.js). */
const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true })
  delete process.env.CONNECTHUB_SMTP_PASSWORD
})

function built(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-guard-'))
  dirs.push(dir)
  for (const [n, t] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), t)
  type Hook = (...a: unknown[]) => unknown
  const p = connecthubEnv() as unknown as { config: Hook; configResolved: Hook; closeBundle: Hook }
  p.config({}, { mode: 'production', command: 'build' })
  p.configResolved({ build: { outDir: dir } })
  return () => p.closeBundle()
}

describe('bygget stoppes ved hemmeligheter (PLT-15)', () => {
  it('rent bygg går gjennom', () => {
    expect(built({ 'index.js': 'console.log("hei")', 'index.html': '<html></html>' })).not.toThrow()
  })
  it('sb_secret-nøkkel, databaseadresse med passord og hemmelige variabelnavn stopper bygget, uten å vise verdien', () => {
    for (const bad of ['const k="sb_secret_abcdefghijkl123"', 'postgres://u:hemmelig@db.example/x', 'SUPABASE_SERVICE_ROLE_KEY']) {
      const run = built({ 'a.js': bad })
      expect(run).toThrow(/Mulige hemmeligheter i bygget/)
      try { run() } catch (e) { expect(String(e)).not.toContain('hemmelig@') }
    }
  })
  it('SMTP-passordet fra byggemiljøet stopper bygget (oppgis ved navn)', () => {
    process.env.CONNECTHUB_SMTP_PASSWORD = 'smtp-passord-123'
    expect(built({ 'a.js': 'x="smtp-passord-123"' })).toThrow(/verdien av CONNECTHUB_SMTP_PASSWORD/)
  })
})

describe('testene når aldri en ekte backend', () => {
  type Cfg = { define: Record<string, string> }
  const define = (mode: string) => ((connecthubEnv() as unknown as { config: (c: unknown, e: unknown) => Cfg }).config({}, { mode, command: 'serve' })).define
  it('under Vitest og med ML_TEST_NO_BACKEND=1 bakes ingen backend inn i utvikling', () => {
    expect(define('development').__CH_BACKEND__).toBe('null')
    process.env.ML_TEST_NO_BACKEND = '1'
    const vitest = process.env.VITEST
    delete process.env.VITEST
    try {
      expect(define('development').__CH_BACKEND__).toBe('null')
    } finally {
      process.env.VITEST = vitest
      delete process.env.ML_TEST_NO_BACKEND
    }
  })
  it('bryteren gjelder aldri produksjonsbygg', () => {
    process.env.ML_TEST_NO_BACKEND = '1'
    process.env.CONNECTHUB_SUPABASE_URL = 'https://uatpdmhnwwjgzlxaucsx.supabase.co'
    process.env.CONNECTHUB_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_' + 'x'.repeat(20)
    try {
      expect(JSON.parse(define('production').__CH_BACKEND__ ?? 'null')).toMatchObject({ ref: 'uatpdmhnwwjgzlxaucsx' })
    } finally {
      delete process.env.ML_TEST_NO_BACKEND
      delete process.env.CONNECTHUB_SUPABASE_URL
      delete process.env.CONNECTHUB_SUPABASE_PUBLISHABLE_KEY
    }
  })
})
