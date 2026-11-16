import { expect, test, type Page } from '@playwright/test';
import { loginAs, openNav } from './helpers/auth';
import { hasNoHorizontalScroll, trackConsoleErrors } from './helpers/console';
import { TEST_ARENAS } from './fixtures/users';

async function createAthleteViaUi(page: Page, name: string) {
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Handicap de cabeceiro').fill('3');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
}

test('manager compartilha um atleta com o user A e depois remove', async ({ page }, testInfo) => {
  const name = `ATLETA COMPARTILHADO ${testInfo.project.name}`;
  await loginAs(page, 'manager');
  await createAthleteViaUi(page, name);
  await page.goto('/cadastros');
  await page.getByRole('checkbox', { name: `Selecionar ${name}` }).check();
  await expect(page.getByText('1 selecionado(s)')).toBeVisible();
  await page.getByRole('button', { name: 'Compartilhar com…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar cadastros' });
  await dialog.getByRole('checkbox', { name: 'User A Teste' }).check();
  await dialog.getByRole('button', { name: 'Compartilhar', exact: true }).click();
  await expect(page.getByText('Compartilhado com 1 usuário(s).')).toBeVisible();

  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('Compartilhado');

  await loginAs(page, 'manager');
  await page.goto('/cadastros');
  await page.getByRole('button', { name: `Remover User A Teste de ${name}` }).click();
  await expect(page.getByText('Compartilhamento removido.')).toBeVisible();

  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByText(name)).toHaveCount(0);
});

test('manager altera o responsável de uma prova para o user A', async ({ page }, testInfo) => {
  const name = `COPA RESP ${testInfo.project.name}`;
  await loginAs(page, 'manager');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova prova' }).click();
  const create = page.getByRole('dialog', { name: 'Nova prova' });
  await create.getByLabel('Nome da prova').fill(name);
  await create.getByLabel('Data').fill('2026-12-22');
  await create.getByLabel('Arena', { exact: true }).selectOption({ label: `${TEST_ARENAS.userA} · Lagoa da Prata/MG` });
  await create.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova criada.')).toBeVisible();

  await page.goto('/cadastros?tipo=provas');
  await page.getByRole('checkbox', { name: `Selecionar ${name}` }).check();
  await page.getByRole('button', { name: 'Alterar responsável…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Alterar responsável' });
  await expect(dialog.getByText('As provas selecionadas passam a ser deste usuário.')).toBeVisible();
  await dialog.getByLabel('Responsável').selectOption({ label: 'User A Teste' });
  await dialog.getByRole('button', { name: 'Alterar responsável' }).click();
  await expect(page.getByText('Responsável alterado.')).toBeVisible();

  await loginAs(page, 'userA');
  await page.goto('/provas');
  await expect(page.getByRole('article').filter({ hasText: name })).toBeVisible();
});

test('filtro por usuário mostra só o que ele acessa', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/cadastros?tipo=atletas');
  await expect(page.getByRole('navigation', { name: 'Tipos de cadastro' }).getByRole('link', { name: 'Atletas' })).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Usuário').selectOption({ label: 'User B Teste' });
  await expect(page).toHaveURL(/usuario=/);
  await expect(page.getByRole('checkbox', { name: 'Selecionar CABECEIRO B1' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Selecionar PEZEIRO B1' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Selecionar CABECEIRO A1' })).toHaveCount(0);
});

test('user recebe 404 em /cadastros e não vê o item no menu', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  const response = await page.goto('/cadastros');
  expect(response?.status()).toBe(404);
  await page.goto('/');
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Cadastros' })).toHaveCount(0);
});

test('/cadastros sem scroll horizontal e sem erros de console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'manager');
  for (const tipo of ['atletas', 'arenas', 'provas']) {
    await page.goto(`/cadastros?tipo=${tipo}`);
    await expect(page.getByRole('heading', { name: 'Manejo de cadastros' })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
  }
  expect(errors()).toEqual([]);
});
