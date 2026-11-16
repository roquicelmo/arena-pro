import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { hasNoHorizontalScroll } from './helpers/console';
import { TEST_ARENAS } from './fixtures/users';

async function createEvent(page: Page, name: string, date = '2026-12-20') {
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova prova' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova prova' });
  await dialog.getByLabel('Nome da prova').fill(name);
  await dialog.getByLabel('Data').fill(date);
  await dialog.getByLabel('Arena', { exact: true }).selectOption({ label: `${TEST_ARENAS.userA} · Lagoa da Prata/MG` });
  await dialog.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova criada.')).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: name })).toBeVisible();
}

test('cria prova com arena nova e depois reaproveita a arena', async ({ page }, testInfo) => {
  const s = testInfo.project.name;
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova prova' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova prova' });
  await dialog.getByLabel('Nome da prova').fill(`COPA NOVA ${s}`);
  await dialog.getByLabel('Data').fill('2026-12-20');
  await dialog.getByLabel('Nome da nova arena').fill(`ARENA NOVA ${s}`);
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Arcos');
  await dialog.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova criada.')).toBeVisible();
  const card = page.getByRole('article').filter({ hasText: `COPA NOVA ${s}` });
  await expect(card).toContainText('20/12/2026');
  await expect(card).toContainText(`ARENA NOVA ${s}`);
  await page.getByRole('button', { name: 'Nova prova' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova prova' }).getByLabel('Arena', { exact: true })).toContainText(`ARENA NOVA ${s} · Arcos/MG`);
});

test('edita a data da prova', async ({ page }, testInfo) => {
  const name = `COPA EDIT ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await createEvent(page, name);
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar prova' });
  await expect(dialog.getByLabel('Data')).toHaveValue('2026-12-20');
  await dialog.getByLabel('Data').fill('2026-12-21');
  await dialog.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova atualizada.')).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: name })).toContainText('21/12/2026');
});

test('cancela prova com confirmação; ela some e volta com "Mostrar canceladas"', async ({ page }, testInfo) => {
  const name = `COPA CANCEL ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await createEvent(page, name);
  const card = page.getByRole('article').filter({ hasText: name });
  await card.getByRole('button', { name: `Cancelar ${name}` }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: `Cancelar ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar prova' }).click();
  await expect(page.getByText('Prova cancelada.')).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: name })).toHaveCount(0);
  await page.getByRole('link', { name: 'Mostrar canceladas' }).click();
  const cancelled = page.getByRole('article').filter({ hasText: name });
  await expect(cancelled).toBeVisible();
  await expect(cancelled).toContainText('Cancelada');
  await expect(cancelled.getByRole('button', { name: `Editar ${name}` })).toHaveCount(0);
});

test('arena duplicada mostra erro no campo e mantém o formulário', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova arena' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova arena' });
  await dialog.getByLabel('Nome').fill(TEST_ARENAS.userA);
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Lagoa da Prata');
  await dialog.getByRole('button', { name: 'Salvar arena' }).click();
  await expect(dialog.getByText('Já existe uma arena com esse nome nessa cidade.')).toBeVisible();
  await expect(dialog.getByLabel('Nome')).toHaveValue(TEST_ARENAS.userA);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

test('cria, renomeia e desativa uma arena', async ({ page }, testInfo) => {
  const s = testInfo.project.name;
  const name = `ARENA PAINEL ${s}`;
  const renamed = `ARENA PAINEL RENOMEADA ${s}`;
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova arena' }).click();
  let dialog = page.getByRole('dialog', { name: 'Nova arena' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Salvar arena' }).click();
  await expect(page.getByText('Arena cadastrada.')).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  dialog = page.getByRole('dialog', { name: 'Editar arena' });
  await dialog.getByLabel('Nome').fill(renamed);
  await dialog.getByRole('button', { name: 'Salvar arena' }).click();
  await expect(page.getByText('Arena atualizada.')).toBeVisible();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Desativar ${renamed}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Desativar arena' }).click();
  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova prova' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova prova' }).getByLabel('Arena', { exact: true })).not.toContainText(renamed);
});

test('prova com nome longo não cria scroll horizontal', async ({ page }, testInfo) => {
  const name = `${testInfo.project.name} ${'PROVA COM NOME MUITO LONGO '.repeat(4)}`.slice(0, 80);
  await loginAs(page, 'userA');
  await createEvent(page, name);
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});
