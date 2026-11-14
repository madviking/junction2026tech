import path from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Visit card, clinician view and county screen against the running app and backend.
// The journey is driven through the API (no journey screens), as a resident would tap it.
const PROOF = path.resolve(import.meta.dirname, '../../../docs/proof/2026-11-14')

/** Full-page proof screenshot from the top, so the sticky header is where it belongs. */
async function shot(page: Page, options: { path: string; fullPage: boolean }) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot(options)
}

async function visitAtWaitStage(request: APIRequestContext, lang = 'en'): Promise<string> {
  const created = await request.post('/api/visits', { data: { lang } })
  expect(created.ok()).toBeTruthy()
  const { code } = (await created.json()) as { code: string }
  const events = [
    { lang, outcome: 'symptom', symptoms: ['lump'] },
    { lang, outcome: 'door_known', route: 'A1' },
    { lang, outcome: 'no_answer' },
    { lang, outcome: 'got_time', visitDate: '2026-11-20' },
  ]
  for (const event of events) {
    const response = await request.post(`/api/visits/${code}/events`, { data: event })
    expect(response.ok(), `${event.outcome}: ${await response.text()}`).toBeTruthy()
  }
  return code
}

/** Count in the "where people are now" table for one language and stage (0 when the row is absent). */
async function stageCount(page: Page, language: string, stage: string): Promise<number> {
  const table = page.getByRole('table', { name: 'Where people are now, by language' })
  await expect(table).toBeVisible()
  const row = table.getByRole('row').filter({ hasText: language }).filter({ hasText: stage })
  if ((await row.count()) === 0) return 0
  return Number(await row.getByRole('cell').last().innerText())
}

async function totalJourneys(page: Page): Promise<number> {
  const value = page.getByText('Journeys in total', { exact: true }).locator('xpath=following-sibling::*[1]')
  return Number((await value.innerText()).replace(/\D/g, ''))
}

test('clinician taps next steps; the resident sees them on the visit card', async ({ page, request }) => {
  const code = await visitAtWaitStage(request)

  await page.goto(`/clinic/${code}`)
  await expect(page.getByRole('heading', { name: 'Potilaan yhteenveto' })).toBeVisible()
  await expect(page.getByText('Hälyttävä oire')).toBeVisible()
  await expect(page.getByText('Uusi kyhmy tai turvotus')).toBeVisible()
  await expect(page.getByText('Tulkki tarvitaan: englanti')).toBeVisible()
  await expect(page.getByText('Kukaan ei vastannut', { exact: false }).first()).toBeVisible()
  await shot(page, { path: `${PROOF}/clinician-before.png`, fullPage: true })

  await page.getByRole('button', { name: 'Lähete lähetetty' }).click()
  await page.getByRole('button', { name: 'Tutkimuksia tilattu' }).click()
  await page.getByRole('button', { name: 'Lähetä seuraavat askeleet' }).click()
  await expect(page.getByText('Seuraavat askeleet lähetetty potilaalle')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lähete lähetetty' })).toHaveAttribute('aria-pressed', 'true')
  await shot(page, { path: `${PROOF}/clinician-after.png`, fullPage: true })

  await page.goto(`/r/en/v/${code}/card`)
  await expect(page.getByRole('heading', { name: 'Next steps' })).toBeVisible()
  await expect(page.getByText(/A referral was sent/)).toBeVisible()
  await expect(page.getByText(/Tests were ordered/)).toBeVisible()
  await expect(page.getByText('Show this code or this screen at your visit', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Clinician view' })).toHaveAttribute('href', `/clinic/${code}`)
  await shot(page, { path: `${PROOF}/visit-card.png`, fullPage: true })

  await page.reload()
  await expect(page.getByText(/A referral was sent/)).toBeVisible()
})

test('visit card empty next steps and the clinician lookup', async ({ page, request }) => {
  const code = await visitAtWaitStage(request)

  await page.goto(`/r/en/v/${code}/card`)
  await expect(page.getByText('Your doctor or nurse adds the next steps here.')).toBeVisible()
  await shot(page, { path: `${PROOF}/visit-card-empty.png`, fullPage: true })

  // Tolerant input: lower case, spaces, no prefix.
  await page.goto('/clinic')
  await page.getByLabel('Käyntikoodi').fill(code.slice(4).toLowerCase().replace('-', ' '))
  await shot(page, { path: `${PROOF}/clinician-lookup.png`, fullPage: true })
  await page.getByRole('button', { name: 'Avaa yhteenveto' }).click()
  await expect(page).toHaveURL(new RegExp(`/clinic/${code}$`))
  await expect(page.getByText('Hälyttävä oire')).toBeVisible()
})

test('deleting the visit removes it and returns to the start', async ({ page, request }) => {
  const code = await visitAtWaitStage(request)

  await page.goto(`/r/en/v/${code}/card`)
  await page.getByRole('button', { name: 'Delete my data' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page).toHaveURL(/\/$/)
  const gone = await request.get(`/api/visits/${code}`)
  expect(gone.status()).toBe(404)
})

test('(g) county counts change after a journey is completed', async ({ page, request }) => {
  await page.goto('/county/helsinki')
  await expect(page.getByText('Breast cancer screening participation')).toBeVisible()
  const totalBefore = await totalJourneys(page)
  const closedBefore = await stageCount(page, 'English', 'Closed')

  // A new journey, closed by the clinician answer "nothing more" (visit → closed).
  const code = await visitAtWaitStage(request)
  const answered = await request.post(`/api/visits/${code}/clinician`, { data: { answers: ['nothing_more'] } })
  expect(answered.ok(), await answered.text()).toBeTruthy()

  await page.reload()
  await expect(page.getByText('Breast cancer screening participation')).toBeVisible()
  expect(await totalJourneys(page)).toBeGreaterThan(totalBefore)
  expect(await stageCount(page, 'English', 'Closed')).toBeGreaterThan(closedBefore)
  await expect(page.getByText('Counts are anonymous', { exact: false })).toBeVisible()
  await shot(page, { path: `${PROOF}/county.png`, fullPage: true })
})
