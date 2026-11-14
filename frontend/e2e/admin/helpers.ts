import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

// Admin e2e helpers. Credentials come from the local seed file of throwaway test admins
// (backend/admin/seed/admin-users.local.yaml); the password is never printed, logged or
// shown in a screenshot (the password field is masked and filled just before submit).

const SEED = path.resolve(import.meta.dirname, '../../../backend/admin/seed/admin-users.local.yaml')

export const proof = (name: string) => path.resolve(import.meta.dirname, `../../../docs/proof/2026-11-14/admin-${name}.png`)

/** The first user of the seed file (tiny parser: `- email:` then `password:` lines). */
export function adminCredentials(): { email: string; password: string } {
  const yaml = readFileSync(SEED, 'utf8')
  const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, '')
  const email = yaml.match(/^\s*-\s*email:\s*(.+)$/m)?.[1]
  const afterEmail = email ? yaml.slice(yaml.indexOf(email)) : ''
  const password = afterEmail.match(/^\s*password:\s*(.+)$/m)?.[1]
  if (!email || !password) throw new Error('no admin user in the local seed file')
  return { email: unquote(email), password: unquote(password) }
}

/** Signs in through the sign-in page and waits for the target page. */
export async function signIn(page: Page, next = '/admin') {
  const { email, password } = adminCredentials()
  await page.goto(`/admin/sign-in?next=${encodeURIComponent(next)}`)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, '\\/')}$`))
}

/** A bearer token for direct API checks (same seed user). */
export async function apiToken(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/admin/sign-in', { data: adminCredentials() })
  expect(response.ok()).toBeTruthy()
  return ((await response.json()) as { token: string }).token
}
