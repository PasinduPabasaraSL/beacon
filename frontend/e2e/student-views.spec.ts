import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

test('weekly check-in, supervisor review queue and feedback loop', async ({
  page,
}) => {
  const description = `Playwright week ${Date.now()}`

  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Beacon Capstone/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')

  // Students land on their week, with the teaching week from the semester.
  await actAs(page, 'Bob Student')
  await page.goto('/')
  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByRole('heading', { name: 'My week' })).toBeVisible()
  await expect(page.getByText(/Week \d+ of \d+/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Log hours' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Hours').fill('1.5')
  await dialog.getByLabel('What did you work on?').fill(description)
  await dialog.getByRole('button', { name: 'Log hours' }).click()
  await expect(dialog).toBeHidden()

  // Supervisors land on the review queue and ask for changes from there.
  await actAs(page, 'Dr. Silva (Supervisor)')
  await page.goto('/')
  await expect(page).toHaveURL(/\/reviews$/)
  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toContainText('Bob Student')
  await row.getByRole('button', { name: 'Entry actions' }).click()
  await page.getByRole('menuitem', { name: 'Request changes' }).click()
  await dialog.getByLabel('What should be changed?').fill('Name the task')
  await dialog.getByRole('button', { name: 'Request changes' }).click()
  await expect(row).toHaveCount(0)

  // The student sees the feedback on their week.
  await actAs(page, 'Bob Student')
  await page.goto('/me')
  const feedback = page.getByRole('listitem').filter({ hasText: description })
  await expect(feedback).toContainText('Name the task')

  // Clean up through the project contributions page.
  await page.goto('/projects')
  await card.click()
  await page.getByRole('link', { name: 'Contributions', exact: true }).click()
  const entry = page.getByRole('row').filter({ hasText: description })
  await entry.getByRole('button', { name: 'Entry actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(entry).toHaveCount(0)
})

test('timeline shows the semester and milestones', async ({ page }) => {
  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Beacon Capstone/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')
  await card.click()
  await page.getByRole('link', { name: 'Timeline', exact: true }).click()

  await expect(page.getByText('Midterm demo')).toBeVisible()
  await expect(page.getByText(/shared by all groups/)).toBeVisible()

  // Only workspace admins edit the semester; students only read it.
  await actAs(page, 'Bob Student')
  await expect(page.getByRole('button', { name: 'Edit semester' })).toHaveCount(
    0,
  )
  await expect(page.getByRole('button', { name: 'Add milestone' })).toHaveCount(
    0,
  )
  await actAs(page, 'Dr. Silva (Supervisor)')
  await expect(
    page.getByRole('button', { name: 'Edit semester' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Add milestone' }),
  ).toBeVisible()
})
