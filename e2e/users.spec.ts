import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

test('admin cria um usuário e o vê na lista', async ({ page }, testInfo) => {
  const name = `USUARIO NOVO ${testInfo.project.name}`;
  const email = `novo.${testInfo.project.name}@sorteios.test`;
  await loginAs(page, 'admin');
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo usuário' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('E-mail').fill(email);
  await dialog.getByLabel('Senha').fill('curta');
  await dialog.getByRole('button', { name: 'Salvar usuário' }).click();
  await expect(dialog.getByText('A senha precisa de pelo menos 8 caracteres.')).toBeVisible();
  await expect(dialog.getByLabel('Nome')).toHaveValue(name);
  await dialog.getByLabel('Senha').fill('senha-local-123');
  await dialog.getByRole('button', { name: 'Salvar usuário' }).click();
  await expect(page.getByText('Usuário criado.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Usuários' }).getByText(name)).toBeVisible();
});

test('manager não cria usuários e vê as solicitações', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo usuário' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Solicitações pendentes' })).toBeVisible();
});
