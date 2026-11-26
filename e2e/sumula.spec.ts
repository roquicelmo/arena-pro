import { expect, test, type Page } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

async function eventPath(page: Page, name: string) {
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: name }).getByRole('link', { name: 'Detalhes' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return new URL(page.url()).pathname;
}

test('súmula da prova sorteada é um PDF de verdade', async ({ page }) => {
  await loginAs(page, 'userA');
  const path = await eventPath(page, TEST_EVENTS.userA);
  await page.goto(`${path}/sorteio`);
  await expect(page.getByRole('button', { name: /^(Gerar|Refazer) sorteio$/ })).toBeVisible();
  const generate = page.getByRole('button', { name: 'Gerar sorteio' });
  if (await generate.isVisible()) {
    await generate.click();
    await expect(page.getByRole('heading', { name: /Sorteio atual/ })).toBeVisible();
  }
  const link = page.getByRole('link', { name: 'Baixar súmula (PDF)' });
  const response = await page.request.get((await link.getAttribute('href'))!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
  expect(response.headers()['content-disposition']).toMatch(/^attachment; filename="sumula-prova-e2e-user-a-v\d+\.pdf"$/);
  const body = await response.body();
  expect(body.subarray(0, 4).toString()).toBe('%PDF');
  expect(body.toString('latin1')).toMatch(/\/Type\s*\/Page\b/);
});

test('súmulas por cabeceiro e por pezeiro são PDFs', async ({ page }) => {
  await loginAs(page, 'userA');
  const path = await eventPath(page, TEST_EVENTS.userA);
  await page.goto(`${path}/sorteio`);
  await expect(page.getByRole('button', { name: /^(Gerar|Refazer) sorteio$/ })).toBeVisible();
  const generate = page.getByRole('button', { name: 'Gerar sorteio' });
  if (await generate.isVisible()) {
    await generate.click();
    await expect(page.getByRole('heading', { name: /Sorteio atual/ })).toBeVisible();
  }
  for (const kind of ['cabeceiro', 'pezeiro']) {
    const href = await page.getByRole('link', { name: `Súmula por ${kind}` }).getAttribute('href');
    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toMatch(new RegExp(`filename="sumula-${kind}s-prova-e2e-user-a-v\\d+\\.pdf"`));
    expect((await response.body()).subarray(0, 4).toString()).toBe('%PDF');
  }
});

test('sem sorteio a súmula responde 404 com mensagem; sem sessão, 401', async ({ page }) => {
  await loginAs(page, 'userB');
  const path = await eventPath(page, TEST_EVENTS.userB);
  const response = await page.request.get(`${path}/sorteio/sumula.pdf`);
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ message: 'Nenhum sorteio gerado para esta prova.' });
  expect((await page.request.get(`${path}/sorteio/sumula-pezeiros.pdf`)).status()).toBe(404);
  await page.context().clearCookies();
  expect((await page.request.get(`${path}/sorteio/sumula.pdf`)).status()).toBe(401);
  expect((await page.request.get(`${path}/sorteio/sumula-cabeceiros.pdf`)).status()).toBe(401);
});
