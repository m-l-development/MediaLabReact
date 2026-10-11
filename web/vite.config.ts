/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite'
// Backend og byggesperrer gjenbrukes fra den eksisterende appen (ikke kopiert), se docs/architecture.md §7.
import * as envGuard from '../media-lab/build/env-guard.js'

// Typede innganger til de gjenbrukte JS-modulene.
const resolveSupabaseEnv = envGuard.resolveSupabaseEnv as (env: Record<string, string | undefined>) => {
  target: string
  public: { url: string; key: string; ref: string; target: string } | null
  warnings: string[]
}
const scanText = envGuard.scanText as (text: string, opts: { target: string; secrets?: [string, string | undefined][] }) => string[]
const { SCAN_EXT, REFS, DEV_SITE } = envGuard

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const LEGACY = path.resolve(ROOT, '../media-lab')

/** Bare URL og publiseringsnøkkel bakes inn (__CH_BACKEND__). Samme regler og samme .env.local som media-lab. */
export function connecthubEnv(): Plugin {
  let target = 'local'
  let outDir = 'dist'
  let building = false
  return {
    name: 'media-lab-web:connecthub-env',
    config(_, { mode, command }) {
      building = command === 'build'
      const env = { ...loadEnv(mode, LEGACY, ''), ...loadEnv(mode, ROOT, ''), ...process.env }
      const r = resolveSupabaseEnv(env)
      target = r.target
      r.warnings.forEach((w: string) => console.warn(`\x1b[33m${w}\x1b[0m`))
      return {
        envPrefix: 'CONNECTHUB_NEVER_EXPOSED_',
        define: {
          __CH_BACKEND__: JSON.stringify(r.public),
          __CH_DEV_REF__: JSON.stringify(r.target === 'production' ? null : REFS.preview),
          __CH_DEV_SITE__: JSON.stringify(DEV_SITE),
        },
      }
    },
    configResolved(c) {
      outDir = c.build.outDir
    },
    closeBundle() {
      const dir = path.resolve(ROOT, outDir)
      if (!building || !fs.existsSync(dir)) return
      const hits: string[] = []
      const walk = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) walk(p)
          else if (SCAN_EXT.test(e.name)) {
            // som dagens bygg: også den kjente hemmelige verdien fra byggemiljøet (SMTP-passordet), oppgitt ved navn
            for (const f of scanText(fs.readFileSync(p, 'utf8'), { target, secrets: [['CONNECTHUB_SMTP_PASSWORD', process.env.CONNECTHUB_SMTP_PASSWORD]] })) hits.push(`${path.relative(dir, p)}: ${f}`)
          }
        }
      }
      walk(dir)
      if (hits.length) throw new Error(`Mulige hemmeligheter i bygget – bygget stoppes:\n${hits.join('\n')}`)
    },
  }
}

type Middleware = (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void
const withMiddleware = (fn: Middleware) => ({
  configureServer: (s: ViteDevServer) => void s.middlewares.use(fn),
  configurePreviewServer: (s: PreviewServer) => void s.middlewares.use(fn),
})

/** ConnectHub-API-et lokalt med samme handler som på Vercel (media-lab/server/handlers/ch.js). */
function connecthubApiLocal(): Plugin {
  return {
    name: 'media-lab-web:api-local',
    ...withMiddleware(async (req, res, next) => {
      if (!req.url?.startsWith('/api/ch')) return next()
      try {
        const { handle } = await import('../media-lab/server/handlers/ch.js')
        const fileEnv = loadEnv('development', LEGACY, 'CONNECTHUB_')
        delete fileEnv.CONNECTHUB_SUPABASE_SECRET_KEY // hemmelig nøkkel bare fra skallets miljø
        const env: Record<string, string | undefined> = { ...fileEnv, ...process.env }
        delete env.VERCEL_ENV
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method ?? 'GET',
          headers: req.headers as Record<string, string>,
          ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
        })
        const r: Response = await handle(request, env, {})
        res.statusCode = r.status
        r.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await r.arrayBuffer()))
      } catch {
        res.statusCode = 500
        res.end('{"ok":false,"error":"local_api"}')
      }
    }),
  }
}

/**
 * Versjonsnummer per bygg (som buildVersion i media-lab/vite.config.js): bakes inn som __ML_BUILD__ og skrives til
 * dist/version.json, som oppdateringsvarselet (PLT-04) sammenligner med. Commit og gren tas med i tilbakemeldinger.
 */
