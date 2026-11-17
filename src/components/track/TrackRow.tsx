'use client';

import type { Run } from '../../types/roping';
import { cn } from '../ui';
import { TimeCell } from './TimeCell';
import { TRACK_BULLS, TRACK_GRID } from './trackGrid';

type Bull = 1 | 2 | 3;
const hc = (n: number) => n.toFixed(1).replace('.', ',');
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));


interface Props {
  run: Run;
  current: boolean;
  disabled?: boolean;
  /** Maior quantidade de bois entre as corridas exibidas (vagas vazias alinham as colunas). */
  maxBulls?: number;
  onUpdateTime: (runId: string, bull: Bull, value: string, isNt?: boolean) => void;
}

export function TrackRow({ run, current, disabled, maxBulls = run.bois, onUpdateTime }: Props) {
  const bulls = ([1, 2, 3] as Bull[]).filter((b) => b <= run.bois);
  const timeOf = (b: Bull) => (b === 1 ? run.times.boi1 : b === 2 ? run.times.boi2 : run.times.boi3);
  const ntOf = (b: Bull) => Boolean(b === 1 ? run.times.boi1Nt : b === 2 ? run.times.boi2Nt : run.times.boi3Nt);
  return (
    <li
      id={`corrida-${run.numero}`}
      data-run-id={run.id}
      aria-current={current ? 'step' : undefined}
      className={cn(
        'grid scroll-mt-24 grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-l-4 border-transparent px-3 py-2.5',
        TRACK_GRID,
        current && 'border-ink-strong bg-highlight',
        run.isNt && 'opacity-80',
      )}
    >
      <span className="row-span-2 font-display text-2xl font-bold text-ink-strong lg:row-span-1">
        {run.numero}
        {current && <span className="mt-0.5 block w-fit rounded-ui bg-ink-strong px-1 font-display text-[0.65rem] uppercase tracking-wider text-sand">Atual</span>}
      </span>
      <span className="min-w-0 truncate text-sm text-ink-strong">
        <span className="font-semibold">{run.cabeceiro.nome}</span> <span className="text-ink-muted">{hc(run.cabeceiro.handicap)}</span>
        <span className="text-ink-muted lg:hidden"> × </span>
        <span className="font-semibold lg:hidden">{run.pezeiro.nome}</span>
      </span>
      <span className="hidden min-w-0 truncate text-sm lg:block">
        <span className="font-semibold text-ink-strong">{run.pezeiro.nome}</span> <span className="text-ink-muted">{hc(run.pezeiro.handicap)}</span>
      </span>
      <span className="hidden text-sm tabular-nums text-ink-muted lg:block">{hc(run.shc)}</span>
      <span className={cn('col-start-2 flex flex-wrap items-center gap-2 lg:col-start-auto', TRACK_BULLS)}>
        {bulls.map((b) => (
          <TimeCell key={b} runNumber={run.numero} bull={b} value={timeOf(b)} nt={ntOf(b)} disabled={disabled}
            onChange={(value) => onUpdateTime(run.id, b, value)} onNt={(nt) => onUpdateTime(run.id, b, '', nt)} />
        ))}
        {Array.from({ length: Math.max(0, maxBulls - bulls.length) }, (_, i) => <span key={`vaga-${i}`} aria-hidden="true" className="hidden lg:block" />)}
      </span>
      <span className="col-start-2 text-sm lg:col-start-auto lg:text-right">
        <span className="text-ink-muted lg:hidden">Total </span><span className="font-display text-lg font-bold tabular-nums text-ink-strong">{run.isNt ? 'NT' : fmt(run.totalTime)}</span>
      </span>
      <span className="col-start-2 text-sm lg:col-start-auto lg:text-right">
        <span className="text-ink-muted lg:hidden">Média </span><span className="font-display text-lg font-bold tabular-nums text-accent-ink">{run.isNt ? '—' : fmt(run.mediaFinal)}</span>
      </span>
    </li>
  );
}

/** Cabeçalho das colunas da pista (só no desktop, onde as colunas existem). */
export function TrackHeader({ maxBulls }: { maxBulls: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn('hidden border-b border-l-4 border-line border-l-transparent bg-sand px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-ink-muted lg:grid lg:gap-x-3', TRACK_GRID)}
    >
      <span>Nº</span>
      <span>Cabeceiro · HC</span>
      <span>Pezeiro · HC</span>
      <span>Soma HC</span>
      <span className={TRACK_BULLS}>
        {Array.from({ length: maxBulls }, (_, i) => <span key={i}>Boi {i + 1}</span>)}
      </span>
      <span className="text-right">Total</span>
      <span className="text-right">Média</span>
    </div>
  );
}
