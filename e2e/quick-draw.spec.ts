import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';

async function drawAll(page: Page) {
  await page.goto('/sorteio-avulso');
  await expect(page.getByRole('heading', { level: 1, name: 'Sorteio avulso' })).toBeVisible();
  await page.getByRole('region', { name: 'Cabeceiros' }).getByRole('button', { name: 'Selecionar todos' }).click();
  await page.getByRole('region', { name: 'Pezeiros' }).getByRole('button', { name: 'Selecionar todos' }).click();
  await page.getByRole('button', { name: 'Avançar para configuração' }).click();
  await page.getByRole('button', { name: 'Gerar sorteio' }).click();
  await expect(page.getByRole('region', { name: 'Bateria 1' })).toBeVisible();
}

test('sorteio avulso: participantes → configuração → revisão → PDF', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'userA');
  await drawAll(page);
  await expect(page.getByText('CABECEIRO A1').first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Etapas do sorteio avulso' }).locator('[aria-current="step"]')).toContainText('Revisão');
  await page.getByRole('button', { name: 'Baixar PDF' }).click();
  await expect(page.getByText('Informe o título do sorteio.')).toBeVisible();
  await page.getByLabel('Título do sorteio').fill('Copa do Clube');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('sorteio-copa-do-clube.pdf');
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(path).subarray(0, 4).toString()).toBe('%PDF');
  expect(await hasNoHorizontalScroll(page)).toBe(true);
  expect(errors()).toEqual([]);
});

test('PDF do avulso recusa atleta de outro usuário (404) e pede sessão (401)', async ({ page, request }) => {
  await loginAs(page, 'userB');
  const athletes = await (await page.request.get('/api/athletes')).json() as Array<{ id: string; name: string }>;
  const bId = athletes.find((a) => a.name === 'CABECEIRO B1')!.id;
  await loginAs(page, 'userA');
  const response = await page.request.post('/sorteio-avulso/sumula.pdf', {
    data: { title: 'Teste', runs: [{ numero: 1, bateria: 1, cabeceiroId: bId, pezeiroId: bId, cabeceiroGrupo: 'A', pezeiroGrupo: 'A' }] },
  });
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ message: 'Atleta não encontrado ou inativo.' });
  expect((await request.post('/sorteio-avulso/sumula.pdf', { data: {} })).status()).toBe(401);
});

test('cadastro rápido cria o atleta e o mostra na lista sem recarregar', async ({ page }, testInfo) => {
  const name = `ATLETA AVULSO ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/sorteio-avulso');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Cabeceiros' }).getByText(name)).toBeVisible();
});
