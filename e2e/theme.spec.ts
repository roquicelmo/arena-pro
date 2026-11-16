import { expect, test } from '@playwright/test';

test('identidade Arena aplicada', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^Arena Pro/);
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { bg: style.backgroundColor, font: style.fontFamily };
  });
  expect(body.bg).toBe('rgb(247, 243, 236)');
  expect(body.font).toMatch(/Barlow/);
});
