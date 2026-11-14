import { expect, test } from '@playwright/test'

// Real app, real backend: proves the shell renders and the API round trip works.
test('health page shows live service health', async ({ page }) => {
  await page.goto('/health')

  await expect(page.getByRole('heading', { name: 'Service health' })).toBeVisible()
  await expect(page.getByText('postgres')).toBeVisible()
  await expect(page.getByText('pgvector')).toBeVisible()
})
