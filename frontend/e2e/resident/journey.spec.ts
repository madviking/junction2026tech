import path from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Resident journey against the running app and the real backend (project `resident`, 375 px).
// Card matching makes two small live Gemini calls (test d); audio is never played here.
const proof = path.resolve(import.meta.dirname, '../../../docs/proof/2026-11-14')
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(proof, `${name}.png`), fullPage: true })

/** A new anonymous visit, moved forward through the API (test setup only; the UI path is test a). */
async function visitAt(request: APIRequestContext, events: Record<string, unknown>[], lang = 'en'): Promise<string> {
  const created = await request.post('/api/visits', { data: { lang } })
  expect(created.ok()).toBe(true)
  const { code } = (await created.json()) as { code: string }
  for (const event of events) {
    const res = await request.post(`/api/visits/${code}/events`, { data: { lang, ...event } })
    expect(res.ok(), JSON.stringify(event)).toBe(true)
  }
  return code
}

const TO_CONTACT = [
  { outcome: 'symptom', symptoms: ['lump'] },
  { outcome: 'door_known', route: 'A1' },
]

test('(a) happy path: language → start → symptom → route → door → wait → visit → visit card', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'العربية' })).not.toHaveAccessibleDescription(/not yet checked/)
  await shot(page, 'language-picker')

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page).toHaveURL(/\/r\/en$/)
  await expect(page.getByText('No name, no ID')).toBeVisible()
  await shot(page, 'journey-start')

  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/r\/en\/v\/SLT-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
  await expect(page.getByRole('heading', { name: 'What do you need help with?' })).toBeVisible()
  // One red control (112, direct dial) and a neutral way to the emergency signs.
  await expect(page.getByRole('button', { name: 'Urgent?' })).toBeVisible()
  await expect(page.locator('a[href="tel:112"]')).toHaveCount(1)
  await shot(page, 'journey-describe')

  await page.getByRole('button', { name: 'I have a symptom that worries me' }).click()
  await expect(page.getByRole('heading', { name: 'What worries you?' })).toBeVisible()
  await page.getByRole('button', { name: 'A new lump or swelling' }).click()
  await expect(page.getByRole('button', { name: 'A new lump or swelling' })).toHaveAttribute('aria-pressed', 'true')
  await shot(page, 'journey-symptoms')
  // Continue stays in view at the bottom of the screen; "how long" is its own step.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeInViewport()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'How long have you had them?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: 'Where do you get health care?' })).toBeVisible()
  await page.getByText('These questions help you choose:').click()
  await expect(page.getByText('Do you have a Kela card?')).toBeVisible()
  await shot(page, 'journey-route')
  await page.getByRole('button', { name: 'I live in Finland and have a home municipality' }).click()

  await expect(page.getByText('Minulla on nämä oireet:')).toBeVisible()
  await expect(page.getByText('Say this in Finnish')).toBeVisible()
  await expect(page.getByText('Time limits')).toBeVisible()
  await shot(page, 'journey-contact')
  // The care path overview is one tap away and marks the current step.
  await page.getByRole('button', { name: 'Your path' }).click()
  await expect(page.locator('li[aria-current="step"]')).toContainText('Contact the county health station')
  await shot(page, 'journey-path')
  await page.getByRole('button', { name: 'Back to my step' }).click()
  await expect(page.getByRole('button', { name: 'I contacted them' })).toBeInViewport()
  await page.getByRole('button', { name: 'I contacted them' }).click()
  await page.getByRole('button', { name: 'I got an appointment' }).click()
  // The outcome records the visit date (optional); fill it in.
  await page.getByLabel('When is your appointment?').fill('2026-11-20')
  await shot(page, 'journey-visit-date')
  await page.getByRole('button', { name: 'Save the date' }).click()

  await expect(page.getByRole('heading', { name: 'Any news?' })).toBeVisible()
  const code = page.url().split('/v/')[1]!.split('/')[0]!
  const saved = await (await page.request.get(`/api/visits/${code}?lang=en`)).json()
  expect(saved.state.visitDate).toBe('2026-11-20')
  await shot(page, 'journey-wait')
  await page.getByRole('button', { name: 'My visit is now' }).click()

  await expect(page.getByRole('heading', { name: 'What did the doctor or nurse say?' })).toBeVisible()
  await shot(page, 'journey-visit')
  await page.getByRole('button', { name: 'Show your visit card' }).click()
  await expect(page).toHaveURL(/\/r\/en\/v\/SLT-[0-9A-Z-]+\/card$/)
})

test('(b) "Nobody answered" twice → stalled with the escalation ladder', async ({ page, request }) => {
  const code = await visitAt(request, TO_CONTACT)
  await page.goto(`/r/en/v/${code}`)

  await page.getByRole('button', { name: 'I contacted them' }).click()
  await page.getByRole('button', { name: 'Nobody answered' }).click()
  await expect(page.getByText('Try the message channel or call 116117')).toBeVisible()
  await expect(page.getByText('Minulla on nämä oireet:')).toBeVisible()
  await shot(page, 'journey-then-text')

  await page.getByRole('button', { name: 'I contacted them' }).click()
  await page.getByRole('button', { name: 'Nobody answered' }).click()
  await expect(page.getByRole('heading', { name: 'Steps if nothing happens' })).toBeVisible()
  const rungs = page.getByRole('listitem').filter({ hasText: /Call the unit that holds the referral|Muistutus|Patient ombudsman|Kantelu/ })
  await expect(rungs).toHaveCount(4)
  await expect(page.locator('li[aria-current="step"]')).toContainText('Call the unit that holds the referral')
  await expect(page.getByRole('button', { name: 'Still no answer' })).toBeVisible()
  await shot(page, 'journey-stalled')
})

