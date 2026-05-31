import { test, expect } from '@playwright/test';

test.describe('Backend Selection', () => {
  test('can select backend when creating mission', async ({ page }) => {
    await page.goto('/');

    const newMissionButton = page.getByRole('button', { name: /New\s+Mission/i });
    await expect(newMissionButton).toBeVisible();
    await newMissionButton.click();

    const backendSelect = page.getByText('Backend').locator('..').locator('select');
    await expect(backendSelect).toBeVisible();

    const options = await backendSelect.locator('option').allTextContents();
    expect(options.some((opt) => opt.toLowerCase().includes('opencode'))).toBeTruthy();
    expect(options.some((opt) => opt.toLowerCase().includes('claude'))).toBeTruthy();

    await backendSelect.selectOption('claudecode');
    await expect(backendSelect).toHaveValue('claudecode');
  });
});
