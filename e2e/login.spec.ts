import { expect, test } from '@playwright/test';
import { TEST_USERS } from './fixtures/users';
import { loginAs } from './helpers/auth';
import { trackConsoleErrors } from './helpers/console';

test('visitante em / é levado para /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('senha errada mostra erro no formulário sem erros de console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(TEST_USERS.userA.email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /inválid/i })).toBeVisible();
  await expect(page.locator('form').getByRole('alert')).toContainText(/inválid/i);
  await expect(page).toHaveURL(/\/login$/);
  expect(errors()).toEqual([]);
});

test('usuário logado que abre /login volta para o painel', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
});

test('alterna para solicitação de acesso', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Ainda não tenho acesso' }).click();
  await expect(page.getByLabel('Telefone')).toBeVisible();
});

test('usuário bloqueado com senha correta vê erro no formulário sem erros de console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(TEST_USERS.blocked.email);
  await page.getByLabel('Senha', { exact: true }).fill(TEST_USERS.blocked.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText(/inválid/i);
  await expect(page).toHaveURL(/\/login$/);
  expect(errors()).toEqual([]);
});

test('login com next relativo volta para a página de origem; next externo é ignorado', async ({ page }) => {
  for (const [next, expected] of [['/provas', /\/provas$/], ['//evil.com', /localhost:\d+\/$/]] as const) {
    await page.context().clearCookies();
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.getByLabel('E-mail').fill(TEST_USERS.userA.email);
    await page.getByLabel('Senha', { exact: true }).fill(TEST_USERS.userA.password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(expected);
  }
});
