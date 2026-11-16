import { expect, test } from '@playwright/test';
import { loginAs, openNav } from './helpers/auth';

test('menu marca a página atual e navega', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await page.getByRole('link', { name: 'Sorteio avulso' }).click();
  await expect(page).toHaveURL(/\/sorteio-avulso$/);
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Sorteio avulso' })).toHaveAttribute('aria-current', 'page');
});

test('user não vê Usuários', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
});

test('gestor vê Usuários', async ({ page, isMobile }) => {
  await loginAs(page, 'manager');
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(1);
});

test('drawer fecha com Esc e devolve o foco', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'somente mobile');
  await loginAs(page, 'userA');
  const button = page.getByRole('button', { name: 'Abrir menu' });
  await button.click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('sessão apagada leva ao login na próxima navegação', async ({ page, context }) => {
  await loginAs(page, 'userA');
  await context.clearCookies();
  await page.goto('/sorteio-avulso');
  await expect(page).toHaveURL(/\/login$/);
});

test('sair volta para o login', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
