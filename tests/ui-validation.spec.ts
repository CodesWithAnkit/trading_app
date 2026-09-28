import { test, expect } from '@playwright/test';

test.describe('Dashboard UI Validation', () => {
  test('Dashboard loads the correct layout components', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 1. Dashboard Header & Greeting
    await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible();
    await expect(page.getByText('Verified Plan')).toBeVisible();

    // 2. Data Freshness & State Switcher
    await expect(page.getByText('Market status: SIMULATED')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulated' })).toBeVisible();

    // 3. Metric Cards
    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid.getByText('TODAY\'S NET P&L')).toBeVisible();
    await expect(metricsGrid.getByText('ACTIVE SIGNALS')).toBeVisible();
    await expect(metricsGrid.getByText('OPEN TRADES (JOURNALED)')).toBeVisible();
    await expect(metricsGrid.getByText('SESSION WIN RATE')).toBeVisible();

    // 4. Active Signals Module
    const activeSignalsSection = page.locator('h2:has-text("Active Signals")').locator('..').locator('..');
    // Check filters
    await expect(activeSignalsSection.getByRole('button', { name: /All/ })).toBeVisible();
    await expect(activeSignalsSection.getByRole('button', { name: /Long/ })).toBeVisible();
    await expect(activeSignalsSection.getByRole('button', { name: /Short/ })).toBeVisible();

    // 5. Open Trades Matrix
    await expect(page.getByRole('heading', { name: /Open Journaled Trades/ })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SYMBOL & SETUP' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'BIAS' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'UNREALIZED P&L' })).toBeVisible();
    
    // 6. Today's Trade Log
    await expect(page.getByRole('heading', { name: 'Today\'s Trade Log' })).toBeVisible();
  });
});
