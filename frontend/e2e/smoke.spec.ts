import { expect, test } from '@playwright/test'

test('projects page loads and reports the API as online', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(page.getByTestId('api-status')).toHaveText('Online')
})

test('project pages render for the seeded demo project', async ({ page }) => {
  await page.goto('/projects')

  const card = page.getByRole('main').getByRole('link', {
    name: /Beacon Capstone/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')
  await card.click()

  await expect(page.getByText('Overall progress')).toBeVisible()
  await expect(page.getByText('Team workload')).toBeVisible()

  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible()
  await expect(page.getByText('Blocked by BCN-3')).toBeVisible()

  await page.getByRole('link', { name: 'Timesheet', exact: true }).click()
  await expect(page.getByText('Daily total')).toBeVisible()
  await page.getByRole('button', { name: 'Previous week' }).click()
  await page.getByRole('tab', { name: 'Time log' }).click()
  await expect(
    page.getByText('Sprint planning meeting with the team.'),
  ).toBeVisible()
})