test('(c) emergency interrupt from the contact stage → 112 screen, and back via "something changed"', async ({ page, request }) => {
  const code = await visitAt(request, TO_CONTACT)
  await page.goto(`/r/en/v/${code}`)
  await expect(page.getByText('Minulla on nämä oireet:')).toBeVisible()

  await page.getByRole('button', { name: 'Urgent?' }).click()
  await expect(page.getByText('Call 112 now')).toBeVisible()
  await expect(page.locator('a[href="tel:112"]')).toHaveCount(1)
  await expect(page.getByText('Chest pain')).toBeVisible()
  // One action only: no cards, no fields; the only other control is the way back.
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Urgent?' })).toHaveCount(0)
  const back = page.getByRole('button', { name: 'Something changed or got worse' })
  await expect(back).toBeEnabled()
  await shot(page, 'journey-emergency')

  await back.click()
  await expect(page.getByRole('heading', { name: 'What do you need help with?' })).toBeVisible()
})

test('(c2) emergency screen shows at once and stays when the event cannot be sent (offline)', async ({ page, request }) => {
  const code = await visitAt(request, TO_CONTACT)
  await page.goto(`/r/en/v/${code}`)
  await expect(page.getByText('Minulla on nämä oireet:')).toBeVisible()

  await page.route('**/api/visits/*/events', (route) => route.abort('internetdisconnected'))
  await page.getByRole('button', { name: 'Urgent?' }).click()
  await expect(page.getByText('Call 112 now')).toBeVisible()
  await expect(page.locator('a[href="tel:112"]')).toHaveCount(1)
  await expect(page.getByText('Chest pain')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Something changed or got worse' })).toBeEnabled()
  await expect(page.getByText('Your answer was not saved. Please try again.')).toHaveCount(0)
  await shot(page, 'journey-emergency-offline')
  const saved = await (await request.get(`/api/visits/${code}?lang=en`)).json()
  expect(saved.state.stage).toBe('contact')
})

test('(d) free text: confident match read back and confirmed; vague text keeps the cards', async ({ page, request }) => {
  const code = await visitAt(request, [])
  await page.goto(`/r/en/v/${code}`)
  await page.getByRole('button', { name: 'I have a symptom that worries me' }).click()

  const field = page.getByRole('textbox', { name: 'Describe in your own words' })
  await field.fill('I found a lump in my breast')
  await page.getByRole('button', { name: 'Check' }).click()
  const readback = page.getByRole('group', { name: 'Did you mean: A new lump or swelling?' })
  await expect(readback).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'A new lump or swelling' })).toHaveAttribute('aria-pressed', 'false')
  await shot(page, 'journey-readback')
  await readback.getByRole('button', { name: 'Yes' }).click()
  await expect(page.getByRole('button', { name: 'A new lump or swelling' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'What worries you?' })).toBeVisible()

  await field.fill('hmm')
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText('We are not sure what you meant. Please choose a card.')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('group', { name: /Did you mean/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Bleeding I cannot explain' })).toHaveAttribute('aria-pressed', 'false')
  await shot(page, 'journey-match-choose')
})

test('(h) back one step from the header, and restart from the path overview', async ({ page, request }) => {
  const code = await visitAt(request, TO_CONTACT)
  await page.goto(`/r/en/v/${code}`)
  await expect(page.getByText('Say this in Finnish')).toBeVisible()

  await page.getByRole('button', { name: 'Go back one step' }).click()
  await expect(page.getByRole('heading', { name: 'Where do you get health care?' })).toBeVisible()
  await page.getByRole('button', { name: 'Go back one step' }).click()
  await expect(page.getByRole('heading', { name: 'What do you need help with?' })).toBeVisible()
  // The first step has nothing before it.
  await expect(page.getByRole('button', { name: 'Go back one step' })).toHaveCount(0)
  const saved = await (await request.get(`/api/visits/${code}?lang=en`)).json()
  expect(saved.state.stage).toBe('describe')

  await page.getByRole('button', { name: 'Your path' }).click()
  await shot(page, 'journey-path-start')
  await page.getByRole('button', { name: 'Start from the beginning' }).click()
  await expect(page).toHaveURL(/\/r\/en$/)
})

test('(e) unknown code → error with a way back to start', async ({ page }) => {
  await page.goto('/r/en/v/SLT-ZZZZ-ZZZZ')
  await expect(page.getByText('We could not find this code. Check it, or start again.')).toBeVisible()
  await shot(page, 'journey-unknown-code')
  await page.getByRole('button', { name: 'Back to start' }).click()
  await expect(page).toHaveURL(/\/r\/en$/)
})

test('(f) Arabic: right-to-left and the stage question in Arabic', async ({ page }) => {
  await page.goto('/r/ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByText('لم تتم مراجعة هذه الترجمة بعد.')).toBeVisible()
  await shot(page, 'journey-arabic-start')

  await page.getByRole('button', { name: 'ابدأ' }).click()
  await expect(page).toHaveURL(/\/r\/ar\/v\/SLT-/)
  await expect(page.getByRole('heading', { name: 'بماذا تحتاج إلى مساعدة؟' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await shot(page, 'journey-arabic')
})
