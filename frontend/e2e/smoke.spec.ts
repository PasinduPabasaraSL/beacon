import { expect, test } from '@playwright/test'

test('dashboard loads and reports the API as online', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByTestId('api-status')).toHaveText('Online')
})
