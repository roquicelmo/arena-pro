'use client';

import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import type { BatteryMode, Competitor, DrawConfig } from '../../types/roping';
import { assignCompetitorsToGroups } from '../../utils/drawAlgorithm';
import { batteryRecommendation, boisDistribution, countPossibleRuns, effectiveBatteries, majorBatteries } from '../../lib/drawPlanning';
import { Button, cn } from '../ui';

interface Props {
  config: DrawConfig;
  onChange: (config: DrawConfig) => void;
  cabeceiros: Competitor[];
  pezeiros: Competitor[];
  disabled?: boolean;
}

const card = 'rounded-ui border border-line bg-surface p-4';
const cardTitle = 'font-display text-lg font-bold uppercase tracking-wide text-ink-strong';

function Choice({ active, onClick, title, sub, disabled }: { active: boolean; onClick: () => void; title: string; sub: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-ui border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
        active ? 'border-ink-strong bg-ink-strong text-sand' : 'border-line bg-surface text-ink-strong hover:bg-nav',
      )}
    >
      <span className="block font-display font-bold uppercase tracking-wide">{title}</span>
      <span className={cn('block text-xs', active ? 'text-sand/80' : 'text-ink-muted')}>{sub}</span>
    </button>
  );
}

/** Configuração do sorteio (grupos, baterias, regras) com resumo; usada na prova e no sorteio avulso. */
export function DrawSetup({ config, onChange, cabeceiros, pezeiros, disabled }: Props) {
  const runs = useMemo(() => countPossibleRuns(cabeceiros, pezeiros), [cabeceiros, pezeiros]);
  const bois = useMemo(() => boisDistribution(cabeceiros, pezeiros), [cabeceiros, pezeiros]);
  const groups = useMemo(
    () => assignCompetitorsToGroups(cabeceiros, pezeiros, config.numGroups, config.balanceGroups),
    [cabeceiros, pezeiros, config.numGroups, config.balanceGroups],
  );
  const { numBatteries, mode } = effectiveBatteries(config);
  const rec = batteryRecommendation(runs, config.numGroups, config);
  const phases = config.numGroups * config.numGroups;
  const major = majorBatteries(config.numGroups);
  const set = (patch: Partial<DrawConfig>) => onChange({ ...config, ...patch });
  const setBatteries = (n: number, m: BatteryMode) => set({ numBatteries: n, batteryMode: m });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-4">
        <section className={card} aria-labelledby="draw-groups">
          <h2 id="draw-groups" className={cardTitle}>Grupos</h2>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quantidade de grupos">
            {[2, 3, 4].map((n) => (
              <Choice key={n} disabled={disabled} active={config.numGroups === n} title={`${n} grupos`} sub={`${n * n} cruzamentos`}
                onClick={() => onChange({ ...config, numGroups: n, numBatteries: undefined, batteryMode: undefined })} />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-ink-strong">
            <input type="checkbox" className="h-4 w-4 accent-accent" disabled={disabled} checked={config.balanceGroups} onChange={(e) => set({ balanceGroups: e.target.checked })} />
            Equilibrar os grupos por handicap
          </label>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {groups.groupLetters.map((letter) => (
              <li key={letter} className="rounded-ui bg-nav px-3 py-2 text-sm">
                <span className="font-display text-base font-bold text-ink-strong">Grupo {letter}</span>
                <span className="block text-ink-muted">{(groups.cabeceirosByGroup[letter] ?? []).length} cab. · {(groups.pezeirosByGroup[letter] ?? []).length} pé</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={card} aria-labelledby="draw-batteries">
          <h2 id="draw-batteries" className={cardTitle}>Baterias</h2>
          <div className="mt-3 flex flex-col gap-2 rounded-ui bg-accent-soft p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-2 text-ink-strong">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
              <span><strong>Recomendado: {rec.title}.</strong> {rec.reason}</span>
            </p>
            <Button size="sm" variant="secondary" disabled={disabled || rec.isApplied} onClick={() => setBatteries(rec.numBatteries, rec.batteryMode)}>
              {rec.isApplied ? 'Aplicada' : 'Aplicar recomendação'}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Organização das baterias">
            <Choice disabled={disabled} active={mode === 'phases'} title={`${phases} baterias`} sub="Uma por cruzamento" onClick={() => setBatteries(phases, 'phases')} />
            <Choice disabled={disabled} active={numBatteries === major.num && mode !== 'phases'} title={major.label} sub={major.sub} onClick={() => setBatteries(major.num, major.mode)} />
            <Choice disabled={disabled} active={mode === 'single'} title="1 bateria" sub="Sem paradas" onClick={() => setBatteries(1, 'single')} />
            <label className="rounded-ui border border-line px-3 py-2 text-sm text-ink-strong">
              <span className="block font-display font-bold uppercase tracking-wide">Personalizado</span>
              <input type="number" min={1} max={32} disabled={disabled} aria-label="Quantidade de baterias" value={numBatteries}
                onChange={(e) => setBatteries(Math.min(32, Math.max(1, Number(e.target.value) || 1)), 'custom')}
                className="mt-1 h-8 w-20 rounded-ui border border-line bg-surface px-2" />
            </label>
          </div>
        </section>

        <section className={card} aria-labelledby="draw-rules">
          <h2 id="draw-rules" className={cardTitle}>Regras</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-ink-strong">
              <span className="block font-semibold">Distância mínima entre corridas do mesmo atleta</span>
              <input type="number" min={0} max={100} disabled={disabled} value={config.minGap}
                onChange={(e) => set({ minGap: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                className="mt-1 h-10 w-24 rounded-ui border border-line bg-surface px-3" />
              <span className="mt-1 block text-xs text-ink-muted">Dentro da mesma bateria.</span>
            </label>
            <div className="text-sm">
              <p className="font-semibold text-ink-strong">Bois por soma de handicap (SHC)</p>
              <p className="text-xs text-ink-muted">até 3,5 → 1 boi · 4,0 a 5,5 → 2 · 6,0 ou mais → 3</p>
              <p className="mt-1 text-ink-strong">{bois.b1} duplas com 1 boi · {bois.b2} com 2 · {bois.b3} com 3</p>
            </div>
          </div>
        </section>
      </div>

      <aside className={cn(card, 'h-fit xl:sticky xl:top-4')} aria-label="Resumo do sorteio">
        <h2 className={cardTitle}>Resumo</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {[['Cabeceiros', cabeceiros.length], ['Pezeiros', pezeiros.length], ['Corridas', runs], ['Baterias', numBatteries]].map(([label, value]) => (
            <div key={label as string} className="rounded-ui bg-nav px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
              <dd className="font-display text-2xl font-bold text-ink-strong">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-muted">~{numBatteries ? Math.ceil(runs / numBatteries) : runs} corridas por bateria.</p>
      </aside>
    </div>
  );
}
