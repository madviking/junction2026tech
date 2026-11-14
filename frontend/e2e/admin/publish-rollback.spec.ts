import { expect, test } from '@playwright/test'
import { apiToken, proof, signIn } from './helpers'
import { advanceToContact, createVisit, deleteVisit, liveText } from './helpers-resident'

// (h) Admin edits a resident-visible card text, publishes, the resident sees it; then rolls
// back to the version that was live before and the old text returns. Changes shared live
// content: run once, on purpose. The end state is the live version from before the test.

// No traces: they would record the typed password.
test.use({ trace: 'off' })

const KEY = 'journey.outcome.contact.no_answer.card'

test('edit, publish, resident sees it, roll back restores the old text', async ({ page, request }) => {
  test.setTimeout(120_000)
  const auth = { authorization: `Bearer ${await apiToken(request)}` }
  const draft = (await (await request.get('/api/content/admin/draft', { headers: auth })).json()) as { summary: { changedKeys: string[] } }
  expect(draft.summary.changedKeys, 'someone has unpublished draft changes; refusing to publish them').toEqual([])
  const versions = (await (await request.get('/api/content/admin/versions', { headers: auth })).json()) as { versions: { version: number; live: boolean }[] }
  const liveBefore = versions.versions.find((v) => v.live)?.version
  expect(liveBefore).toBeDefined()
  const oldText = await liveText(request, KEY)
  expect(oldText).toBeTruthy()
  const newText = `Nobody answered [E2E TEST WORDING ${Date.now()}]`

  // Edit the English text in the drawer.
  await signIn(page, '/admin/content')
  await page.getByRole('searchbox', { name: 'Search' }).fill('contact.no_answer.card')
  await page.getByRole('row', { name: /contact → Nobody answered · card/ }).click()
  const drawer = page.getByRole('dialog')
  await drawer.getByLabel('English (en)').fill(newText)
  await drawer.getByRole('button', { name: 'Save EN' }).click()
  await expect(drawer.getByText('Changed in draft')).toBeVisible()
  await expect(drawer.getByLabel('English (en)')).toHaveValue(newText)
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  // Draft panel: one changed text, publish with a note.
  await expect(page.getByText(`Based on version ${liveBefore} · 1 changed text`)).toBeVisible()
  await page.getByRole('textbox', { name: 'Publish note (optional)' }).fill('E2E test: marked test wording (rolled back by the test)')
  await page.screenshot({ path: proof('draft-panel'), fullPage: false })
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByText(/^Published version \d+$/)).toBeVisible()
  await page.screenshot({ path: proof('published'), fullPage: false })

  // The resident sees the new text: live bundle and the contact stage screen.
  expect(await liveText(request, KEY)).toBe(newText)
  const code = await createVisit(request)
  try {
    await advanceToContact(request, code)
    await page.goto(`/r/en/v/${code}`)
    await expect(page.getByRole('button', { name: newText })).toBeVisible()
    await page.screenshot({ path: proof('resident-new-text'), fullPage: true })

    // Roll back to the version that was live before.
    await page.goto('/admin/versions')
    await page.getByRole('button', { name: `Roll back to version ${liveBefore}` }).click()
    await page.screenshot({ path: proof('rollback-confirm'), fullPage: false })
    await page.getByRole('button', { name: `Make version ${liveBefore} live` }).click()
    await expect(page.getByText(`Version ${liveBefore} is live`)).toBeVisible()

    expect(await liveText(request, KEY)).toBe(oldText)
    await page.goto(`/r/en/v/${code}`)
    await expect(page.getByRole('button', { name: oldText as string })).toBeVisible()
    await expect(page.getByText(newText)).toHaveCount(0)
  } finally {
    await deleteVisit(request, code)
  }
})
