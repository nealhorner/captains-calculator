import { test, expect, Page } from '@playwright/test';

// Covers the app's core workflow: add a target product, pick the building and
// recipe that make it, and say how much you want per 60 seconds. The chain is
// then sized to match. This is the primary thing the app is for, so it's the
// one flow that must never silently break.

const firstDrawerCard = (page: Page) =>
  page.locator('.mantine-Drawer-content .mantine-Card-root').first();

/** Walks the setup flow: product, then building, then recipe. */
const addTarget = async (page: Page) => {
  await page.getByRole('button', { name: 'Add Target Product' }).click();

  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Product')).toBeVisible();
  await firstDrawerCard(page).click();

  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Production Building')).toBeVisible();
  await firstDrawerCard(page).click();

  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Recipe')).toBeVisible();
  await firstDrawerCard(page).click();

  await page.getByRole('button', { name: 'Done' }).click();
};

test('build a production chain by adding a target product', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Production Targets')).toBeVisible();

  await addTarget(page);

  // A node for the chosen recipe appears on the production graph.
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  // Its costs are rolled up into the results summary panel.
  await expect(page.getByText('Buildings', { exact: true })).toBeVisible();
  await expect(page.getByText('Targets (60s)', { exact: true })).toBeVisible();
});

test('changing the target volume re-sizes the chain', async ({ page }) => {
  await page.goto('/');
  await addTarget(page);

  const volume = page.getByLabel('Target output');
  const initial = Number(await volume.inputValue());
  const doubled = initial * 2;

  await volume.fill(String(doubled));
  await volume.blur();

  // The summary is driven by the target, so it has to follow the new volume.
  await expect(page.getByText('Targets (60s)', { exact: true })).toBeVisible();
  // Exact match: a substring could hit a longer number in another row.
  await expect(page.locator('td', { hasText: new RegExp(`^${doubled}$`) }).first()).toBeVisible();
});

test('reloading the page keeps the production chain and its target', async ({ page }) => {
  await page.goto('/');
  await addTarget(page);

  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  const volume = await page.getByLabel('Target output').inputValue();

  await page.reload();

  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  // The target has to survive too — without it a restored chain could not be
  // re-sized, which is the point of the feature.
  await expect(page.getByLabel('Target output')).toHaveValue(volume);
});

test('removing a target clears its chain', async ({ page }) => {
  await page.goto('/');
  await addTarget(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  await page.getByRole('button', { name: 'Remove target' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove Target' }).click();

  await expect(page.locator('.react-flow__node')).toHaveCount(0);
});
