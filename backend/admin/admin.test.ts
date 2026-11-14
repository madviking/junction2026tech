import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { audit, me, signIn } from './admin'
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
