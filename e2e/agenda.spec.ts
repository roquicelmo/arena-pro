import { expect, test } from '@playwright/test';
import { TEST_ARENAS, TEST_EVENTS, TEST_USERS } from './fixtures/users';
import { loginAs } from './helpers/auth';

test('agenda do user A mostra a prova dele e não a do B', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/agenda');
  const upcoming = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: 'Próximas provas' }) });
  await expect(upcoming.getByText(TEST_EVENTS.userA)).toBeVisible();
  await expect(page.getByText(TEST_EVENTS.userB)).toHaveCount(0);
});

test('prova cancelada não aparece na agenda', async ({ page }, testInfo) => {
  const name = `COPA AGENDA ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova prova' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova prova' });
  await dialog.getByLabel('Nome da prova').fill(name);
  await dialog.getByLabel('Data').fill('2026-12-22');
  await dialog.getByLabel('Arena', { exact: true }).selectOption({ label: `${TEST_ARENAS.userA} · Lagoa da Prata/MG` });
  await dialog.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova criada.')).toBeVisible();
  await page.goto('/agenda');
  await expect(page.getByText(name)).toHaveCount(1);
  await page.goto('/provas');
  await page.getByRole('button', { name: `Cancelar ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar prova' }).click();
  await expect(page.getByText('Prova cancelada.')).toBeVisible();
  await page.goto('/agenda');
  await expect(page.getByRole('heading', { level: 1, name: 'Minha agenda' })).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});

test('painel do manager filtra atletas e provas pelo mesmo dono', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/');
  await page.getByLabel('Proprietário').selectOption({ label: TEST_USERS.userB.name });
  await expect(page).toHaveURL(/dono=/);
  const tile = (label: string) => page.locator('div').filter({ has: page.getByText(label, { exact: true }) }).last();
  await expect(tile('Atletas')).toContainText('2');
  await expect(tile('Provas')).toContainText('1');
  await page.reload();
  await expect(page).toHaveURL(/dono=/);
  await expect(page.getByLabel('Proprietário')).toHaveValue(/.+/);
  await expect(tile('Atletas')).toContainText('2');
  await expect(tile('Provas')).toContainText('1');
});
