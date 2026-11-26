import type { Alignment, Workbook } from 'exceljs';
import type { Run } from '../types/roping';

/** Converte o tempo digitado ("8.34", "8,34", "") em número; vazio ou inválido = null. */
const toTime = (value: string | undefined) => {
  if (!value) return null;
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Largura (em caracteres do Excel) que cabe o maior texto da coluna, nomes em caixa alta incluídos. */
export const fitWidth = (header: string, values: string[]) =>
  Math.ceil(Math.max(header.length, ...values.map((v) => v.length)) * 1.15) + 2;

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
  const columns: ColumnSpec[] = [
    { header: 'Nº', key: 'numero', width: 5, align: 'center' },
    { header: 'Bateria', key: 'bateria', width: 8, align: 'center' },
    { header: 'Cruzamento', key: 'cruzamento', width: fitWidth('Cruzamento', runs.map((r) => r.cruzamento ?? '')), align: 'center' },
    { header: 'Cabeceiro', key: 'cabeceiro', width: fitWidth('Cabeceiro', heads), align: 'left' },
    { header: 'HC Cab.', key: 'hcCab', width: 9, align: 'center', numFmt: '0.0' },
    { header: 'Pezeiro', key: 'pezeiro', width: fitWidth('Pezeiro', heels), align: 'left' },
    { header: 'HC Pé', key: 'hcPe', width: 9, align: 'center', numFmt: '0.0' },
    { header: 'Soma HC', key: 'shc', width: 10, align: 'center', numFmt: '0.0' },
    { header: 'Bois', key: 'bois', width: 6, align: 'center' },
    { header: 'Boi 1', key: 't1', width: 9, align: 'center', numFmt: '0.00' },
    { header: 'Boi 2', key: 't2', width: 9, align: 'center', numFmt: '0.00' },
    { header: 'Boi 3', key: 't3', width: 9, align: 'center', numFmt: '0.00' },
    { header: 'Total', key: 'total', width: 10, align: 'center', numFmt: '0.00' },
    { header: 'Média', key: 'media', width: 10, align: 'center', numFmt: '0.00' },
    { header: 'NT', key: 'nt', width: 6, align: 'center' },
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
