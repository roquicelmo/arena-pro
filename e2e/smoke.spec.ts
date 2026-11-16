import { expect, test } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

test('login do admin abre o painel sem erros no console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'admin');
  expect(errors()).toEqual([]);
});

test('sem scroll horizontal no login e no painel', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
  await loginAs(page, 'admin');
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

// Task 4: reativar quando /provas existir (o menu legado foi removido nesta task).
test.fixme('user A não vê a prova do user B', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await expect(page.getByText(TEST_EVENTS.userA).first()).toBeVisible();
  await expect(page.getByText(TEST_EVENTS.userB)).toHaveCount(0);
});
