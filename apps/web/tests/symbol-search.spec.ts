import { test, expect } from '@playwright/test';

// Spec 0012: type part of a symbol, pick it, land on the stock's page.
// The watched list is stubbed so this runs any time of day.

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/scanner/universe', route =>
    route.fulfill({ json: { data: ['E2EALPHA', 'E2EBETA', 'M&M'].map(symbol => ({ symbol })) } })
  );
});

test('typing and pressing Enter opens the stock\'s market page (AC-2, AC-5)', async ({ page }) => {
  await page.goto('/dashboard');
  const box = page.getByRole('combobox', { name: 'Search F&O stocks' });
  await box.click();
  await box.fill('e2ea');

  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toContainText('E2EALPHA');
  await box.press('Enter');

  await expect(page).toHaveURL(/\/dashboard\/markets\/E2EALPHA$/);
  await expect(box).toHaveValue('');
});

test('Cmd/Ctrl+K focuses search and a click opens an encoded symbol (AC-5, AC-6)', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('ControlOrMeta+k');
  const box = page.getByRole('combobox', { name: 'Search F&O stocks' });
  await expect(box).toBeFocused();

  await box.fill('m&');
  await page.getByRole('option', { name: /M&M/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/markets\/M%26M$/);
});

test('an unknown symbol shows the no match message (AC-4)', async ({ page }) => {
  await page.goto('/dashboard');
  const box = page.getByRole('combobox', { name: 'Search F&O stocks' });
  await box.click();
  await box.fill('zzzz');
  await expect(page.getByText('No F&O stock matches "zzzz"')).toBeVisible();
});
