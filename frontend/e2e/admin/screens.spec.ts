import { expect, test } from '@playwright/test'
import { proof, signIn } from './helpers'

// Read-only tour of every admin screen, with screenshots. Changes no data
// (opening the drawers does not save anything).
// No traces: they would record the typed password.
test.use({ trace: 'off' })

test.describe('admin: screens', () => {
  test('overview, content, drawer, versions, audio, usage', async ({ page }) => {
    await signIn(page, '/admin')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
    await page.screenshot({ path: proof('overview'), fullPage: true })

    await page.getByRole('link', { name: 'Content' }).click()
    await expect(page.getByRole('heading', { name: 'Texts and draft' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Content texts' })).toBeVisible()
    await page.screenshot({ path: proof('content-list'), fullPage: false })

    await page.getByRole('searchbox', { name: 'Search' }).fill('no_answer.card')
    const row = page.getByRole('row', { name: /contact → Nobody answered · card/ })
    await expect(row).toBeVisible()
    await row.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByLabel('English (en)')).toBeVisible()
    await expect(drawer.locator('[dir="rtl"]').getByRole('textbox')).toBeVisible()
    await page.waitForTimeout(500) // let the drawer finish sliding in
    await page.screenshot({ path: proof('content-drawer'), fullPage: false })
    await page.keyboard.press('Escape')

    await page.getByRole('tab', { name: /Review flags/ }).click()
    await expect(page.getByText(/needs clinical review/).first()).toBeVisible()
    await page.screenshot({ path: proof('content-review-flags'), fullPage: false })

    await page.getByRole('link', { name: 'Versions' }).click()
    await expect(page.getByRole('table', { name: 'Published versions' })).toBeVisible()
    await expect(page.getByText('Live', { exact: true })).toBeVisible()
    await page.screenshot({ path: proof('versions'), fullPage: true })

    await page.getByRole('link', { name: 'Audio' }).click()
    await expect(page.getByRole('table', { name: 'Audio per text' })).toBeVisible()
    await page.screenshot({ path: proof('audio'), fullPage: false })
    await page.getByRole('searchbox', { name: 'Search' }).fill('card.symptom.lump.card')
    await page.getByRole('row', { name: /card\.symptom\.lump\.card/ }).click()
    await expect(page.getByRole('dialog').getByText('An approved human recording always wins')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: proof('audio-drawer'), fullPage: false })
    await page.keyboard.press('Escape')

    await page.getByRole('link', { name: 'Usage and audit' }).click()
    await expect(page.getByText('Total spend')).toBeVisible()
    await expect(page.getByRole('table', { name: 'Audit log' })).toBeVisible()
    await page.screenshot({ path: proof('usage'), fullPage: true })

    // Usable at tablet width: navigation collapses into the menu.
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.getByRole('button', { name: 'Toggle navigation' }).click()
    await page.getByRole('link', { name: 'Content' }).click()
    await expect(page.getByRole('table', { name: 'Content texts' })).toBeVisible()
    await page.screenshot({ path: proof('content-768'), fullPage: false })

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/admin\/sign-in/)
  })
})
