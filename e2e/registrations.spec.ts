import { expect, test, type Page } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

async function openRegistrations(page: Page, eventName: string) {
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: eventName }).getByRole('link', { name: 'Detalhes' }).click();
  await page.getByRole('navigation', { name: 'Seções da prova' }).getByRole('link', { name: 'Inscrições', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Etapas da inscrição' })).toBeVisible();
}

const enrolled = (page: Page) => page.getByRole('region', { name: /inscritos \(\d+\)/ });

test('inscreve por etapa com um clique na linha e cancela com confirmação', async ({ page }, testInfo) => {
  const name = `ATLETA INSCRICAO ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();

  await openRegistrations(page, TEST_EVENTS.userA);
  await page.getByRole('button', { name: 'Avançar para pezeiros' }).click();
  await expect(page.getByRole('button', { name: /Pezeiros \(\d+\)/, exact: false })).toHaveAttribute('aria-current', 'step');
  await page.getByLabel('Buscar atleta').fill(name);
  await page.getByRole('button', { name: `Inscrever ${name} como pezeiro` }).click();
  await expect(enrolled(page).getByRole('button', { name: `Cancelar inscrição de ${name}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Inscrever ${name} como pezeiro` })).toHaveCount(0);

  // Inscrito como pezeiro: não aparece de novo na etapa dos cabeceiros.
  await page.getByRole('button', { name: 'Voltar para cabeceiros' }).click();
  await page.getByLabel('Buscar atleta').fill(name);
  await expect(page.getByRole('button', { name: `Inscrever ${name} como cabeceiro` })).toHaveCount(0);

  await page.getByRole('button', { name: 'Avançar para pezeiros' }).click();
  await enrolled(page).getByRole('button', { name: `Cancelar inscrição de ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar inscrição' }).click();
  await expect(page.getByText('Inscrição cancelada.')).toBeVisible();
  await expect(enrolled(page).getByText(name)).toHaveCount(0);
});

test('a busca do user B não mostra atletas do user A', async ({ page }) => {
  await loginAs(page, 'userB');
  await openRegistrations(page, TEST_EVENTS.userB);
  await page.getByLabel('Buscar atleta').fill('CABECEIRO A');
  await expect(page.getByRole('button', { name: /Inscrever CABECEIRO A\d/ })).toHaveCount(0);
});

test('o admin vê atletas de outros donos na inscrição', async ({ page }) => {
  await loginAs(page, 'admin');
  await openRegistrations(page, TEST_EVENTS.userA);
  await page.getByLabel('Buscar atleta').fill('CABECEIRO B');
  await expect(page.getByRole('button', { name: /Inscrever CABECEIRO B\d/ }).first()).toBeVisible();
});
