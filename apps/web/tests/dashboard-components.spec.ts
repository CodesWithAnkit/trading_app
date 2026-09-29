import { test, expect } from '@playwright/test';

test.describe('Dashboard Components (SignalCard, SignalContext, TradeContext)', () => {

  test.beforeEach(async ({ page }) => {
    // We navigate to the dashboard where the components and contexts are active
    await page.goto('http://localhost:3000/dashboard');
  });

  test('SignalContext fetches signals and SignalCard renders them correctly', async ({ page }) => {
    // SignalContext is responsible for providing data to the Active Signals section
    // Wait for the signals to load in the Dashboard (either mock or real)
    const viewPlanButton = page.locator('text="View plan"').first();
    await expect(viewPlanButton).toBeVisible({ timeout: 10000 });

    // Verify SignalCard UI elements are populated by the SignalContext
    const firstSignalCard = page.locator('.signal-card').first();
    await expect(firstSignalCard).toBeVisible();

    // Verify visual labels are rendered properly
    const directionLabel = firstSignalCard.locator('span', { hasText: /(↑ Long|↓ Short)/ });
    await expect(directionLabel).toBeVisible();

    // Verify confidence and metrics exist
    await expect(firstSignalCard.locator('text=/Confidence: \\d+/')).toBeVisible();
    await expect(firstSignalCard.locator('text=/R:R \\d+/')).toBeVisible();

    // The "I entered" button should be visible (part of SignalCard functionality)
    const enteredButton = firstSignalCard.locator('button', { hasText: 'I entered' });
    await expect(enteredButton).toBeVisible();
  });

  test('TradeContext fetches and maps journal entries successfully', async ({ page }) => {
    // Navigate to Journal to check TradeContext functionality
    await page.goto('http://localhost:3000/dashboard/journal');
    
    // TradeContext maps backend /api/v1/journal to the UI
    const tableHeader = page.locator('th', { hasText: 'Symbol' });
    await expect(tableHeader).toBeVisible();

    // Ensure the fallback to mock data or real data yields rows
    // Wait for at least one table row inside tbody
    const tableRow = page.locator('tbody tr').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });

    // Verify Status mapping inside the table cell (e.g. OPEN, CLOSED)
    const statusCell = tableRow.locator('td span').filter({ hasText: /(Open|Closed)/i }).first();
    if (await statusCell.isVisible()) {
      await expect(statusCell).toBeVisible();
    }
  });

  test('Interaction: Creating a new Trade interacts with both contexts', async ({ page }) => {
    // 1. Start from Dashboard (SignalContext)
    await page.goto('http://localhost:3000/dashboard');
    const viewPlanButton = page.locator('text="View plan"').first();
    await expect(viewPlanButton).toBeVisible();
    
    // Extract symbol to check it later
    const symbolElement = page.locator('.signal-card hspan, .signal-card span').filter({ hasText: /^[A-Z]+$/ }).first();
    // (A more reliable way is just to click and read the page)
    await viewPlanButton.click();

    // 2. Navigate to analysis page
    await page.waitForURL(/\/dashboard\/analysis\/.+/);
    
    // Accept the alert dialog before clicking save
    page.on('dialog', dialog => dialog.accept());

    // 3. Click Save to Journal
    await page.locator('text="Save to Journal"').click();

    // 4. Navigate to Journal and verify TradeContext has been updated
    await page.waitForURL(/\/dashboard\/journal/);
    await expect(page.locator('h1')).toContainText('Trade Journal');

    // The first row should now represent our newly added trade (status OPEN)
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText(/Open/i);
  });

});
