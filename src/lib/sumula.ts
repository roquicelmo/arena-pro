import { normalizeName } from './text';

export interface SumulaRun {
  numero: number;
  bateria: number;
  cabeceiro: { nome: string; hc: number };
  pezeiro: { nome: string; hc: number };
  grupoCab: string;
  grupoPe: string;
  shc: number;
  bois: number;
}

export type SumulaItem =
  | { kind: 'band'; label: string; continued: boolean; mixed: boolean }
  | { kind: 'run'; run: SumulaRun; mixed: boolean };

export type SumulaPage = SumulaItem[];

const bandLabel = (battery: number, runs: SumulaRun[]) => {
  const crosses = new Set(runs.map((r) => `${r.grupoCab}|${r.grupoPe}`));
  const range = `Corridas ${runs[0].numero}–${runs[runs.length - 1].numero}`;
  if (crosses.size === 1) return { label: `Bateria ${battery} · Cabeceiros ${runs[0].grupoCab} × Pezeiros ${runs[0].grupoPe} · ${range}`, mixed: false };
  return { label: `Bateria ${battery} · ${range}`, mixed: true };
};

/**
 * Divide as corridas em páginas de `perPage` linhas (faixas contam como linha).
 * Cada bateria abre com faixa; se quebrar de página, a faixa se repete como
 * continuação. Uma faixa nunca fica sozinha na última linha da página.
 */
export function paginateSumula(runs: SumulaRun[], perPage = 28): SumulaPage[] {
  const batteries = new Map<number, SumulaRun[]>();
  for (const run of runs) batteries.set(run.bateria, [...(batteries.get(run.bateria) ?? []), run]);
  const pages: SumulaPage[] = [];
  let page: SumulaPage = [];
  const push = (item: SumulaItem) => {
    if (page.length === perPage) {
      pages.push(page);
      page = [];
    }
    page.push(item);
  };
  for (const [battery, items] of batteries) {
    const { label, mixed } = bandLabel(battery, items);
    if (page.length >= perPage - 1) {
      pages.push(page);
      page = [];
    }
    push({ kind: 'band', label, continued: false, mixed });
    for (const run of items) {
      if (page.length === perPage) {
        pages.push(page);
        page = [{ kind: 'band', label: `${label} (continuação)`, continued: true, mixed }];
      }
      push({ kind: 'run', run, mixed });
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

/** "sumula-<slug>-v<versão>.pdf" para a prova; "sorteio-<slug>.pdf" para o avulso (versão nula). */
export function buildFilename(title: string, version: number | null): string {
  const slug = normalizeName(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sorteio';
  return version === null ? `sorteio-${slug}.pdf` : `sumula-${slug}-v${version}.pdf`;
}

/** Converte corridas do app (Run) para o formato da súmula. */
export const toSumulaRuns = (runs: Array<{ numero: number; bateria: number; cabeceiro: { nome: string; handicap: number }; pezeiro: { nome: string; handicap: number }; cabeceiroGrupo: string; pezeiroGrupo: string; shc: number; bois: number }>): SumulaRun[] =>
  runs.map((r) => ({
    numero: r.numero,
    bateria: r.bateria,
    cabeceiro: { nome: r.cabeceiro.nome, hc: r.cabeceiro.handicap },
    pezeiro: { nome: r.pezeiro.nome, hc: r.pezeiro.handicap },
    grupoCab: r.cabeceiroGrupo,
    grupoPe: r.pezeiroGrupo,
    shc: r.shc,
    bois: r.bois,
  }));
