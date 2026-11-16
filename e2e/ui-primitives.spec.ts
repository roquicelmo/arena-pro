import { expect, test } from '@playwright/test';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

test('vitrine de primitivas sem erros e sem scroll horizontal', async ({ page }, testInfo) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/dev/ui');
  await expect(page.getByRole('heading', { name: 'Vitrine de componentes' })).toBeVisible();

  await page.getByRole('button', { name: 'Abrir confirmação' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abrir confirmação' })).toBeFocused();

  await page.getByRole('button', { name: 'Mostrar toast' }).click();
  await expect(page.getByText('Tudo certo')).toBeVisible();

  expect(await hasNoHorizontalScroll(page)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('vitrine.png'), fullPage: true });
  expect(errors()).toEqual([]);
});

test('botões de destaque usam texto claro sobre o acento', async ({ page }) => {
  await page.goto('/dev/ui');
  for (const name of ['Principal', 'Excluir']) {
    const color = await page.getByRole('button', { name, exact: true }).evaluate((el) => getComputedStyle(el).color);
    expect(color, name).toBe('rgb(255, 255, 255)');
  }
});
