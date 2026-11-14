import { expect, test } from '@playwright/test'
import { adminCredentials, proof } from './helpers'

// (j) The admin area needs a session: /admin without one goes to the sign-in page.
// No traces: they would record the typed password.
test.use({ trace: 'off' })

test.describe('admin: sign-in guard', () => {
  test('/admin without a session redirects to sign-in, and a wrong password is refused', async ({ page }) => {
    await page.goto('/admin/content')
    await expect(page).toHaveURL(/\/admin\/sign-in\?next=%2Fadmin%2Fcontent$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/sign-in\?next=%2Fadmin$/)
    await page.screenshot({ path: proof('sign-in'), fullPage: true })

    await page.getByLabel('Email').fill(adminCredentials().email)
    await page.getByRole('textbox', { name: 'Password' }).fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Wrong email or password.')).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/sign-in/)
  })
})
