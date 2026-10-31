import { describe, expect, it } from 'vitest'
import { ciRunFor, ciVerdict, deployVerdict, deploymentFor, fastForward, versionMatches } from './release-decide.mjs'

const SHA = 'a'.repeat(40)
const OTHER = 'b'.repeat(40)
const run = (id: number, created: string, more: Record<string, unknown> = {}) => ({ id, created_at: created, head_sha: SHA, event: 'push', head_branch: 'connecthub', status: 'completed', conclusion: 'success', run_attempt: 1, ...more })
const job = (id: number, name: string, conclusion: string | null, more: Record<string, unknown> = {}) => ({ id, name, status: conclusion ? 'completed' : 'in_progress', conclusion, started_at: '2026-11-01T10:00:00Z', ...more })
const REQ = ['checks', 'e2e']

describe('ciRunFor: riktig kjøring for riktig commit', () => {
  it('velger den nyeste kjøringen, ikke en eldre vellykket', () => {
    const r = ciRunFor([run(1, '2026-11-01T10:00:00Z'), run(2, '2026-11-01T11:00:00Z', { conclusion: 'failure' })], SHA, 'connecthub')
    expect(r?.id).toBe(2)
  })
  it('ser bort fra andre commits, andre grener og pull_request-kjøringer', () => {
    const r = ciRunFor([
      run(5, '2026-11-01T12:00:00Z', { head_sha: OTHER }),
      run(6, '2026-11-01T12:00:00Z', { head_branch: 'main' }),
      run(7, '2026-11-01T12:00:00Z', { event: 'pull_request' }),
      run(3, '2026-11-01T09:00:00Z'),
    ], SHA, 'connecthub')
    expect(r?.id).toBe(3)
  })
  it('ingen kjøring ennå → null', () => expect(ciRunFor([], SHA, 'connecthub')).toBeNull())
})

describe('ciVerdict', () => {
  it('venter mens kjøringen pågår (også et nytt forsøk)', () => {
    expect(ciVerdict(run(1, 'x', { status: 'in_progress', conclusion: null }), [], REQ).state).toBe('wait')
    expect(ciVerdict(null, [], REQ).state).toBe('wait')
  })
  it('ok bare når begge jobbene er success', () => {
    const v = ciVerdict(run(1, 'x'), [job(1, 'checks', 'success'), job(2, 'e2e', 'success')], REQ)
    expect(v.state).toBe('ok')
  })
  it('en jobb som mangler, er en feil (ikke grønn)', () => {
    const v = ciVerdict(run(1, 'x'), [job(1, 'checks', 'success')], REQ)
    expect(v).toMatchObject({ state: 'fail', cancelled: false })
  })
  it('feilet jobb → fail', () => {
    const v = ciVerdict(run(1, 'x', { conclusion: 'failure' }), [job(1, 'checks', 'success'), job(2, 'e2e', 'failure')], REQ)
    expect(v).toMatchObject({ state: 'fail', cancelled: false })
    if (v.state === 'fail') expect(v.text).toContain('e2e=failure')
  })
  it('avbrutt kjøring → fail med cancelled (sperren avslutter rolig hvis commiten er erstattet)', () => {
    const v = ciVerdict(run(1, 'x', { conclusion: 'cancelled' }), [job(1, 'checks', 'success'), job(2, 'e2e', 'cancelled')], REQ)
    expect(v).toMatchObject({ state: 'fail', cancelled: true })
  })
  it('dobbel jobb med samme navn: den nyeste teller', () => {
    const jobs = [job(1, 'checks', 'success'), job(2, 'e2e', 'success', { started_at: '2026-11-01T09:00:00Z' }), job(3, 'e2e', 'failure', { started_at: '2026-11-01T10:30:00Z' })]
    expect(ciVerdict(run(1, 'x'), jobs, REQ).state).toBe('fail')
  })
  it('grønne jobber, men kjøringen ikke success → fail', () => {
    expect(ciVerdict(run(1, 'x', { conclusion: 'failure' }), [job(1, 'checks', 'success'), job(2, 'e2e', 'success')], REQ).state).toBe('fail')
  })
})

describe('deploy', () => {
  const dep = (id: number, sha: string, env: string, created: string) => ({ id, sha, environment: env, created_at: created })
  it('nyeste deployment for commit og miljø', () => {
    const d = deploymentFor([dep(1, SHA, 'Preview', '2026-11-01T10:00:00Z'), dep(2, SHA, 'Preview', '2026-11-01T11:00:00Z'), dep(3, SHA, 'Production', '2026-11-01T12:00:00Z'), dep(4, OTHER, 'Preview', '2026-11-01T13:00:00Z')], SHA, 'Preview')
    expect(d?.id).toBe(2)
  })
  it('status: venter, ok eller feil (inactive/error/failure er ikke ok)', () => {
    const st = (state: string, created: string) => ({ id: 1, state, created_at: created, environment_url: 'https://x' })
    expect(deployVerdict([]).state).toBe('wait')
    expect(deployVerdict([st('in_progress', '2026-11-01T10:00:00Z')]).state).toBe('wait')
    expect(deployVerdict([st('success', '2026-11-01T10:00:00Z')])).toEqual({ state: 'ok', url: 'https://x' })
    for (const s of ['failure', 'error', 'inactive']) expect(deployVerdict([st(s, '2026-11-01T10:00:00Z')]).state).toBe('fail')
    expect(deployVerdict([st('success', '2026-11-01T10:00:00Z'), { ...st('error', '2026-11-01T11:00:00Z'), id: 2 }]).state).toBe('fail')
  })
})

describe('versionMatches', () => {
  it('10 tegn av commiten må stemme', () => {
    expect(versionMatches('aaaaaaaaaamvwzio29g8qd', SHA)).toBe(true)
    expect(versionMatches('aaaaaaabbbmvwzio29g8qd', SHA)).toBe(false)
    expect(versionMatches(undefined, SHA)).toBe(false)
    expect(versionMatches('aaaaaaaaaa', 'kort')).toBe(false)
  })
})

describe('fastForward', () => {
  it('bare når commiten er toppen av main og connecthub ligger bak', () => {
    expect(fastForward({ mainHead: SHA, sha: SHA, compare: 'ahead' })).toBe('ff')
    expect(fastForward({ mainHead: SHA, sha: SHA, compare: 'identical' })).toBe('noop')
    expect(fastForward({ mainHead: OTHER, sha: SHA, compare: 'ahead' })).toBe('skip')
    expect(fastForward({ mainHead: SHA, sha: SHA, compare: 'behind' })).toBe('skip')
    expect(fastForward({ mainHead: SHA, sha: SHA, compare: 'diverged' })).toBe('skip')
  })
})
