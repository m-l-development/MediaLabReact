import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isPreview, isVercelLiveCsp, isVercelLiveRequest, PREVIEW_RE } from './preview-noise'

const PREVIEW = 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app'
const PROD = 'https://media-lab-react-vyef.vercel.app'
const KNOWN = `Loading the script 'https://vercel.live/_next-live/feedback/feedback.js' violates the following Content Security Policy directive: "script-src 'self' 'sha256-abc='". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked.`

describe('kjent støy i Vercel-forhåndsvisninger', () => {
  it('samme adressemønster som run-dev.mjs --remote', () => {
    const src = fs.readFileSync(path.join(import.meta.dirname, 'run-dev.mjs'), 'utf8')
    const m = src.match(/if \(REMOTE && !(\/\^https:.*?\$\/)\.test\(REMOTE\)\)/)
    expect(m?.[1]).toBe(String(PREVIEW_RE))
  })

  it('bare forhåndsvisninger – ikke produksjonen, localhost eller falske domener', () => {
    expect(isPreview(PREVIEW)).toBe(true)
    expect(isPreview(PREVIEW + '/')).toBe(true)
    expect(isPreview('https://media-lab-react-vyef-abc123def-media-lab3.vercel.app')).toBe(true)
    for (const u of [PROD, PROD + '/', 'http://localhost:5191', 'https://evil.vercel.app', 'https://media-lab-react-vyef-x-media-lab3.vercel.app.evil.com',
      'https://evil.com/?https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app', 'http://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app', '']) {
      expect(isPreview(u), u).toBe(false)
    }
  })

  it('ignorerer den kjente vercel.live-blokkeringen i en forhåndsvisning', () => {
    expect(isVercelLiveCsp(PREVIEW, KNOWN)).toBe(true)
    expect(isVercelLiveRequest(PREVIEW, 'https://vercel.live/_next-live/feedback/feedback.js')).toBe(true)
  })

  it('samme melding i produksjonen eller lokalt telles fortsatt', () => {
    expect(isVercelLiveCsp(PROD, KNOWN)).toBe(false)
    expect(isVercelLiveCsp('http://localhost:5191', KNOWN)).toBe(false)
    expect(isVercelLiveRequest(PROD, 'https://vercel.live/_next-live/feedback/feedback.js')).toBe(false)
  })

  it('andre CSP-brudd, konsollfeil og HTTP-feil telles fortsatt, også om de nevner vercel.live', () => {
    for (const t of [
      `Loading the script 'https://evil.example/x.js' violates the following Content Security Policy directive: "script-src 'self'"`,
      `Loading the script 'https://vercel.live.evil.com/x.js' violates the following Content Security Policy directive: "script-src 'self'"`,
      `Refused to connect to 'https://vercel.live/x' because it violates the following Content Security Policy directive: "connect-src 'self'"`,
      `Loading the stylesheet 'https://vercel.live/x.css' violates the following Content Security Policy directive: "style-src 'self'"`,
      'TypeError: Cannot read properties of undefined (reading \'src\') at vercel.live',
      'Failed to load resource: the server responded with a status of 500 ()',
      'Failed to load resource: the server responded with a status of 404 ()',
    ]) expect(isVercelLiveCsp(PREVIEW, t), t).toBe(false)
    for (const u of ['https://vercel.live.evil.com/x.js', 'https://evil.com/vercel.live/x.js', 'https://media-lab-react-vyef-git-connecthub-media-lab3.vercel.app/api/ch', 'ikke en adresse']) {
      expect(isVercelLiveRequest(PREVIEW, u), u).toBe(false)
    }
  })
})
