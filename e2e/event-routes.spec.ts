import { expect, test, type Page } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

/** Abre a prova pelo card da lista de /provas (link "Detalhes" do card com o nome da prova). */
async function openEvent(page: Page, name: string) {
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: name }).getByRole('link', { name: 'Detalhes' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Seções da prova' }).getByRole('link', { name, exact: true });

// A rota de tempos ainda recusa o papel USER (a regra "User lança tempos nas
// próprias provas" é da fase 4 do spec), então o fluxo com tempo persistido roda
// como admin sobre a prova do user A. O user A cobre o sorteio no teste de contraste.
test('fluxo da prova do user A: inscrições → sorteio → pista com tempo persistido', async ({ page }) => {
  await loginAs(page, 'admin');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Inscrições').click();
  await expect(page.getByText('CABECEIRO A1')).toBeVisible();
  await tab(page, 'Sorteio').click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  const firstTime = page.getByPlaceholder('0.00').first();
  await firstTime.fill('8.12');
  await firstTime.press('Tab');
  await expect(page.getByText(/tempo salvo/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByPlaceholder('0.00').first()).toHaveValue(/8[.,]12/);
});

test('tempo editado na pista continua após trocar de aba e voltar', async ({ page }) => {
  await loginAs(page, 'admin');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Sorteio').click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  const firstTime = page.getByPlaceholder('0.00').first();
  await firstTime.fill('9.34');
  // Sai antes da gravação terminar (o PATCH sai na desmontagem).
  await tab(page, 'Locução').click();
  await expect(page).toHaveURL(/\/locucao$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/pista$/);
  await expect(page.getByPlaceholder('0.00').first()).toHaveValue(/9[.,]34/);
  await page.reload();
  await expect(page.getByPlaceholder('0.00').first()).toHaveValue(/9[.,]34/);
});

test('falha ao limpar tempos volta a mostrar os tempos do banco', async ({ page }) => {
  await loginAs(page, 'admin');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Sorteio').click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  const firstTime = page.getByPlaceholder('0.00').first();
  await firstTime.fill('7.56');
  await firstTime.press('Tab');
  await expect(page.getByText(/tempo salvo/i).first()).toBeVisible();
  await page.route('**/api/runs/*/times', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"falha"}' }));
  await page.getByRole('button', { name: 'Limpar Tempos' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Limpar tempos' }).click();
  await expect(page.getByText('Alguns tempos não puderam ser apagados no banco.')).toBeVisible();
  await expect(page.getByPlaceholder('0.00').first()).toHaveValue(/7[.,]56/);
});

test('user B recebe 404 nas rotas da prova do user A', async ({ page }) => {
  await loginAs(page, 'userA');
  await openEvent(page, TEST_EVENTS.userA);
  const eventUrl = new URL(page.url()).pathname;
  await loginAs(page, 'userB');
  for (const suffix of ['', '/inscricoes', '/sorteio', '/pista', '/locucao', '/resultado']) {
    const response = await page.goto(eventUrl + suffix);
    expect(response?.status(), suffix).toBe(404);
    await expect(page.getByText(TEST_EVENTS.userA)).toHaveCount(0);
  }
});

test('voltar e avançar mantêm a tela da prova', async ({ page }) => {
  await loginAs(page, 'userA');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Locução').click();
  await expect(page).toHaveURL(/\/locucao$/);
  await page.goBack();
  await expect(tab(page, 'Visão geral')).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page).toHaveURL(/\/locucao$/);
  await expect(tab(page, 'Locução')).toHaveAttribute('aria-current', 'page');
});

test('pista sem sorteio mostra estado vazio com link para o Sorteio', async ({ page }) => {
  // Nenhum teste gera sorteio na prova do user B.
  await loginAs(page, 'userB');
  await openEvent(page, TEST_EVENTS.userB);
  await tab(page, 'Pista').click();
  await expect(page.getByRole('heading', { name: 'Nenhum sorteio gerado' })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: /ir para o sorteio/i }).click();
  await expect(page).toHaveURL(/\/sorteio$/);
});

test('sessão expirada na pista avisa que o tempo não foi salvo e vai ao login', async ({ page }) => {
  await loginAs(page, 'admin');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Sorteio').click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  await page.context().clearCookies();
  const firstTime = page.getByPlaceholder('0.00').first();
  await firstTime.fill('6.78');
  await firstTime.press('Tab');
  await expect(page.getByText('Sessão expirada — tempos não salvos. Entre novamente.')).toBeVisible();
  await expect(page).toHaveURL(/\/login\?next=%2Fprovas%2F[^&]+%2Fpista/);
  await expect(page.getByText('Sua sessão expirou')).toBeVisible();
});

test('voltar e avançar após edição rápida não perde o tempo salvo (refresh só no histórico)', async ({ page }) => {
  await loginAs(page, 'admin');
  await openEvent(page, TEST_EVENTS.userA);
  await tab(page, 'Sorteio').click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  const firstTime = page.getByPlaceholder('0.00').first();
  await firstTime.fill('5.43');
  await firstTime.press('Tab');
  await expect(page.getByText(/tempo salvo/i).first()).toBeVisible();
  await tab(page, 'Resultado').click();
  await tab(page, 'Pista').click();
  const again = page.getByPlaceholder('0.00').first();
  await again.fill('5.44');
  await again.press('Tab');
  await expect(page.getByText(/tempo salvo/i).first()).toBeVisible();
  await expect(again).toHaveValue(/5[.,]44/);
});
