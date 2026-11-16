import { expect, test } from '@playwright/test';
import { loginAs, openNav } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

for (const [path, heading] of [['/', 'Painel'], ['/provas', 'Provas e arenas'], ['/atletas', 'Atletas'], ['/agenda', 'Minha agenda'], ['/relatorios', 'Relatórios']] as const) {
  test(`${path} abre com título e sem erros`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, 'userA');
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    expect(errors()).toEqual([]);
  });
}

test('atletas do user A aparecem e os do B não', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByText('CABECEIRO A1')).toBeVisible();
  await expect(page.getByText('CABECEIRO B1')).toHaveCount(0);
});

test('/usuarios responde 404 para user e abre para manager', async ({ page }) => {
  await loginAs(page, 'userA');
  const response = await page.goto('/usuarios');
  expect(response?.status()).toBe(404);
  await loginAs(page, 'manager');
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
});

test('cancelar prova pede confirmação e Esc não cancela', async ({ page }) => {
  await loginAs(page, 'userB');
  await page.goto('/provas');
  await page.getByRole('button', { name: /cancelar/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('PROVA E2E USER B')).toBeVisible();
});

test('navegação client-side sem sessão redireciona para o login', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await page.goto('/');
  await page.context().clearCookies();
  await openNav(page, isMobile);
  await page.getByRole('link', { name: 'Atletas', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
