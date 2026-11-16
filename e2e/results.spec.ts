import { expect, test, type Page } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

async function eventBase(page: Page, name: string) {
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: name }).getByRole('link', { name: 'Detalhes' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return new URL(page.url()).pathname;
}

test('publicar fica bloqueado com corrida incompleta; outro usuário recebe 404 na API', async ({ page }) => {
  await loginAs(page, 'userA');
  const base = await eventBase(page, TEST_EVENTS.userA);
  await page.goto(`${base}/sorteio`);
  await expect(page.getByRole('button', { name: /^(Gerar|Refazer) sorteio$/ })).toBeVisible();
  const generate = page.getByRole('button', { name: 'Gerar sorteio' });
  if (await generate.isVisible()) {
    await generate.click();
    await expect(page.getByRole('heading', { name: /Sorteio atual/ })).toBeVisible();
  }
  await page.goto(`${base}/resultado`);
  await expect(page.getByRole('button', { name: 'Publicar resultado' })).toBeDisabled();
  await expect(page.getByText(/corridas incompletas para publicar/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Classificação' })).toBeVisible();

  const eventId = base.split('/')[2];
  await loginAs(page, 'userB');
  const response = await page.request.post(`/api/events/${eventId}/results/publish`);
  expect(response.status()).toBe(404);
});