function buildVersion(): Plugin {
  let id = 'dev'
  return {
    name: 'media-lab-web:version',
    config(_, { command }) {
      if (command === 'build') id = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 10) + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const git = (a: string) => {
        try {
          return execSync('git ' + a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
        } catch {
          return ''
        }
      }
      const commit = (process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse HEAD')).slice(0, 12) || null
      const branch = process.env.VERCEL_GIT_COMMIT_REF || git('rev-parse --abbrev-ref HEAD') || null
      return { define: { __ML_BUILD__: JSON.stringify(id), __ML_COMMIT__: JSON.stringify(commit), __ML_BRANCH__: JSON.stringify(branch) } }
    },
    generateBundle() {
      if (id !== 'dev') this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: id }) + '\n' })
    },
  }
}

/**
 * Selvreparasjon (PLT-05): nøyaktig samme innebygde skript som dagens app (HEAL i media-lab/vite.config.js), så hashen
 * allerede står i CSP-en i media-lab/vercel.json og ingen CSP- eller Vercel-endring trengs. Bygget stopper hvis
 * skriptet er endret og hashen mangler i en av CSP-reglene.
 */
export function legacyHealScript(): string {
  const src = fs.readFileSync(path.join(LEGACY, 'vite.config.js'), 'utf8')
  const m = /const HEAL = `([\s\S]*?)`;/.exec(src)
  if (!m?.[1]) throw new Error('Fant ikke HEAL i media-lab/vite.config.js')
  return new Function('return `' + m[1] + '`')() as string
}
function selfHeal(): Plugin {
  return {
    name: 'media-lab-web:self-heal',
    apply: 'build',
    transformIndexHtml() {
      const heal = legacyHealScript()
      const hash = `'sha256-${createHash('sha256').update(heal).digest('base64')}'`
      const vercel = fs.readFileSync(path.join(LEGACY, 'vercel.json'), 'utf8')
      const csps = [...vercel.matchAll(/"value": "(default-src [^"]*)"/g)].map((x) => x[1] ?? '')
      if (!csps.length || !csps.every((c) => c.includes(hash))) throw new Error(`Selvreparasjonsskriptet (${hash}) står ikke i alle CSP-reglene i media-lab/vercel.json`)
      return [{ tag: 'script', children: heal, injectTo: 'head-prepend' }]
    },
  }
}

/** Felles statiske filer fra media-lab/public (bilder, mockups) og tredjepartsfiler/fonter (build/vendor.js). */
function sharedAssets(): Plugin {
  const publicDir = path.join(LEGACY, 'public')
  let vendorFiles: Record<string, Buffer> | null = null
  const TYPES: Record<string, string> = {
    js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', css: 'text/css', woff2: 'font/woff2',
    gz: 'application/gzip', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain',
  }
  return {
    name: 'media-lab-web:shared-assets',
    ...withMiddleware(async (req, res, next) => {
      const url = decodeURIComponent((req.url ?? '').split(/[?#]/)[0] ?? '')
      const type = TYPES[url.split('.').pop() ?? ''] ?? 'application/octet-stream'
      if (/^\/(?:vendor|fonts)\//.test(url)) {
        try {
          if (!vendorFiles) {
            const V = await import('../media-lab/build/vendor.js')
            vendorFiles = V.build(path.join(LEGACY, 'node_modules', '.ch-vendor')) as unknown as Record<string, Buffer>
          }
          const f = vendorFiles[url.slice(1)]
          if (!f) return next()
          res.setHeader('content-type', type)
          return res.end(f)
        } catch (e) {
          return next(e)
        }
      }
      if (/^\/(?:images|mockups)\//.test(url)) {
        const file = path.join(publicDir, url)
        if (file.startsWith(publicDir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          res.setHeader('content-type', type)
          return fs.createReadStream(file).pipe(res)
        }
      }
      next()
    }),
  }
}

export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    // De genererte visningene i Loop Studio ('use no memo', over 5000 linjer) og den uendrede motoren tas ikke gjennom
    // React Compiler: de ville uansett ikke blitt endret, og analysen tok over 10 sekunder.
    babel({ presets: [reactCompilerPreset()], exclude: [/[/\\]node_modules[/\\]/, /features[/\\]loop-studio[/\\](EditorView|HomeView)\.tsx$/, /features[/\\]loop-studio[/\\]engine[/\\][a-z]+\.js$/, /\.d\.ts$/] }),
    connecthubEnv(),
    connecthubApiLocal(),
    sharedAssets(),
    buildVersion(),
    selfHeal(),
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
  // Ingen kildekart i produksjon (som dagens app): de ville tatt med kildetekst fra avhengigheter i dist/.
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}', 'build/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
  },
})
