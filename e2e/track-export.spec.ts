import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';
import { TEST_EVENTS } from './fixtures/users';
import { loginAs } from './helpers/auth';

test('exporta a pista em Excel já formatado', async ({ page }) => {
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

  await page.goto(`${base}/pista`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel' }).click()]);
  expect(download.suggestedFilename()).toBe('pista.xlsx');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(await download.path());
  const sheet = workbook.getWorksheet('Pista')!;
  expect(sheet.getRow(1).getCell(4).value).toBe('Cabeceiro');
  // Colunas numéricas mostram o título inteiro (texto + botão de filtro).
  expect(sheet.getColumn(2).width).toBeGreaterThanOrEqual('Bateria'.length + 3);
  expect(sheet.getRow(2).getCell(5).alignment?.horizontal).toBe('center');
  expect(sheet.rowCount).toBeGreaterThan(1);
});
