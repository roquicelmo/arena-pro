import { expect, type Page } from '@playwright/test';
import { TEST_USERS, type TestUserKey } from '../fixtures/users';

export async function loginAs(page: Page, user: TestUserKey) {
  const { email, password } = TEST_USERS[user];
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir menu|sair/i }).first()).toBeVisible();
}

/** No mobile abre o drawer do menu; no desktop o menu já está visível. */
export async function openNav(page: Page, isMobile: boolean | undefined) {
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click();
}
