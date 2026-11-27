import type { Alignment, Workbook } from 'exceljs';
import type { Run } from '../types/roping';

/** Converte o tempo digitado ("8.34", "8,34", "") em número; vazio ou inválido = null. */
const toTime = (value: string | undefined) => {
  if (!value) return null;
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * Largura que mostra o título inteiro: o título fica em negrito e divide a célula
 * com o botão de filtro da tabela (~3 caracteres), por isso a folga extra.
 */
// Mínimo 10: o exceljs não grava largura 9 (seu padrão) e o Excel cairia no padrão dele (8,43).
export const headerWidth = (header: string) => Math.max(10, Math.ceil(header.length * 1.2) + 4);

/** Largura (em caracteres do Excel) que cabe o título e o maior texto da coluna, nomes em caixa alta incluídos. */
export const fitWidth = (header: string, values: string[]) =>
  Math.max(headerWidth(header), Math.ceil(Math.max(0, ...values.map((v) => v.length)) * 1.15) + 2);

type ColumnSpec = { header: string; key: string; width: number; align: 'left' | 'center'; numFmt?: string };

const CENTER: Partial<Alignment> = { horizontal: 'center', vertical: 'middle' };
const LEFT: Partial<Alignment> = { horizontal: 'left', vertical: 'middle' };

/**
 * Planilha da pista já formatada como tabela do Excel: Nº e Bateria estreitas,
 * nomes na largura do maior nome, handicaps, tempos e médias centralizados.
 */
export function buildTrackWorkbook(ExcelJS: { Workbook: new () => Workbook }, runs: Run[]): Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arena Pro';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Pista', { views: [{ state: 'frozen', ySplit: 1 }] });

  const heads = runs.map((r) => r.cabeceiro.nome);
  const heels = runs.map((r) => r.pezeiro.nome);
  // Colunas numéricas: largura do título (os números, até "16.57", cabem nela).
  const num = (header: string, key: string, numFmt?: string): ColumnSpec => ({ header, key, width: headerWidth(header), align: 'center', numFmt });
  const columns: ColumnSpec[] = [
    num('Nº', 'numero'),
    num('Bateria', 'bateria'),
    { header: 'Cruzamento', key: 'cruzamento', width: fitWidth('Cruzamento', runs.map((r) => r.cruzamento ?? '')), align: 'center' },
    { header: 'Cabeceiro', key: 'cabeceiro', width: fitWidth('Cabeceiro', heads), align: 'left' },
    num('HC Cab.', 'hcCab', '0.0'),
    { header: 'Pezeiro', key: 'pezeiro', width: fitWidth('Pezeiro', heels), align: 'left' },
    num('HC Pé', 'hcPe', '0.0'),
    num('Soma HC', 'shc', '0.0'),
    num('Bois', 'bois'),
    num('Boi 1', 't1', '0.00'),
    num('Boi 2', 't2', '0.00'),
    num('Boi 3', 't3', '0.00'),
    num('Total', 'total', '0.00'),
    num('Média', 'media', '0.00'),
    num('NT', 'nt'),
  ];

  const rows = runs.map((r) => [
    r.numero,
    r.bateria,
    r.cruzamento ?? '',
    r.cabeceiro.nome,
    r.cabeceiro.handicap,
    r.pezeiro.nome,
    r.pezeiro.handicap,
    r.shc,
    r.bois,
    r.times.boi1Nt ? 'NT' : toTime(r.times.boi1),
    r.bois >= 2 ? (r.times.boi2Nt ? 'NT' : toTime(r.times.boi2)) : null,
    r.bois >= 3 ? (r.times.boi3Nt ? 'NT' : toTime(r.times.boi3)) : null,
    r.isNt ? null : r.totalTime ?? null,
    r.isNt ? null : r.mediaFinal ?? null,
    r.isNt ? 'Sim' : '',
  ]);

  sheet.addTable({
    name: 'Pista',
    displayName: 'Pista',
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columns.map((c) => ({ name: c.header, filterButton: true })),
    // Uma tabela vazia do Excel precisa de ao menos uma linha.
    rows: rows.length ? rows : [columns.map(() => null)],
  });

  columns.forEach((spec, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = spec.width;
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      cell.alignment = rowNumber === 1 ? CENTER : spec.align === 'center' ? CENTER : LEFT;
      if (rowNumber > 1 && spec.numFmt && typeof cell.value === 'number') cell.numFmt = spec.numFmt;
    });
  });
  sheet.getRow(1).font = { bold: true };

  return workbook;
}

/** Gera e baixa o .xlsx no navegador; o exceljs só é carregado no clique. */
export async function downloadTrackWorkbook(runs: Run[], filename = 'pista.xlsx') {
  const ExcelJS = (await import('exceljs')).default;
  const buffer = await buildTrackWorkbook(ExcelJS, runs).xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
