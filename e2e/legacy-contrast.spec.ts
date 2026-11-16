import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** Superfícies âmbar legadas (agora terracota) precisam manter texto legível (AA ≥ 4,5:1). */
test('texto sobre o âmbar legado mantém contraste AA no painel', async ({ page }) => {
  await loginAs(page, 'admin');
  const results = await page.evaluate(() => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const luminance = ([r, g, b]: number[]) => {
      const channel = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    return Array.from(document.querySelectorAll<HTMLElement>('.bg-amber-500, .bg-amber-600'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const style = getComputedStyle(el);
        const [fg, bg] = [luminance(parse(style.color)), luminance(parse(style.backgroundColor))];
        const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        return { text: el.textContent?.trim().slice(0, 30) ?? '', ratio: Number(ratio.toFixed(2)) };
      });
  });
  expect(results.length).toBeGreaterThan(0);
  for (const item of results) expect(item.ratio, item.text).toBeGreaterThanOrEqual(4.5);
});
