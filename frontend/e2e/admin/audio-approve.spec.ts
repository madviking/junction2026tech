import path from 'node:path'
import { expect, test } from '@playwright/test'
import { proof, signIn } from './helpers'
import { createVisit, deleteVisit, liveText } from './helpers-resident'

// (i) Admin uploads a human recording for a card, approves it, and the resident hears it
// instead of the generated audio. Changes shared data: the approved recording cannot be
// removed through the API, so it stays (card.symptom.lump.card, en).

// No traces: they would record the typed password.
test.use({ trace: 'off' })

const KEY = 'card.symptom.lump.card'
const WAV = path.resolve(import.meta.dirname, '../../../backend/voice/fixtures/en-new-lump.wav')

test('upload and approve a human recording; the resident play button fetches it', async ({ page, request }) => {
  test.setTimeout(120_000)
  await signIn(page, '/admin/audio')
  await page.getByRole('searchbox', { name: 'Search' }).fill(KEY)
  await page.getByRole('row', { name: new RegExp(KEY.replace(/\./g, '\\.')) }).click()
  const drawer = page.getByRole('dialog')

  await drawer.locator('input[type="file"]').setInputFiles(WAV)
  await drawer.getByRole('button', { name: 'Upload recording' }).click()
  const approve = drawer.getByRole('button', { name: 'Approve recording' })
  await expect(approve).toBeVisible()
  await page.screenshot({ path: proof('audio-uploaded'), fullPage: false })
  await approve.click()
  await expect(approve).toHaveCount(0)
  // "Residents hear: Human recording" (the first match; the second is the section divider).
  await expect(drawer.getByText('Human recording', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: proof('audio-approved'), fullPage: false })

  // The public clip endpoint now serves the human recording.
  const clipResponse = await request.get(`/api/voice/clip?key=${KEY}&lang=en`)
  expect(clipResponse.ok()).toBeTruthy()
  const clip = (await clipResponse.json()) as { url: string; source: string; review: string }
  expect(clip.source).toBe('human')
  expect(clip.review).toBe('approved')

  // On the resident symptom screen the card's play button fetches that blob.
  const cardText = (await liveText(request, KEY)) as string
  const symptomCard = (await liveText(request, 'journey.outcome.describe.symptom.card')) as string
  const code = await createVisit(request)
  try {
    await page.goto(`/r/en/v/${code}`)
    await page.getByRole('button', { name: symptomCard }).click()
    const card = page.getByRole('button', { name: cardText })
    await expect(card).toBeVisible()
    const listen = card.locator('xpath=following::button[1]')
    const blob = page.waitForResponse((r) => r.url().endsWith(clip.url) && r.request().method() === 'GET')
    await listen.click()
    const response = await blob
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^audio\//)
    await page.screenshot({ path: proof('resident-human-audio'), fullPage: false })
  } finally {
    await deleteVisit(request, code)
  }
})
