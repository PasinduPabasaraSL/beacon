import { expect, test, type Page } from '@playwright/test'

async function actAs(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Acting as user' }).click()
  await page.getByRole('option', { name }).click()
}

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const ORIGINAL_DESCRIPTION =
  'Indoor wayfinding app for the engineering building.'

// Uses the second demo group and puts its profile back afterwards.
test('the team lead edits the project profile and shares it publicly', async ({
  page,
  browser,
}) => {
  const teamName = `Wayfinders ${Date.now()}`

  await page.goto('/projects')
  const card = page.getByRole('main').getByRole('link', {
    name: /Campus Navigator/,
  })
  await expect(card.or(page.getByText('No projects yet'))).toBeVisible()
  test.skip((await card.count()) === 0, 'Demo seed not loaded')

  // Members don't get the settings.
  await actAs(page, 'Eli Student')
  await card.click()
  await page.getByRole('button', { name: 'Project actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Open board' })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Project settings' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')

  // The team lead opens them from the project menu.
  await actAs(page, 'Dana Student')
  await page.getByRole('button', { name: 'Project actions' }).click()
  await page.getByRole('menuitem', { name: 'Project settings' }).click()
  await expect(page).toHaveURL(/\/settings$/)

  await page.getByLabel('Logo image').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(page.getByRole('button', { name: 'Change logo' })).toBeVisible()
  await page.getByLabel('Team name').fill(teamName)
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('## Wayfinding\n\n- [x] Floor plan\n- [ ] Routing')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(
    page.getByRole('tabpanel').getByRole('heading', { name: 'Wayfinding' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Project profile saved')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()

  // The header shows the logo and team name.
  await expect(page.getByRole('main').getByText(teamName)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Campus Navigator' }).locator('img'),
  ).toBeVisible()

  // Anyone with the link sees the public profile.
  const publicLink = page.getByRole('link', { name: 'Public page' })
  const publicUrl = (await publicLink.getAttribute('href'))!
  const visitor = await browser.newPage()
  await visitor.goto(publicUrl)
  await expect(
    visitor.getByRole('heading', { level: 1, name: 'Campus Navigator' }),
  ).toBeVisible()
  await expect(visitor.getByText(teamName).first()).toBeVisible()
  await expect(
    visitor.getByRole('heading', { name: 'Wayfinding' }),
  ).toBeVisible()
  await expect(visitor.getByText('Dana Student')).toBeVisible()
  await expect(visitor.getByText('Team lead')).toBeVisible()

  // Making it private hides it.
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(publicLink).toBeHidden()
  await visitor.reload()
  await expect(
    visitor.getByText('This project profile is private'),
  ).toBeVisible()
  await visitor.close()

  // Put the demo profile back.
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'Remove' }).click()
  await page.getByLabel('Team name').fill('')
  await page.getByRole('tab', { name: 'Write' }).click()
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill(ORIGINAL_DESCRIPTION)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()
  await expect(publicLink).toBeVisible()
})
