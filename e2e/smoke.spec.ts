import { expect, test } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs, openSection } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

test('login do admin abre o painel sem erros no console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'admin');
  expect(errors()).toEqual([]);
});

test('sem scroll horizontal no login e no painel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Digite sua senha')).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
  await loginAs(page, 'admin');
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('user A não vê a prova do user B', async ({ page }) => {
  await loginAs(page, 'userA');
  await openSection(page, 'Provas e arenas');
  await expect(page.getByText(TEST_EVENTS.userA).first()).toBeVisible();
  await expect(page.getByText(TEST_EVENTS.userB)).toHaveCount(0);
});
