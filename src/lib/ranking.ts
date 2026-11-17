import type { Run } from '../types/roping';

/** Classificação: menor média primeiro; depois NT e incompletas, em ordem de número. */
export function rankRuns(runs: Run[]) {
  const ranked = runs.filter((r) => !r.isNt && r.mediaFinal !== null && r.mediaFinal !== undefined)
    .sort((a, b) => (a.mediaFinal as number) - (b.mediaFinal as number) || a.numero - b.numero);
  const byNumber = (a: Run, b: Run) => a.numero - b.numero;
  return {
    ranked,
    eliminated: runs.filter((r) => r.isNt).sort(byNumber),
    pending: runs.filter((r) => !r.isNt && (r.mediaFinal === null || r.mediaFinal === undefined)).sort(byNumber),
  };
}
