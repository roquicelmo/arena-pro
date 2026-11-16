import { expect, type Page } from '@playwright/test';
import { TEST_USERS, type TestUserKey } from '../fixtures/users';

export async function loginAs(page: Page, user: TestUserKey) {
  const { email, password } = TEST_USERS[user];
  await page.goto('/');
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('Digite sua senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /painel geral/i })).toBeVisible();
}

/** Abre uma seção pelo menu lateral (no mobile, abre o drawer antes). */
export async function openSection(page: Page, label: string) {
  const menuButton = page.getByRole('button', { name: 'Abrir menu' });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole('button', { name: label }).first().click();
}
