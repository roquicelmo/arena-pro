import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { hasNoHorizontalScroll } from './helpers/console';
import { TEST_SHARED_ATHLETE } from './fixtures/users';

test('cria, edita e remove um atleta', async ({ page }, testInfo) => {
  const name = `ATLETA NOVO ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Handicap de cabeceiro').fill('3');
  await dialog.getByLabel('Clube').fill(`HARAS ${testInfo.project.name}`);
  await expect(dialog.getByLabel('UF')).toHaveValue('GO');
  await expect(dialog.getByLabel('Cidade')).toHaveValue('Caiapônia');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).dblclick();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(1);
  await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText(`HARAS ${testInfo.project.name}`);
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  await page.getByRole('dialog', { name: 'Editar atleta' }).getByLabel('Cidade').fill('Rio Verde');
  await page.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('Rio Verde/GO');
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  await page.getByRole('dialog', { name: 'Editar atleta' }).getByLabel('Clube').fill('');
  await page.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta atualizado.').first()).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: name })).not.toContainText('HARAS');
  await page.getByRole('button', { name: `Remover ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover atleta' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test('cria atleta só com handicap de pezeiro e cidade não informada', async ({ page }, testInfo) => {
  const name = `ATLETA NI ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(dialog.getByText('Informe ao menos um handicap (cabeceiro ou pezeiro).').first()).toBeVisible();
  await dialog.getByLabel('Handicap de pezeiro').fill('2');
  await dialog.getByLabel('Não informado').check();
  await expect(dialog.getByLabel('UF')).toBeDisabled();
  await expect(dialog.getByLabel('Cidade')).toBeDisabled();
  await expect(dialog.getByLabel('Cidade')).toHaveValue('Não informado');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  const row = page.getByRole('listitem').filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('—');
  await expect(row).toContainText('2.0');
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  const edit = page.getByRole('dialog', { name: 'Editar atleta' });
  await expect(edit.getByLabel('Não informado')).toBeChecked();
  await expect(edit.getByLabel('Handicap de cabeceiro')).toHaveValue('');
  await expect(edit.getByLabel('Handicap de pezeiro')).toHaveValue('2');
  await edit.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: `Remover ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover atleta' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test('erro de validação mantém o que foi digitado', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('Z');
  await dialog.getByLabel('Clube').fill('Haras Lagoa');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(dialog.getByText('Informe o nome com pelo menos 2 letras.')).toBeVisible();
  await expect(dialog.getByLabel('Clube')).toHaveValue('Haras Lagoa');
  await expect(dialog.getByLabel('Cidade')).toHaveValue('Caiapônia');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

test('sessão expirada ao salvar leva ao login com next', async ({ page, context }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('ATLETA SESSAO EXPIRADA');
  await context.clearCookies();
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fatletas&reason=expired/);
});

test('busca sem resultado mostra empty state e limpa', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByLabel('Buscar atleta').fill('zzz');
  await expect(page.getByText('Nenhum atleta encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page.getByText('CABECEIRO A1')).toBeVisible();
});

test('nome longo não cria scroll horizontal', async ({ page }, testInfo) => {
  const name = `${'ATLETA COM NOME MUITO LONGO '.repeat(3).slice(0, 70)}${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Handicap de cabeceiro').fill('2.5');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: name.slice(0, 30) }).first()).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('manager filtra por proprietário pela URL', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/atletas');
  await page.getByLabel('Proprietário').selectOption({ label: 'User B Teste' });
  await expect(page).toHaveURL(/dono=/);
  await expect(page.getByText('CABECEIRO B1')).toBeVisible();
  await expect(page.getByText('CABECEIRO A1')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('CABECEIRO A1')).toHaveCount(0);
});

test('atleta compartilhado aparece para o user A, sem editar nem remover', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  const row = page.getByRole('listitem').filter({ hasText: TEST_SHARED_ATHLETE });
  await expect(row).toContainText('Compartilhado');
  await expect(row).toContainText('User B Teste');
  await expect(page.getByRole('button', { name: `Editar ${TEST_SHARED_ATHLETE}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Remover ${TEST_SHARED_ATHLETE}` })).toHaveCount(0);
});

test('notas são privadas e persistem', async ({ page }, testInfo) => {
  const note = `Laça bem de cabeça ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await page.getByRole('dialog').getByLabel('Notas').fill(note);
  await page.getByRole('button', { name: 'Salvar notas' }).click();
  await expect(page.getByText('Notas salvas.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await expect(page.getByRole('dialog').getByLabel('Notas')).toHaveValue(note);
  await loginAs(page, 'userB');
  await page.goto('/atletas');
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await expect(page.getByRole('dialog').getByLabel('Notas')).toHaveValue('');
});

test('aviso de possível duplicado sem bloquear', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('cabeceiro a1');
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Lagoa da Prata');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(dialog.getByText('Possível atleta já cadastrado')).toBeVisible();
  await dialog.getByRole('button', { name: 'Usar o existente' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Buscar atleta')).toHaveValue('CABECEIRO A1');
});

test('o user B não recebe aviso de duplicado de atleta do A', async ({ page }) => {
  await loginAs(page, 'userB');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('Cabeceiro A1');
  await dialog.getByLabel('Handicap de cabeceiro').fill('2.5');
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Lagoa da Prata');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByText('Possível atleta já cadastrado')).toHaveCount(0);
  // Remove o atleta criado: o projeto seguinte repete o teste e, com ele ainda ativo, veria o aviso.
  await page.getByRole('button', { name: 'Remover Cabeceiro A1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover atleta' }).click();
  await expect(page.getByText('Atleta removido.')).toBeVisible();
});
