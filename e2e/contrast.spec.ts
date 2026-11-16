import { expect, test, type Page } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

const contrastOf = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const luminance = ([r, g, b]: number[]) => {
      const channel = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    return Array.from(document.querySelectorAll<HTMLElement>(sel))
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const style = getComputedStyle(el);
        const [fg, bg] = [luminance(parse(style.color)), luminance(parse(style.backgroundColor))];
        const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        return { text: el.textContent?.trim().slice(0, 30) ?? '', ratio: Number(ratio.toFixed(2)) };
      });
  }, selector);

const SELECTORS: Record<string, string> = {
  '/': '.bg-accent',
  '/provas': '.bg-accent, [class*="bg-[#e87900]"], .bg-amber-500, .bg-amber-600',
  '/atletas': '.bg-accent, [class*="bg-[#e87900]"], .bg-amber-500, .bg-amber-600',
};

for (const [path, selector] of Object.entries(SELECTORS)) {
  test(`texto sobre superfícies de destaque mantém contraste AA em ${path}`, async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await contrastOf(page, selector);
    expect(results.length).toBeGreaterThan(0);
    for (const item of results) expect(item.ratio, item.text).toBeGreaterThanOrEqual(4.5);
  });
}

// Superfícies laranja/âmbar antigas do RunsTable, agora em /provas/[id]/pista.
test('texto sobre superfícies de destaque mantém contraste AA na pista da prova', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: TEST_EVENTS.userA }).getByRole('link', { name: 'Detalhes' }).click();
  const tabs = page.getByRole('navigation', { name: 'Seções da prova' });
  await tabs.getByRole('link', { name: 'Sorteio', exact: true }).click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  await expect(page.getByPlaceholder('0.00').first()).toBeVisible();
  const results = await contrastOf(page, '.bg-accent, .bg-amber-500, .bg-amber-600, [class*="bg-[#e87900]"]');
  expect(results.length).toBeGreaterThan(0);
  for (const item of results) expect(item.ratio, item.text).toBeGreaterThanOrEqual(4.5);
});
