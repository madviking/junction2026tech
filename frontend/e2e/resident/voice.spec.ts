import { readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// Voice in the real resident journey (feature `voice`, used by `journey`). Runs against the
// running app with the resident project: 375 px, microphone allowed. The recorded answer is
// the first fixture in backend/voice/fixtures (en-new-lump.wav: "I have found a new lump in
// my breast"), see installFixtureMicrophone.
// Live provider calls per run: cached TTS clips (generated once, then served from the
// database), one ~4 s speech-to-text request and one card-matching call.

const proof = (name: string) => `../docs/proof/2026-11-14/voice-${name}.png`

const fixtureDir = path.resolve(import.meta.dirname, '../../../backend/voice/fixtures')
const micWav =
  process.env.E2E_MIC_WAV ||
  path.join(fixtureDir, readdirSync(fixtureDir).filter((f) => f.endsWith('.wav')).sort()[0]!)

/**
 * The microphone for a recording test. Default: the same WAV fixture played into the page's
 * getUserMedia through Web Audio, because Chrome's fake audio capture needs the host app's
 * microphone permission and otherwise hangs getUserMedia (and with it the browser's audio
 * service), which is the case on our macOS dev hosts. Set E2E_CHROME_FAKE_MIC=1 to use
 * Chrome's own fake capture (playwright.config.ts) where it works. MediaRecorder, the upload,
 * speech-to-text and card matching stay real either way.
 */
async function installFixtureMicrophone(page: Page): Promise<string> {
  if (process.env.E2E_CHROME_FAKE_MIC === '1') return 'chrome fake capture'
  await page.route('**/__e2e__/mic.wav', (route) => route.fulfill({ path: micWav, contentType: 'audio/wav' }))
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext()
      const buffer = await ctx.decodeAudioData(await (await fetch('/__e2e__/mic.wav')).arrayBuffer())
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const destination = ctx.createMediaStreamDestination()
      source.connect(destination)
      source.start()
      return destination.stream
    }
  })
  return 'fixture through Web Audio'
}

/** `/` → English → Start → the describe stage of a new visit. */
async function openDescribeStage(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/r\/en\/v\//)
  await expect(page.getByRole('heading', { level: 2, name: 'What do you need help with?' })).toBeVisible()
}

/** The ChoiceCard wrapper (main button + trailing slot) whose main button has this name. */
const card = (page: Page, name: string) =>
  page.locator('div').filter({ has: page.getByRole('button', { name, exact: true }) }).last()

const SYMPTOM_OUTCOME = 'I have a symptom that worries me'
const LUMP = 'A new lump or swelling'

test.describe('voice in the journey', () => {
  test('a describe-stage card plays its audio', async ({ page }) => {
    await openDescribeStage(page)
    const play = card(page, SYMPTOM_OUTCOME).getByRole('button', { name: 'Listen' })
    await expect(play).toBeVisible()

    const blob = page.waitForResponse((r) => r.url().includes('/api/voice/blob/') && r.request().method() === 'GET')
    await play.click()
    const response = await blob
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^audio\//)

    const stop = card(page, SYMPTOM_OUTCOME).getByRole('button', { name: 'Stop listening' })
    await expect(stop).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: proof('playing'), fullPage: true })

    await stop.click()
    await expect(play).toHaveAttribute('aria-pressed', 'false')
  })

  test('a recorded answer is matched to the lump card and read back', async ({ page }) => {
    const mic = await installFixtureMicrophone(page)
    test.info().annotations.push({ type: 'microphone', description: mic })
    // Hold the real request briefly so the processing state can be captured; not a mock.
    await page.route('**/api/voice/transcribe', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })

    await openDescribeStage(page)
    await page.getByRole('button', { name: SYMPTOM_OUTCOME, exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'What worries you?' })).toBeVisible()

    await page.getByRole('button', { name: 'Tap to speak' }).click()
    const stop = page.getByRole('button', { name: /^Recording/ })
    await expect(stop).toBeVisible()
    await page.waitForTimeout(4000)
    await expect(page.getByText(/^0:0[3-5]$/)).toBeVisible()
    await page.screenshot({ path: proof('recording'), fullPage: true })

    const transcribed = page.waitForResponse((r) => r.url().includes('/api/voice/transcribe'))
    await stop.click()
    await expect(page.getByRole('button', { name: 'Listening to your answer' })).toBeVisible()
    await page.screenshot({ path: proof('processing'), fullPage: true })

    const response = await transcribed
    expect(response.status(), `${mic}: ${await response.text()}`).toBe(200)
    const sent = response.request().postDataJSON() as { lang: string; audioBase64: string; mime: string }
    expect(sent.lang).toBe('en')
    expect(sent.mime).toMatch(/^audio\/webm/)
    expect(sent.audioBase64.length).toBeGreaterThan(1000)
    const transcript = (await response.json()) as { text: string; lang: string }
    expect(transcript.text).toMatch(/lump/i)

    const readBack = page.getByRole('group', { name: `Did you mean: ${LUMP}?` })
    await expect(readBack).toBeVisible({ timeout: 30_000 })
    await expect(readBack.getByRole('button', { name: 'Listen' })).toBeVisible()
    await page.screenshot({ path: proof('readback'), fullPage: true })

    await readBack.getByRole('button', { name: 'Yes' }).click()
    await expect(page.getByRole('button', { name: LUMP, exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
})
