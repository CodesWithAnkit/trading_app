import { test, expect } from '@playwright/test';

test.describe('Dashboard UI Validation', () => {
  test('Dashboard loads the correct layout components', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. Dashboard Header & Greeting
    await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
    await expect(page.getByText('Verified Plan')).toBeVisible();

    // 2. Data Freshness & State Switcher
    await expect(page.getByText('Market data is')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulated' })).toBeVisible();

    // 3. Metric Cards
    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid.getByText('Today\'s Net P&L')).toBeVisible();
    await expect(metricsGrid.getByText('Active Signals')).toBeVisible();
    await expect(metricsGrid.getByText('Open Trades')).toBeVisible();
    await expect(metricsGrid.getByText('Session Win Rate')).toBeVisible();

    // 4. Active Signals Module
    const activeSignalsSection = page.locator('h2:has-text("Active Signals")').locator('..').locator('..');
    // Check filters
    await expect(activeSignalsSection.getByRole('button', { name: /All/ })).toBeVisible();
    await expect(activeSignalsSection.getByRole('button', { name: /Long/ })).toBeVisible();
    await expect(activeSignalsSection.getByRole('button', { name: /Short/ })).toBeVisible();

    // 5. Open Trades Matrix
    await expect(page.getByRole('heading', { name: /Open Journaled Trades/ })).toBeVisible();
    await expect(page.getByText('Symbol', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bias', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Unrealized', { exact: true }).first()).toBeVisible();
    
    // 6. Today's Trade Log
    await expect(page.getByRole('heading', { name: "Today's Trade Log" })).toBeVisible();
  });
});
