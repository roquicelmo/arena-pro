import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { Run } from '../types/roping';
import { buildTrackWorkbook, fitWidth, headerWidth } from './trackExport';

const run = (numero: number, head: string, heel: string, times: Partial<Run['times']>, extra: Partial<Run> = {}): Run =>
  ({
    id: `r${numero}`,
    numero,
    bateria: 1,
    bateriaLabel: 'Fase 1: A × A',
    cruzamento: 'A × A',
    cabeceiro: { id: 'h', nome: head, handicap: 1.5 },
    pezeiro: { id: 'p', nome: heel, handicap: 3 },
    shc: 4.5,
    bois: 2,
    times: { boi1: '', boi2: '', boi3: '', boi1Nt: false, boi2Nt: false, boi3Nt: false, ...times },
    totalTime: 16.57,
    mediaFinal: 8.285,
    isNt: false,
    ...extra,
  }) as unknown as Run;

async function roundTrip(runs: Run[]) {
  const buffer = await buildTrackWorkbook(ExcelJS, runs).xlsx.writeBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.getWorksheet('Pista')!;
}

describe('buildTrackWorkbook', () => {
  const long = 'CARLOS EDUARDO DOS SANTOS FILHO';
  const runs = [run(1, long, 'WELLITON', { boi1: '8.34', boi2: '8,23' }), run(2, 'BAIANO', 'X SALADA', { boi1Nt: true }, { isNt: true })];

  it('formata como tabela do Excel com cabeçalho', async () => {
    const sheet = await roundTrip(runs);
    expect(sheet.getRow(1).getCell(1).value).toBe('Nº');
    expect(sheet.getRow(1).getCell(4).value).toBe('Cabeceiro');
    expect(sheet.getRow(1).font?.bold).toBe(true);
    expect(buildTrackWorkbook(ExcelJS, runs).getWorksheet('Pista')!.getTables()).toHaveLength(1);
  });

  it('colunas numéricas na largura do título; nomes na largura do maior nome', async () => {
    const sheet = await roundTrip(runs);
    const headers = sheet.getRow(1).values as string[];
    for (const col of [1, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
      expect(sheet.getColumn(col).width, headers[col]).toBe(headerWidth(headers[col]));
      // Título em negrito + botão de filtro (~3 caracteres) cabem sem cortar.
      expect(sheet.getColumn(col).width!, headers[col]).toBeGreaterThanOrEqual(headers[col].length + 3);
    }
    expect(sheet.getColumn(3).width).toBe(headerWidth('Cruzamento'));
    expect(sheet.getColumn(4).width).toBe(fitWidth('Cabeceiro', [long, 'BAIANO']));
    expect(sheet.getColumn(4).width).toBeGreaterThan(long.length);
    expect(sheet.getColumn(6).width).toBe(fitWidth('Pezeiro', ['WELLITON', 'X SALADA']));
  });

  it('handicaps, tempos e médias centralizados e numéricos; nomes à esquerda', async () => {
    const row = (await roundTrip(runs)).getRow(2);
    for (const col of [5, 7, 8, 10, 11, 13, 14]) expect(row.getCell(col).alignment?.horizontal).toBe('center');
    expect(row.getCell(4).alignment?.horizontal).toBe('left');
    expect(row.getCell(10).value).toBe(8.34);
    expect(row.getCell(11).value).toBe(8.23);
    expect(row.getCell(14).numFmt).toBe('0.00');
    expect(row.getCell(5).numFmt).toBe('0.0');
  });

  it('NT aparece como NT no boi e sem total/média', async () => {
    const row = (await roundTrip(runs)).getRow(3);
    expect(row.getCell(10).value).toBe('NT');
    expect(row.getCell(13).value).toBeNull();
    expect(row.getCell(15).value).toBe('Sim');
  });

  it('gera planilha válida mesmo sem corridas', async () => {
    const sheet = await roundTrip([]);
    expect(sheet.getRow(1).getCell(1).value).toBe('Nº');
  });
});
