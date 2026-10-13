import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

function entryRow(page: Page, description: string) {
  return page.getByRole('row').filter({ hasText: description })
}

test('log, edit, review and delete a contribution', async ({ page }) => {
  const description = `Playwright check ${Date.now()}`

  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Beacon Capstone/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')
  await card.click()
  await page.getByRole('link', { name: 'Contributions', exact: true }).click()

  // A student logs hours for this week.
  await actAs(page, 'Bob Student')
  await page.getByRole('button', { name: 'Log hours' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Hours').fill('2.5')
  await dialog.getByLabel('What did you work on?').fill(description)
  await dialog.getByRole('button', { name: 'Log hours' }).click()
  await expect(dialog).toBeHidden()
  await expect(entryRow(page, description)).toContainText('2.5h')
  await expect(entryRow(page, description)).toContainText('Pending review')

  // ...and corrects the hours.
  await entryRow(page, description)
    .getByRole('button', { name: 'Entry actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await dialog.getByLabel('Hours').fill('3')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(entryRow(page, description)).toContainText('3h')

  // The supervisor asks for changes.
  await actAs(page, 'Dr. Silva (Supervisor)')
  await expect(page.getByRole('button', { name: 'Log hours' })).toBeDisabled()
  await entryRow(page, description)
    .getByRole('button', { name: 'Entry actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Request changes' }).click()
  await dialog.getByLabel('What should be changed?').fill('Add the PR link')
  await dialog.getByRole('button', { name: 'Request changes' }).click()
  await expect(entryRow(page, description)).toContainText('Changes requested')

  // The student sees the feedback when editing, then removes the entry.
  await actAs(page, 'Bob Student')
  await entryRow(page, description)
    .getByRole('button', { name: 'Entry actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await expect(dialog).toContainText('Add the PR link')
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await entryRow(page, description)
    .getByRole('button', { name: 'Entry actions' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(entryRow(page, description)).toHaveCount(0)
})
