import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

test('sorteio avulso gera corridas com os atletas escolhidos', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'userA');
  await page.goto('/sorteio-avulso');
  await expect(page.getByRole('heading', { level: 1, name: 'Sorteio avulso' })).toBeVisible();
  await page.getByRole('button', { name: /adicionar todos/i }).click();
  await page.getByRole('button', { name: /avançar para cabeceiros/i }).click();
  await page.getByRole('button', { name: /adicionar todos/i }).click();
  await page.getByRole('button', { name: /avançar para configuração/i }).click();
  await page.getByRole('button', { name: /gerar sorteio oficial/i }).click();
  await expect(page.getByPlaceholder('0.00').first()).toBeVisible();
  await expect(page.getByText('CABECEIRO A1').first()).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
  expect(errors()).toEqual([]);
});
