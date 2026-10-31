import { describe, expect, it } from 'vitest'
import { activeProduction, ciRunFor, ciVerdict, currentStatus, deployVerdict, deploymentFor, fastForward, prVerdict, versionMatches, versionVerdict } from './release-decide.mjs'

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

const REPO = 'm-l-development/MediaLabReact'
const pr = (more: Record<string, unknown> = {}) => ({ number: 19, state: 'open', merged: false, base: { ref: 'main', repo: { full_name: REPO } }, head: { ref: 'connecthub', sha: SHA, repo: { full_name: REPO } }, ...more })
const want = { sha: SHA, repo: REPO, base: 'main', branch: 'connecthub' }

describe('ciRunFor: kjøringer fra et annet repo (fork) teller ikke', () => {
  it('head_repository må være repoet når det oppgis', () => {
    const runs = [run(9, '2026-11-01T12:00:00Z', { head_repository: { full_name: 'angriper/MediaLabReact' } }), run(4, '2026-11-01T10:00:00Z', { head_repository: { full_name: REPO }, conclusion: 'failure' })]
    expect(ciRunFor(runs, SHA, 'connecthub', REPO)?.id).toBe(4)
  })
})

describe('prVerdict: grønn status bare for forventet pull request og commit', () => {
  it('riktig pull request → ok', () => expect(prVerdict(pr(), want)).toEqual({ state: 'ok' }))
  it('head endret mellom kontrollene → moved (ingen grønn status)', () => {
    expect(prVerdict(pr({ head: { ref: 'connecthub', sha: OTHER, repo: { full_name: REPO } } }), want)).toEqual({ state: 'moved', head: OTHER })
  })
  it('feil base-gren → fail', () => expect(prVerdict(pr({ base: { ref: 'develop', repo: { full_name: REPO } } }), want).state).toBe('fail'))
  it('base i et annet repo → fail', () => expect(prVerdict(pr({ base: { ref: 'main', repo: { full_name: 'x/y' } } }), want).state).toBe('fail'))
  it('head fra en fork eller annen gren → fail', () => {
    expect(prVerdict(pr({ head: { ref: 'connecthub', sha: SHA, repo: { full_name: 'x/MediaLabReact' } } }), want).state).toBe('fail')
    expect(prVerdict(pr({ head: { ref: 'annen', sha: SHA, repo: { full_name: REPO } } }), want).state).toBe('fail')
  })
  it('lukket eller allerede merget → fail (en opprettet PR er ikke en klar release)', () => {
    expect(prVerdict(pr({ state: 'closed' }), want).state).toBe('fail')
    expect(prVerdict(pr({ merged: true }), want).state).toBe('fail')
    expect(prVerdict(null, want).state).toBe('fail')
  })
})

describe('currentStatus: flere statuser med samme navn på samme commit', () => {
  const st = (id: number, state: string, at: string, context = 'release-gate') => ({ id, state, context, created_at: at })
  it('den nyeste gjelder (som i GitHub): pending → success → failure gir failure', () => {
    const list = [st(1, 'pending', '2026-11-01T10:00:00Z'), st(2, 'success', '2026-11-01T10:05:00Z'), st(3, 'failure', '2026-11-01T10:06:00Z'), st(4, 'success', '2026-11-01T11:00:00Z', 'Vercel')]
    expect(currentStatus(list, 'release-gate')?.id).toBe(3)
  })
  it('success fra en eldre kjøring overstyres ikke av rekkefølgen i lista', () => {
    expect(currentStatus([st(7, 'error', '2026-11-01T12:00:00Z'), st(6, 'success', '2026-11-01T11:00:00Z')], 'release-gate')?.state).toBe('error')
  })
  it('ingen status → null (ikke grønn)', () => expect(currentStatus([], 'release-gate')).toBeNull())
})

describe('versionVerdict: produksjonens version.json', () => {
  const only = (sha: string) => () => [sha]
  it('riktig og entydig → ok', () => expect(versionVerdict('aaaaaaaaaamvwz', SHA, only(SHA))).toEqual({ state: 'ok' }))
  it('eldre versjon fortsatt ute → other (vent)', () => expect(versionVerdict('bbbbbbbbbbmvwz', SHA, only(SHA)).state).toBe('other'))
  it('mangler, tom eller uten commit (bygg uten VERCEL_GIT_COMMIT_SHA) → unclear', () => {
    for (const v of [undefined, null, '', 'mvwzio29g8qd1', 42]) expect(versionVerdict(v, SHA, only(SHA)).state).toBe('unclear')
  })
  it('prefikset passer på flere commits → ambiguous (ikke godkjent)', () => {
    expect(versionVerdict('aaaaaaaaaamvwz', SHA, () => [SHA, 'a'.repeat(10) + 'c'.repeat(30)])).toEqual({ state: 'ambiguous', count: 2 })
  })
  it('prefikset finnes ikke i repoet → ambiguous med 0', () => expect(versionVerdict('aaaaaaaaaamvwz', SHA, () => []).state).toBe('ambiguous'))
})

describe('activeProduction: den aktive produksjonsdeployen, ikke bare en tidligere vellykket', () => {
  const st = (state: string, at = '2026-11-01T10:00:00Z') => ({ id: 1, state, created_at: at })
  it('nyeste produksjonsdeploy er commiten og success → ok', () => expect(activeProduction({ id: 1, sha: SHA }, [st('success')], SHA)).toEqual({ state: 'ok' }))
  it('en nyere deploy av en annen commit finnes → fail', () => expect(activeProduction({ id: 2, sha: OTHER }, [st('success')], SHA).state).toBe('fail'))
  it('under bygging → wait; feilet eller inactive → fail', () => {
    expect(activeProduction({ id: 1, sha: SHA }, [st('in_progress')], SHA).state).toBe('wait')
    expect(activeProduction({ id: 1, sha: SHA }, [st('failure')], SHA).state).toBe('fail')
    expect(activeProduction({ id: 1, sha: SHA }, [st('success'), { ...st('inactive', '2026-11-01T11:00:00Z'), id: 2 }], SHA).state).toBe('fail')
  })
  it('ingen produksjonsdeploy → wait (ikke godkjent)', () => expect(activeProduction(null, [], SHA).state).toBe('wait'))
})

describe('gyldige scenarier fungerer fortsatt', () => {
  it('ny commit etter eldre grønn: ny kjøring grønn, PR viser den, produksjon aktiv og entydig, connecthub bak → ff', () => {
    const r = ciRunFor([run(1, '2026-11-01T09:00:00Z', { head_repository: { full_name: REPO } }), run(2, '2026-11-01T10:00:00Z', { head_repository: { full_name: REPO } })], SHA, 'connecthub', REPO)
    expect(r?.id).toBe(2)
    expect(ciVerdict(r, [job(1, 'checks', 'success'), job(2, 'e2e', 'success')], REQ).state).toBe('ok')
    expect(prVerdict(pr(), want).state).toBe('ok')
    expect(versionVerdict('aaaaaaaaaaxyz', SHA, () => [SHA]).state).toBe('ok')
    expect(activeProduction({ id: 1, sha: SHA }, [{ id: 1, state: 'success', created_at: '2026-11-01T10:00:00Z' }], SHA).state).toBe('ok')
    expect(fastForward({ mainHead: SHA, sha: SHA, compare: 'ahead' })).toBe('ff')
    expect(versionMatches('aaaaaaaaaaxyz', SHA)).toBe(true)
  })
})
