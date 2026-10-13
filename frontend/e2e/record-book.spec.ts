import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

// Uses the second demo group so the BCN record book stays as seeded.
test('online update is certified with a typed signature and printed', async ({
  page,
}) => {
  const summary = `Playwright update ${Date.now()}`

  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Campus Navigator/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')

  // A student records an online update.
  await actAs(page, 'Dana Student')
  await card.click()
  await page.getByRole('link', { name: 'Record book', exact: true }).click()
  const recordBookUrl = page.url()
  await page.getByRole('button', { name: 'Add entry' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Online update')).toBeChecked()
  await expect(dialog.getByText('Contributors')).toBeVisible()
  await dialog.getByLabel('Discussion and progress').fill(summary)
  await dialog.getByRole('button', { name: 'Add entry' }).click()
  await expect(dialog).toBeHidden()
  const entry = page.getByRole('article').filter({ hasText: summary })
  await expect(entry).toContainText('Awaiting supervisor')
  await expect(entry).toContainText('Awaiting signature')

  // The supervisor saves a typed signature.
  await actAs(page, 'Dr. Silva (Supervisor)')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'My signature' }).click()
  await dialog.getByRole('tab', { name: 'Type' }).click()
  await dialog.getByLabel('Full name').fill('P. Silva')
  await expect(dialog.getByTestId('typed-signature-preview')).toHaveText(
    'P. Silva',
  )
  await dialog.getByRole('button', { name: /(Save|Replace) signature/ }).click()
  await expect(dialog).toBeHidden()

  // ...and certifies the entry from the review queue.
  await page.goto('/reviews')
  const queued = page.getByRole('article').filter({ hasText: summary })
  await queued.getByRole('button', { name: 'Sign and certify' }).click()
  await expect(dialog.getByAltText('Your signature')).toBeVisible()
  await dialog.getByLabel('Remarks').fill('Good progress')
  await dialog.getByRole('button', { name: 'Sign and certify' }).click()
  await expect(dialog).toBeHidden()
  await expect(queued).toHaveCount(0)

  // Certified entries are locked for students and carry the signature.
  await actAs(page, 'Dana Student')
  await page.goto(recordBookUrl)
  await expect(entry).toContainText('Certified')
  await expect(entry.getByRole('img', { name: /Signature of/ })).toBeVisible()
  await expect(entry.getByRole('button', { name: /Actions for/ })).toHaveCount(
    0,
  )

  // The print view lays out the paper book with the stamped signature.
  await page.goto(`${recordBookUrl}/print`)
  await expect(
    page.getByText('Supervisor meeting record book', { exact: true }),
  ).toBeVisible()
  const slot = page.getByTestId('print-meeting').filter({ hasText: summary })
  await expect(slot).toContainText('Good progress')
  await expect(
    slot.getByRole('img', { name: /Supervisor's signature/ }),
  ).toBeVisible()
  await expect(page.getByTestId('print-empty-slot').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Print / Save as PDF' }),
  ).toBeEnabled()
})
