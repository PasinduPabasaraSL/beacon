import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

test('fill in, submit, review and recall a weekly timesheet', async ({
  page,
}) => {
  const description = `Playwright timesheet ${Date.now()}`

  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Beacon Capstone/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')
  await card.click()
  await page.getByRole('link', { name: 'Timesheet', exact: true }).click()
  await actAs(page, 'Alice Lead')

  // Add a row and fill in Monday, which is never in the future.
  await page.getByRole('button', { name: 'Add row' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Description').fill(description)
  await dialog.getByRole('button', { name: 'Add row' }).click()
  await expect(dialog).toBeHidden()

  const row = page.getByRole('row').filter({ hasText: description })
  const monday = page.getByRole('textbox', {
    name: `${description} hours on Monday`,
    exact: false,
  })
  await monday.fill('1:30')
  await monday.press('Enter')
  await expect(monday).toHaveValue('1.5')
  await expect(row).toContainText('1.5h')

  // A note on the day cell.
  await page
    .getByRole('button', {
      name: new RegExp(`^Add note for ${description} on Monday`),
    })
    .click()
  await page.getByRole('textbox', { name: 'Note' }).fill('Drafted the API')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`^Note for ${description} on Monday`),
    }),
  ).toBeVisible()

  // The flat time log shows the cell with its note.
  await page.getByRole('tab', { name: 'Time log' }).click()
  await expect(
    page.getByRole('row').filter({ hasText: 'Drafted the API' }),
  ).toContainText('1.5h')
  await page.getByRole('tab', { name: 'Timesheet' }).click()

  // Submitting locks the week.
  await page.getByRole('button', { name: /^(Submit|Resubmit) week$/ }).click()
  await expect(page.getByText(/waiting for your supervisor/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add row' })).toHaveCount(0)

  // The supervisor opens the week from the team view and asks for changes.
  await actAs(page, 'Dr. Silva (Supervisor)')
  await page.getByRole('tab', { name: 'Team' }).click()
  await page
    .getByRole('button', { name: "Open Alice Lead's timesheet" })
    .click()
  await page.getByRole('button', { name: 'Request changes' }).click()
  await dialog.getByLabel('What should be changed?').fill('Name the task')
  await dialog.getByRole('button', { name: 'Request changes' }).click()
  await expect(dialog).toBeHidden()

  // The student sees the feedback, resubmits, then recalls to edit again.
  await actAs(page, 'Alice Lead')
  await expect(
    page.getByRole('status').filter({ hasText: 'Name the task' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Resubmit week' }).click()
  await page.getByRole('button', { name: 'Recall' }).click()
  await expect(page.getByText('Draft', { exact: true })).toBeVisible()

  // Clean up.
  await page
    .getByRole('button', { name: `Row actions for ${description}` })
    .click()
  await page.getByRole('menuitem', { name: 'Delete row' }).click()
  await dialog.getByRole('button', { name: 'Delete row' }).click()
  await expect(row).toHaveCount(0)
})
