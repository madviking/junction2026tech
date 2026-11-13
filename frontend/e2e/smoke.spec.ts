import { expect, test } from '@playwright/test'

// Real app, real backend: proves the shell renders and the API round trip works.
test('home shows live service health', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Service health' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'postgres' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'redis' })).toBeVisible()
})
