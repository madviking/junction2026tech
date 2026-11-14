import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import path from 'node:path'
import { assertCanEdit } from '../lib/admin_actor'
import { audit, demoAccount, me, signIn } from './admin'
import { auth } from './auth'
import { hashPassword, verifyPassword } from './service'

const seedUser = (parse(readFileSync('admin/seed/admin-users.local.yaml', 'utf8')) as { users: { email: string; password: string }[] }).users[0]!

describe('admin sign-in', () => {
  it('hashes passwords and never stores them', async () => {
    const h = await hashPassword('correct horse')
    expect(h).not.toContain('correct horse')
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('signs a seeded admin in and refuses a wrong password', async () => {
    const ok = await signIn({ email: seedUser.email, password: seedUser.password })
    expect(ok.token.length).toBeGreaterThan(30)
    expect(ok.user.email).toBe(seedUser.email)
    await expect(signIn({ email: seedUser.email, password: 'nope' })).rejects.toThrow(/wrong email or password/)
  })

  it('the auth handler accepts a session token and rejects anonymous and bad tokens', async () => {
    const { token } = await signIn({ email: seedUser.email, password: seedUser.password })
    const data = await auth({ authorization: `Bearer ${token}` })
    expect(data!.email).toBe(seedUser.email)
    await expect(auth({ authorization: '' })).rejects.toThrow(/sign in required/)
    await expect(auth({ authorization: 'Bearer forged' })).rejects.toThrow(/invalid/)
  })

  it('admin endpoints reject anonymous calls', async () => {
    await expect(me()).rejects.toThrow()
    await expect(audit({})).rejects.toThrow()
  })
})

describe('admin sign-in throttle', () => {
  it('locks an email after five failed attempts and audits failures', async () => {
    const email = `throttle-${Date.now()}@silta.test`
    for (let i = 0; i < 5; i++) await expect(signIn({ email, password: 'x' })).rejects.toThrow(/wrong email or password/)
    await expect(signIn({ email, password: 'x' })).rejects.toThrow(/too many failed sign-ins/)
    const { listAudit } = await import('./repository')
    const rows = await listAudit(20)
    expect(rows.some((r) => r.action === 'admin.sign_in_failed' && r.target === email)).toBe(true)
  })
})

describe('admin usage', () => {
  it('rejects an anonymous call', async () => {
    const { usage } = await import('./usage')
    await expect(usage()).rejects.toThrow(/sign in required/)
  })
})

describe('demo viewer', () => {
  it('publishes its credentials and signs in as a view-only user', async () => {
    const demo = await demoAccount()
    expect(demo.email).toMatch(/@/)
    expect(demo.password.length).toBeGreaterThan(8)
    const { token, user } = await signIn({ email: demo.email, password: demo.password })
    expect(user.role).toBe('viewer')
    const data = await auth({ authorization: `Bearer ${token}` })
    expect(data!.role).toBe('viewer')
  })

  it('seeded team admins stay editors', async () => {
    const { user } = await signIn({ email: seedUser.email, password: seedUser.password })
    expect(user.role).toBe('editor')
  })

  it('viewers are refused every change, editors are not', () => {
    expect(() => assertCanEdit({ role: 'viewer' })).toThrow(/view-only/)
    expect(() => assertCanEdit({ role: 'editor' })).not.toThrow()
  })

  it('wrong passwords never lock the public demo account', async () => {
    const demo = await demoAccount()
    for (let i = 0; i < 6; i++) await expect(signIn({ email: demo.email, password: 'wrong' })).rejects.toThrow(/wrong email or password/)
    await expect(signIn({ email: demo.email, password: demo.password })).resolves.toMatchObject({ user: { role: 'viewer' } })
  })
})

// Fail closed: requireAdmin() refuses viewers, so a write endpoint is safe unless it opts
// into requireAdminView(). Only endpoints that change nothing may do that.
describe('view-only guard coverage', () => {
  const endpointFiles = ['admin', 'content', 'service_paths', 'voice'].flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => path.join(dir, f)),
  )
  const endpoints = endpointFiles.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split(/(?=export const \w+ = api\()/)
      .filter((chunk) => /auth: true/.test(chunk.split('\n')[1] ?? ''))
      .map((chunk) => ({ file, name: chunk.match(/export const (\w+)/)![1]!, method: chunk.match(/method: '(\w+)'/)![1]!, body: chunk })),
  )

  it('finds the admin endpoints', () => {
    expect(endpoints.length).toBeGreaterThan(20)
  })

  it('every authenticated endpoint is guarded, and only reads (and sign-out) allow viewers', () => {
    for (const e of endpoints) {
      const view = e.body.includes('requireAdminView()')
      expect(view || e.body.includes('requireAdmin()'), `${e.file} ${e.name} has no guard`).toBe(true)
      if (view) expect(e.method === 'GET' || e.name === 'signOut', `${e.file} ${e.name} (${e.method}) lets viewers write`).toBe(true)
    }
  })
})
