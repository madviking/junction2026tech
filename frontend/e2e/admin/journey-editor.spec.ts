import { expect, test, type APIRequestContext } from '@playwright/test'
import path from 'node:path'
import { apiToken, signIn } from './helpers'

// Journey editor (behind SILTA_FEATURE_JOURNEY_EDITOR + VITE_FEATURE_JOURNEY_EDITOR).
// Skips itself when the backend graph says the editor is disabled (the default).
// Edits only the draft: an outcome on `wait` that leads to a stage that does not exist →
// the issue shows and publish is refused with it; leading to `closed` → no errors; then
// removed. The draft is discarded at the end, so live content is never touched.

// No traces: they would record the typed password.
test.use({ trace: 'off', actionTimeout: 15_000 })

const shot = (name: string) => path.resolve(import.meta.dirname, `../../../docs/proof/2026-11-14/journey-editor-${name}.png`)
const OUTCOME = 'e2e_moved'
const MISSING = 'e2e_nowhere'
const ISSUE_PATH = `journey.stages.wait.outcomes.${OUTCOME}.next`

async function adminGet<T>(request: APIRequestContext, auth: Record<string, string>, url: string): Promise<T> {
  const response = await request.get(url, { headers: auth })
  expect(response.ok(), url).toBeTruthy()
  return (await response.json()) as T
}

test('add an outcome to a missing stage, publish refused, fix it, remove it', async ({ page, request }) => {
  test.setTimeout(120_000)
  const auth = { authorization: `Bearer ${await apiToken(request)}` }
  const graph = await adminGet<{ enabled: boolean }>(request, auth, '/api/content/admin/journey/graph')
  test.skip(!graph.enabled, 'journey editor is disabled on the backend (SILTA_FEATURE_JOURNEY_EDITOR)')

  const draft = await adminGet<{ summary: { exists: boolean; changedKeys: string[] } }>(request, auth, '/api/content/admin/draft')
  expect(draft.summary.changedKeys, 'someone has unpublished draft changes; refusing to touch the draft').toEqual([])
  const liveBefore = (await adminGet<{ versions: { version: number; live: boolean }[] }>(request, auth, '/api/content/admin/versions')).versions.find((v) => v.live)?.version

  try {
    await signIn(page, '/admin/journey')
    await expect(page.getByRole('link', { name: 'Journey' })).toBeVisible()
    const board = page.getByRole('region', { name: 'Journey stages' })
    await expect(board.getByRole('heading', { name: 'Start' })).toBeVisible()
    await page.screenshot({ path: shot('graph'), fullPage: true })

    // Add an outcome to `wait` that leads to a stage that does not exist.
    await page.getByRole('button', { name: 'Add outcome to wait' }).click()
    const drawer = page.getByRole('dialog')
    await drawer.getByLabel('Outcome id').fill(OUTCOME)
    await drawer.getByLabel('Card text (English)').fill('I moved away [E2E TEST]')
    await drawer.getByLabel('Card text (Finnish)').fill('Muutin pois [E2E-TESTI]')
    await drawer.getByRole('combobox', { name: 'Leads to (next stage)' }).click()
    await page.getByRole('option', { name: 'Another id (not a stage yet)' }).click()
    await drawer.getByLabel('Next stage id').fill(MISSING)
    await page.screenshot({ path: shot('add-outcome-drawer'), fullPage: false })
    await drawer.getByRole('button', { name: 'Add outcome' }).click()
    await expect(drawer).toBeHidden()

    await expect(board.getByText(`missing stage ${MISSING}`)).toBeVisible()
    const aside = page.getByRole('complementary', { name: 'Validation and review flags' })
    await expect(aside.getByText(ISSUE_PATH)).toBeVisible()
    await expect(aside.getByText(`unknown stage ${MISSING}`)).toBeVisible()
    await expect(page.getByText(/^The draft has \d+ errors?$/)).toBeVisible()
    await page.screenshot({ path: shot('issue-shown'), fullPage: true })

    // Publishing is refused and the refusal lists the issue; live stays the same version.
    await page.getByRole('button', { name: 'Draft and publish' }).click()
    await expect(page).toHaveURL(/\/admin\/content$/)
    await page.getByRole('textbox', { name: 'Publish note (optional)' }).fill('E2E journey editor test (must be refused)')
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    const refused = page.getByRole('alert').filter({ hasText: 'Nothing was published' }).or(page.getByText('Nothing was published'))
    await expect(refused.first()).toBeVisible()
    await expect(page.getByText(ISSUE_PATH).first()).toBeVisible()
    await refused.first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: shot('publish-refused'), fullPage: false })
    const liveAfter = (await adminGet<{ versions: { version: number; live: boolean }[] }>(request, auth, '/api/content/admin/versions')).versions.find((v) => v.live)?.version
    expect(liveAfter).toBe(liveBefore)

    // Lead it to `closed`: no errors left.
    await page.goto('/admin/journey')
    await page.getByRole('button', { name: `Change where ${OUTCOME} leads` }).click()
    await drawer.getByRole('combobox', { name: 'Leads to (next stage)' }).click()
    await page.getByRole('option', { name: 'closed', exact: true }).click()
    await drawer.getByRole('button', { name: 'Save' }).click()
    await expect(drawer).toBeHidden()
    await expect(aside.getByText('0 errors')).toBeVisible()
    await expect(board.getByText(`missing stage ${MISSING}`)).toHaveCount(0)
    await page.screenshot({ path: shot('fixed'), fullPage: true })

    // Remove it again (inline confirm).
    await page.getByRole('button', { name: `Remove outcome ${OUTCOME}` }).click()
    await expect(page.getByText(`Remove outcome ${OUTCOME}?`)).toBeVisible()
    await page.getByRole('button', { name: 'Confirm remove' }).click()
    await expect(page.getByRole('button', { name: `Remove outcome ${OUTCOME}` })).toHaveCount(0)
    await page.screenshot({ path: shot('removed'), fullPage: true })
  } finally {
    // Leave no draft behind: the live version is untouched either way.
    const discarded = await request.post('/api/content/admin/discard', { headers: auth })
    expect(discarded.ok()).toBeTruthy()
  }
  const after = await adminGet<{ summary: { exists: boolean } }>(request, auth, '/api/content/admin/draft')
  expect(after.summary.exists).toBe(false)
})
