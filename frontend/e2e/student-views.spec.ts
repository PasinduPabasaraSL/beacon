import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

test('weekly check-in, quick log and supervisor review queue', async ({
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

  // Quick log from the check-in card lands on today's cell of the timesheet.
  await page.getByRole('button', { name: 'Log time' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Hours').fill('1.5')
  await dialog.getByLabel('What did you work on?').fill(description)
  await dialog.getByRole('button', { name: 'Log hours' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('link', { name: 'Timesheet' }).first().click()
  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toContainText('1.5h')

  // Supervisors land on the review queue of submitted weeks.
  await actAs(page, 'Dr. Silva (Supervisor)')
  await page.goto('/')
  await expect(page).toHaveURL(/\/reviews$/)
  await expect(
    page.getByRole('heading', { name: 'Weekly timesheets' }),
  ).toBeVisible()
  await expect(
    page.getByText('Sprint planning meeting with the team.'),
  ).toBeVisible()

  // Clean up on the student's timesheet.
  await actAs(page, 'Bob Student')
  await page.goto('/me')
  await page.getByRole('link', { name: 'Timesheet' }).first().click()
  await page
    .getByRole('button', { name: `Row actions for ${description}` })
    .click()
  await page.getByRole('menuitem', { name: 'Delete row' }).click()
  await dialog.getByRole('button', { name: 'Delete row' }).click()
  await expect(row).toHaveCount(0)
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
