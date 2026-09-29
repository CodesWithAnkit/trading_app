import { test, expect } from '@playwright/test';

test.describe('Component Visual Snapshots', () => {
  test('Dashboard page screenshot', async ({ page }) => {
    await page.goto('/dashboard');
    // wait for network idle to ensure everything is rendered
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
  });

  test('Signals page screenshot', async ({ page }) => {
    await page.goto('/dashboard/signals');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/signals.png', fullPage: true });
  });

  test('Trades page screenshot', async ({ page }) => {
    await page.goto('/dashboard/trades');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/trades.png', fullPage: true });
  });

  test('Performance page screenshot', async ({ page }) => {
    await page.goto('/dashboard/performance');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/performance.png', fullPage: true });
  });

  test('Journal page screenshot', async ({ page }) => {
    await page.goto('/dashboard/journal');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/journal.png', fullPage: true });
  });

  test('Settings page screenshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/settings.png', fullPage: true });
  });
});
