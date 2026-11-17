import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

test('filtro de status fica na URL e sobrevive ao reload', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/relatorios');
  await expect(page.getByRole('region', { name: 'Totais' })).toBeVisible();
  await page.getByLabel('Status').selectOption('CANCELLED');
  await expect(page).toHaveURL(/status=CANCELLED/);
  await page.reload();
  await expect(page.getByLabel('Status')).toHaveValue('CANCELLED');
});

test('user não vê o filtro de proprietário e ignora ?dono= alheio', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/relatorios?dono=qualquer-outro');
  await expect(page.getByLabel('Proprietário')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Provas recentes' }).getByText('PROVA E2E USER A')).toBeVisible();
});
