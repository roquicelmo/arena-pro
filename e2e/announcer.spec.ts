import { expect, test } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

test('locução mostra a próxima corrida sozinha depois de um NT lançado em outra aba', async ({ page, context }) => {
  test.setTimeout(60_000);
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('article').filter({ hasText: TEST_EVENTS.userA }).getByRole('link', { name: 'Detalhes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: TEST_EVENTS.userA })).toBeVisible();
  const base = new URL(page.url()).pathname;

  await page.goto(`${base}/sorteio`);
  await expect(page.getByRole('button', { name: /^(Gerar|Refazer) sorteio$/ })).toBeVisible();
  const generate = page.getByRole('button', { name: 'Gerar sorteio' });
  if (await generate.isVisible()) {
    await generate.click();
    await expect(page.getByRole('heading', { name: /Sorteio atual/ })).toBeVisible();
  }

  const announcer = await context.newPage();
  await announcer.goto(`${base}/locucao`);
  const currentNumber = announcer.getByRole('region', { name: 'Corrida atual' }).locator('p').nth(1);
  const before = await currentNumber.innerText();

  await page.goto(`${base}/pista`);
  await page.getByRole('button', { name: `NT boi 1 da corrida ${before}` }).click();
  await expect(page.getByText(/tempo salvo/i).first()).toBeVisible();

  await expect(currentNumber).not.toHaveText(before, { timeout: 8_000 });
});
