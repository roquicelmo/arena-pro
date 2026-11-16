import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { TEST_SHARED_ATHLETE } from './fixtures/users';

test('user A recebe no GET /api/athletes o atleta compartilhado do B, e só ele', async ({ page }) => {
  await loginAs(page, 'userA');
  const names = (await (await page.request.get('/api/athletes')).json()).map((a: { name: string }) => a.name);
  expect(names).toContain(TEST_SHARED_ATHLETE);
  expect(names).not.toContain('CABECEIRO B1');
});
