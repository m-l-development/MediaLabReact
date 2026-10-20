import { describe, expect, it } from 'vitest'
import { decide, newScope, observe, type Scope, type Step } from './policy'

const APP = 'https://media-lab-react-vyef.vercel.app'
const REF = 'cmuienhheklcgtfmpvbe'
const SUPA = `https://${REF}.supabase.co`
const CHURCH = { id: '11111111-1111-4111-8111-111111111111', name: 'E2E Testmenighet' }
const OTHER = '22222222-2222-4222-8222-222222222222'
const TEST_USER = '33333333-3333-4333-8333-333333333333'
const REAL_USER = '44444444-4444-4444-8444-444444444444'

function scope(o: { steps?: Step[]; email?: boolean; emailTo?: string | null; cleanup?: boolean; current?: string } = {}): Scope {
  const s = newScope({
    appOrigin: APP, supabaseRef: REF, church: CHURCH, testEmails: new Set(['e2e-admin@test.no', 'e2e-user@test.no']), testUserIds: [TEST_USER],
    approved: { steps: new Set(o.steps ?? []), email: !!o.email, emailTo: o.emailTo ?? null, cleanup: !!o.cleanup },
  })
  s.currentEmail = o.current ?? 'e2e-admin@test.no'
  return s
}
const rpc = (fn: string, body: unknown = {}) => ({ method: 'POST', url: `${SUPA}/rest/v1/rpc/${fn}`, body: JSON.stringify(body) })
const act = (a: string, body: unknown = {}) => ({ method: 'POST', url: `${APP}/api/ch?a=${a}`, body: JSON.stringify(body) })

