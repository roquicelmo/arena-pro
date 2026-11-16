export type RunStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ELIMINATED';

export interface BullTime {
  bullNumber: number;
  timeSeconds: number | null;
  isNt: boolean;
}

/**
 * Total, média e status de uma corrida (regra atual): qualquer NT elimina; todos os
 * bois com tempo completam (total com 2 casas, média = total / bois); senão em
 * andamento (ou pendente sem nenhum tempo).
 */
export function computeRunResult(numberOfBulls: number, times: BullTime[]) {
  const isNt = times.some((t) => t.isNt);
  const complete = Array.from({ length: numberOfBulls }, (_, i) => i + 1)
    .every((bull) => times.some((t) => t.bullNumber === bull && t.timeSeconds !== null && !t.isNt));
  const totalTime = !isNt && complete ? Number(times.reduce((sum, t) => sum + Number(t.timeSeconds ?? 0), 0).toFixed(2)) : null;
  const averageTime = totalTime === null ? null : Number((totalTime / numberOfBulls).toFixed(2));
  const status: RunStatus = isNt ? 'ELIMINATED' : totalTime !== null ? 'COMPLETED' : times.length ? 'IN_PROGRESS' : 'PENDING';
  return { totalTime, averageTime, isNt, status };
}
