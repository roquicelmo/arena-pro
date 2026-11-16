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

test('cadastro rápido cria o atleta e o mostra na lista sem recarregar', async ({ page }, testInfo) => {
  const name = `ATLETA AVULSO ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/sorteio-avulso');
  await page.getByRole('button', { name: /novo inscrito/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
});