describe('skrivesperre for produksjonstesten', () => {
  it('lesing går gjennom; skriving uten godkjenning stoppes', () => {
    const s = scope()
    expect(decide({ method: 'GET', url: `${APP}/app/`, body: null }, s).allow).toBe(true)
    expect(decide({ method: 'GET', url: `${SUPA}/rest/v1/churches?select=id`, body: null }, s)).toMatchObject({ allow: true, kind: 'read' })
    expect(decide(rpc('whoami'), s)).toMatchObject({ allow: true, kind: 'read' })
    expect(decide(rpc('admin_access_overview', { p_church: OTHER }), s)).toMatchObject({ allow: true, kind: 'read' }) // RLS avgjør hva som vises
    for (const fn of ['church_quota_overview', 'link_files_meta', 'storage_overview', 'export_my_data']) expect(decide(rpc(fn), s), fn).toMatchObject({ allow: true, kind: 'read' })
    expect(decide(rpc('request_admin_access', { p_church: CHURCH.id }), s).allow).toBe(false) // steget er ikke godkjent
    expect(decide({ method: 'PATCH', url: `${SUPA}/rest/v1/churches?id=eq.${CHURCH.id}`, body: '{}' }, s).allow).toBe(false)
    expect(decide({ method: 'POST', url: `${APP}/api/annet`, body: '{}' }, s).allow).toBe(false)
  })

  it('feil prosjekt stoppes alltid, også lesing (f.eks. connecthub-dev)', () => {
    const s = scope({ steps: ['access', 'files'] })
    expect(decide({ method: 'GET', url: 'https://uatpdmhnwwjgzlxaucsx.supabase.co/rest/v1/churches', body: null }, s).allow).toBe(false)
    expect(decide({ method: 'POST', url: 'https://uatpdmhnwwjgzlxaucsx.supabase.co/rest/v1/rpc/whoami', body: '{}' }, s).allow).toBe(false)
  })

  it('innlogging er oppsett; andre auth-kall (passord, MFA, e-postlenker, registrering) stoppes', () => {
    const s = scope()
    expect(decide({ method: 'POST', url: `${SUPA}/auth/v1/token?grant_type=password`, body: '{}' }, s)).toMatchObject({ allow: true, kind: 'session' })
    expect(decide({ method: 'POST', url: `${SUPA}/auth/v1/token?grant_type=refresh_token`, body: '{}' }, s).allow).toBe(true)
    for (const [m, p] of [['PUT', '/auth/v1/user'], ['POST', '/auth/v1/recover'], ['POST', '/auth/v1/otp'], ['POST', '/auth/v1/signup'], ['POST', '/auth/v1/factors'], ['DELETE', '/auth/v1/factors/x'], ['POST', '/auth/v1/verify'], ['POST', '/auth/v1/invite']] as const) {
      expect(decide({ method: m, url: SUPA + p, body: '{}' }, s).allow, `${m} ${p}`).toBe(false)
    }
  })

  it('Admin-tilgang: bare testmenigheten, bare egne forespørsler og bare testkontoer', () => {
    const s = scope({ steps: ['access'] })
    expect(decide(rpc('request_admin_access', { p_church: CHURCH.id, p_duration: '1d' }), s).allow).toBe(true)
    expect(decide(rpc('request_admin_access', { p_church: OTHER }), s).allow).toBe(false)
    const req = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', foreign = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    expect(decide(rpc('decide_admin_access', { p_request: req, p_approve: true }), s).allow).toBe(false) // ikke sett ennå
    observe(rpc('admin_access_overview', { p_church: CHURCH.id }), JSON.stringify({ pending: [{ id: req, user_id: TEST_USER }, { id: foreign, user_id: REAL_USER }] }), s)
    expect(decide(rpc('decide_admin_access', { p_request: req, p_approve: false }), s).allow).toBe(true)
    expect(decide(rpc('withdraw_admin_access', { p_request: req }), s).allow).toBe(true)
    expect(decide(rpc('decide_admin_access', { p_request: foreign, p_approve: true }), s).allow).toBe(false) // ekte brukers forespørsel
    // samme overview for en annen menighet lærer ingenting
    const other = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    observe(rpc('admin_access_overview', { p_church: OTHER }), JSON.stringify({ pending: [{ id: other, user_id: TEST_USER }] }), s)
    expect(decide(rpc('decide_admin_access', { p_request: other, p_approve: true }), s).allow).toBe(false)
    expect(decide(rpc('revoke_admin_access', { p_church: CHURCH.id, p_user: TEST_USER }), s).allow).toBe(true)
    expect(decide(rpc('revoke_admin_access', { p_church: CHURCH.id, p_user: REAL_USER }), s).allow).toBe(false)
    expect(decide(rpc('revoke_admin_access', { p_church: OTHER, p_user: TEST_USER }), s).allow).toBe(false)
  })

  it('andre skrive-RPC-er stoppes selv med alle steg godkjent', () => {
    const s = scope({ steps: ['access', 'files', 'notifications'], cleanup: true })
    for (const fn of ['assign_role', 'remove_membership', 'add_membership', 'set_church_status', 'church_settings_save', 'loop_disk_save', 'send_church_message', 'set_user_status', 'save_mail_template', 'set_member_limit']) {
      expect(decide(rpc(fn, { p_church: CHURCH.id }), s).allow, fn).toBe(false)
    }
  })

  it('filer: bare opplasting til testmenigheten, og bare sletting av filer denne kjøringen lastet opp', () => {
    const s = scope({ steps: ['files'] })
    expect(decide(act('upload.start', { kind: 'file', church: CHURCH.id, folder: 'bilder' }), s).allow).toBe(true)
    expect(decide(act('upload.start', { kind: 'file', church: OTHER, folder: 'bilder' }), s).allow).toBe(false)
    expect(decide(act('upload.start', { kind: 'church_logo', church_name: 'Ny' }), s).allow).toBe(false) // ville laget en menighet
    expect(decide(act('upload.start', { kind: 'link', link: 'x', church: CHURCH.id }), s).allow).toBe(false)
    const up = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', file = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    expect(decide(act('upload.finish', { id: up }), s).allow).toBe(false)
    const signed = `${SUPA}/storage/v1/object/upload/sign/ch-files/x/y.png`
    expect(decide({ method: 'PUT', url: `${signed}?token=t`, body: null }, s).allow).toBe(false)
    observe(act('upload.start', {}), JSON.stringify({ id: up, url: `${signed}?token=t` }), s)
    expect(decide({ method: 'PUT', url: `${signed}?token=t`, body: null }, s).allow).toBe(true)
    expect(decide({ method: 'PUT', url: `${SUPA}/storage/v1/object/upload/sign/ch-files/annen.png?token=t`, body: null }, s).allow).toBe(false)
    expect(decide(act('upload.finish', { id: up }), s).allow).toBe(true)
    observe(act('upload.finish', { id: up }), JSON.stringify({ ok: true, file: { id: file } }), s)
    expect(decide(act('file.delete', { id: file }), s).allow).toBe(true)
    expect(decide(act('file.delete', { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }), s).allow).toBe(false)
    expect(decide({ method: 'DELETE', url: `${SUPA}/storage/v1/object/ch-files/x`, body: null }, s).allow).toBe(false)
  })

  it('e-post: alt stoppes uten egen godkjenning; med godkjenning bare «Send test til meg» til godkjent mottaker', () => {
    for (const a of ['invite.create', 'invite.resend', 'request.approve', 'request.submit', 'auth.recover', 'mail.test']) expect(decide(act(a, { key: 'welcome' }), scope()).allow, a).toBe(false)
    const s = scope({ email: true, emailTo: 'eier@test.no', current: 'eier@test.no' })
    expect(decide(act('mail.test', { key: 'welcome' }), s)).toMatchObject({ allow: true, kind: 'email' })
    expect(decide(act('invite.create', { email: 'eier@test.no' }), s).allow).toBe(false)
    expect(decide(act('mail.test', { key: 'welcome' }), scope({ email: true, emailTo: 'eier@test.no', current: 'e2e-admin@test.no' })).allow).toBe(false)
  })

  it('ugjenkallelig opprydding: bare med godkjenning, bare testmenigheten (id og navn) og bare testkontoer', () => {
    expect(decide(act('church.purge', { church_id: CHURCH.id, confirm_name: CHURCH.name }), scope()).allow).toBe(false)
    const s = scope({ cleanup: true })
    expect(decide(act('church.purge', { church_id: CHURCH.id, confirm_name: CHURCH.name }), s)).toMatchObject({ allow: true, kind: 'irreversible' })
    expect(decide(act('church.purge', { church_id: CHURCH.id, confirm_name: 'Annen' }), s).allow).toBe(false)
    expect(decide(act('church.purge', { church_id: OTHER, confirm_name: CHURCH.name }), s).allow).toBe(false)
    expect(decide(act('privacy.delete_me', {}), s).allow).toBe(true)
    expect(decide(act('privacy.delete_me', {}), scope({ cleanup: true, current: 'ekte@bruker.no' })).allow).toBe(false)
  })

  it('ukjente handlinger og verter: lesing tillatt, skriving stoppet', () => {
    const s = scope({ steps: ['access', 'files', 'notifications'], cleanup: true })
    expect(decide(act('file.cleanup', {}), s).allow).toBe(false)
    expect(decide(act('church.export', { church_id: CHURCH.id }), s).allow).toBe(false)
    expect(decide({ method: 'GET', url: 'https://huggingface.co/x/model.onnx', body: null }, s).allow).toBe(true)
    expect(decide({ method: 'POST', url: 'https://example.com/collect', body: '{}' }, s).allow).toBe(false)
    expect(decide({ method: 'POST', url: 'ikke en adresse', body: null }, s).allow).toBe(false)
  })
})
