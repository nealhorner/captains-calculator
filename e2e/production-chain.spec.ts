import { test, expect } from '@playwright/test';

// Covers the app's core workflow: pick a product, then a building, then a
// recipe for it, which creates a production node on the graph and rolls its
// costs up into the results summary. This is the primary thing the app is
// for, so it's the one flow that must never silently break.
test('build a production chain by selecting product -> building -> recipe', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Production Chain Setup')).toBeVisible();

  // 1. Desired Product
  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Product')).toBeVisible();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();

  // 2. Production Building
  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Production Building')).toBeVisible();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();

  // 3. Production Recipe
  await page.getByRole('button', { name: 'Click To Select' }).click();
  await expect(page.getByText('Select Recipe')).toBeVisible();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();

  // A node for the selected recipe appears on the production graph.
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  // Its costs are rolled up into the results summary panel.
  await expect(page.getByText('Needs', { exact: true })).toBeVisible();
  await expect(page.getByText('Buildings', { exact: true })).toBeVisible();
});

test('reloading the page keeps the production chain (persisted to localStorage)', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Click To Select' }).click();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();
  await page.getByRole('button', { name: 'Click To Select' }).click();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();
  await page.getByRole('button', { name: 'Click To Select' }).click();
  await page.locator('.mantine-Drawer-content .mantine-Card-root').first().click();

  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  await page.reload();

  await expect(page.locator('.react-flow__node')).toHaveCount(1);
});
