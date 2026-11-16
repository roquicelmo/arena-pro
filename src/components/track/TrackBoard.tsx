'use client';

import { useMemo, useState } from 'react';
import { Crosshair, Download, Eraser } from 'lucide-react';
import type { Run } from '../../types/roping';
import { currentRunId, trackStats } from '../../lib/currentRun';
import { normalizeName } from '../../lib/text';
import { Button, Input, Select, StatTile } from '../ui';
import { TrackRow } from './TrackRow';

type Bull = 1 | 2 | 3;

interface Props {
  runs: Run[];
  onUpdateTime: (runId: string, bull: Bull, value: string, isNt?: boolean) => void;
  onClearAllTimes: () => void;
}

const csvCell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function exportCsv(runs: Run[]) {
  const head = ['Nº', 'Bateria', 'Cruzamento', 'Cabeceiro', 'HC Cab.', 'Pezeiro', 'HC Pé', 'SHC', 'Bois', 'T1', 'T2', 'T3', 'Total', 'Média', 'NT'];
  const rows = runs.map((r) => [r.numero, r.bateria, r.cruzamento, r.cabeceiro.nome, r.cabeceiro.handicap, r.pezeiro.nome, r.pezeiro.handicap, r.shc, r.bois,
    r.times.boi1, r.times.boi2, r.times.boi3, r.totalTime, r.mediaFinal, r.isNt ? 'sim' : '']);
  const blob = new Blob(['﻿' + [head, ...rows].map((row) => row.map(csvCell).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pista.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Pista (spec 6.6): estatísticas, corrida atual, busca/bateria e lançamento por teclado. */
export function TrackBoard({ runs, onUpdateTime, onClearAllTimes }: Props) {
  const [search, setSearch] = useState('');
  const [battery, setBattery] = useState('');
  const current = useMemo(() => currentRunId(runs), [runs]);
  const stats = useMemo(() => trackStats(runs), [runs]);
  const batteries = useMemo(() => [...new Set(runs.map((r) => r.bateria))].sort((a, b) => a - b), [runs]);
  const visible = useMemo(() => {
    const q = normalizeName(search.replace('#', ''));
    return runs.filter((r) => (!battery || String(r.bateria) === battery)
      && (!q || String(r.numero) === q || normalizeName(`${r.cabeceiro.nome} ${r.pezeiro.nome}`).includes(q)));
  }, [runs, search, battery]);
  const grouped = useMemo(() => {
    const map = new Map<number, Run[]>();
    for (const r of visible) map.set(r.bateria, [...(map.get(r.bateria) ?? []), r]);
    return [...map.entries()];
  }, [visible]);

  const goToCurrent = () => {
    const run = runs.find((r) => r.id === current);
    if (!run) return;
    setSearch('');
    setBattery('');
    requestAnimationFrame(() => {
      const row = document.getElementById(`corrida-${run.numero}`);
      row?.scrollIntoView({ block: 'center' });
      row?.querySelector<HTMLInputElement>('input[data-time-cell]')?.focus();
    });
  };

  return (
    <div className="grid gap-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Estatísticas da pista">
        <StatTile label="Concluídas" value={stats.completed} hint={`de ${runs.length} corridas`} />
        <StatTile label="NT" value={stats.nt} hint="Eliminadas" />
        <StatTile label="Restantes" value={stats.remaining} hint="Sem tempo completo" />
        <StatTile label="Melhor média" value={stats.best === null ? '—' : stats.best.toFixed(2).replace('.', ',')} hint="Menor é melhor" />
      </section>

      <div className="flex flex-col gap-3 rounded-ui border border-line bg-surface p-3 md:flex-row md:items-end">
        <div className="md:w-72"><Input label="Buscar corrida" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nº ou nome do laçador" /></div>
        <div className="md:w-44">
          <Select label="Bateria" value={battery} onChange={(e) => setBattery(e.target.value)}>
            <option value="">Todas</option>
            {batteries.map((b) => <option key={b} value={b}>Bateria {b}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <Button disabled={!current} onClick={goToCurrent}><Crosshair className="h-4 w-4" aria-hidden="true" /> Ir para a corrida atual</Button>
          <Button variant="secondary" onClick={() => exportCsv(runs)}><Download className="h-4 w-4" aria-hidden="true" /> CSV</Button>
          <Button variant="ghost" onClick={onClearAllTimes}><Eraser className="h-4 w-4" aria-hidden="true" /> Limpar tempos</Button>
        </div>
      </div>
      <p className="text-xs text-ink-muted">Teclado: <kbd>Enter</kbd> avança para o próximo tempo · <kbd>N</kbd> marca NT · <kbd>Esc</kbd> desfaz a edição do campo.</p>

      {grouped.map(([b, items]) => {
        const crosses = [...new Set(items.map((r) => r.cruzamento))];
        return (
          <section key={b} className="min-w-0 overflow-hidden rounded-ui border border-line bg-surface" aria-label={`Bateria ${b}`}>
            <h2 className="bg-nav px-3 py-2 font-display text-base font-bold uppercase tracking-wide text-ink-strong">
              Bateria {b}{crosses.length === 1 ? ` · ${crosses[0]}` : ''}
            </h2>
            <ol className="divide-y divide-line">
              {items.map((run) => <TrackRow key={run.id} run={run} current={run.id === current} onUpdateTime={onUpdateTime} />)}
            </ol>
          </section>
        );
      })}
      {!grouped.length && <p className="rounded-ui border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-muted">Nenhuma corrida encontrada.</p>}
    </div>
  );
}
