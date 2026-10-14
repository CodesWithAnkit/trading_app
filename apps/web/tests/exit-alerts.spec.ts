import { test, expect, type Page } from '@playwright/test';

// Spec 0010 AC-6: an exit on the live stream raises a toast and moves the plan to "Closed today".
// The SSE stream and the snapshot are stubbed, so this runs any time of day.

const now = new Date().toISOString();
const signal = {
  id: 'e2e-sig-1', symbol: 'E2ESTOCK', exchange: 'NSE', direction: 'LONG', setup: 'VWAP_TREND', status: 'ACTIVE',
  price: 100, entryZone: { low: 99.95, high: 100.05 }, referenceEntry: 100, stop: 99, targets: { t1: 102 },
  confidence: 80, confidenceBand: 'HIGH', createdAt: now, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  rationale: 'Automated Strategy', metrics: { relativeVolume: '1x', trendAlignment: 'Up', volatility: 'Normal', liquidity: 'High', riskReward: '1:2' },
  exitPrice: null, exitAt: null, exitReason: null,
};
const exit = { id: 'e2e-sig-1', symbol: 'E2ESTOCK', setup: 'VWAP_TREND', reason: 'TARGET', exitPrice: 102.1, exitAt: now, pnlPct: 2.1, stale: false };

async function stubScanner(page: Page, events: string) {
  await page.route('**/api/v1/scanner/top-setups**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/scanner/outcomes**', route => route.fulfill({ status: 404, json: { message: 'No signals' } }));
  await page.route('**/api/v1/scanner/stream', route => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    // A long retry keeps the browser from replaying the stub while the test runs.
    body: `retry: 600000\n${events}`,
  }));
}

const sse = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 800 }]) {
  test.describe(`exit alerts at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('a target hit shows an exit toast and moves the plan to Closed today', async ({ page }) => {
      await stubScanner(page, sse('signal:new', signal) + sse('signal:exit', exit));
      await page.goto('/dashboard');

      const toast = page.getByRole('region', { name: 'Exit alerts' }).getByRole('status');
      await expect(toast).toHaveText(/Exit E2ESTOCK: target hit/);
      await expect(toast).toContainText('+2.10%');

      const closed = page.getByTestId('closed-plans');
      await expect(closed).toContainText('Closed today (1)');
      await expect(closed).toContainText('E2ESTOCK');
      await expect(closed).toContainText('Target hit');
    });

    test('the toast can be dismissed with its close button', async ({ page }) => {
      await stubScanner(page, sse('signal:new', signal) + sse('signal:exit', exit));
      await page.goto('/dashboard');

      const region = page.getByRole('region', { name: 'Exit alerts' });
      await expect(region.getByRole('status')).toBeVisible();
      await region.getByRole('button', { name: 'Dismiss' }).click();
      await expect(region.getByRole('status')).toHaveCount(0);
    });
  });
}

test('an open plan with no exit stays active and shows no toast', async ({ page }) => {
  await stubScanner(page, sse('signal:new', signal));
  await page.goto('/dashboard');

  await expect(page.getByText('E2ESTOCK').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Exit alerts' }).getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('closed-plans')).toHaveCount(0);
});
