import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('Desktop layout shows sidebar and hides bottom nav', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');

    // Sidebar should be visible (look for its unique text/role)
    const sidebar = page.locator('aside').filter({ hasText: 'Intraday Tracker' });
    await expect(sidebar).toBeVisible();

    // BottomNav should be hidden
    // We can identify BottomNav by its fixed bottom container with links
    const bottomNav = page.locator('div.fixed.bottom-0').filter({ hasText: 'Dashboard' }).filter({ hasText: 'Signals' });
    await expect(bottomNav).toBeHidden();
  });

  test('Mobile layout hides sidebar and shows bottom nav', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Sidebar should be hidden
    const sidebar = page.locator('aside').filter({ hasText: 'Intraday Tracker' });
    await expect(sidebar).toBeHidden();

    // BottomNav should be visible
    const bottomNav = page.locator('div.fixed.bottom-0').filter({ hasText: 'Dashboard' }).filter({ hasText: 'Signals' });
    await expect(bottomNav).toBeVisible();

    // Verify all 5 links are in the bottom nav
    await expect(bottomNav.getByText('Dashboard')).toBeVisible();
    await expect(bottomNav.getByText('Signals', { exact: true })).toBeVisible();
    await expect(bottomNav.getByText('Trades', { exact: true })).toBeVisible();
    await expect(bottomNav.getByText('Journal', { exact: true })).toBeVisible();
    await expect(bottomNav.getByText('Settings')).toBeVisible();
  });
});
