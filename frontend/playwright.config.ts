import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Runs against the already running app (backend :8300 + frontend :5300).
// Resident flows at a 375 px phone viewport, admin flows at desktop width.
// The fake microphone plays the first WAV fixture of the voice service, so a
// recorded answer can be tested without a person speaking.
const fixtureDir = path.resolve(import.meta.dirname, '../backend/voice/fixtures')
const micWav = process.env.E2E_MIC_WAV ?? (existsSync(fixtureDir) ? readdirSync(fixtureDir).filter((f) => f.endsWith('.wav')).sort().map((f) => path.join(fixtureDir, f))[0] : undefined)
const mediaArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  ...(micWav ? [`--use-file-for-fake-audio-capture=${micWav}`] : []),
  '--autoplay-policy=no-user-gesture-required',
]

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5300',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'resident',
      testMatch: /resident\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        permissions: ['microphone'],
        launchOptions: { args: mediaArgs },
      },
    },
    {
      name: 'admin',
      testMatch: /admin\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
