'use client';

import { useMemo, useState } from 'react';
import type { Competitor } from '../../types/roping';
import { normalizeName } from '../../lib/text';
import { Button, Input } from '../ui';

interface Props {
  title: string;
  athletes: Competitor[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  handicapOf: (athlete: Competitor) => number | undefined;
}

/** Lista com busca e caixas de seleção (substitui o TransferList). */
export function ParticipantPicker({ title, athletes, selected, onChange, handicapOf }: Props) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const q = normalizeName(search);
    return q ? athletes.filter((a) => normalizeName([a.nome, a.apelido, a.cidade].filter(Boolean).join(' ')).includes(q)) : athletes;
  }, [athletes, search]);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <section className="rounded-ui border border-line bg-surface p-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink-strong">{title} ({selected.size})</h2>
        <span className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => onChange(new Set([...selected, ...visible.map((a) => a.id)]))}>Selecionar todos</Button>
          <Button size="sm" variant="ghost" disabled={!selected.size} onClick={() => onChange(new Set())}>Limpar</Button>
        </span>
      </div>
      <div className="mt-3">
        <Input label={`Buscar em ${title.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, apelido ou cidade" />
      </div>
      <ul className="mt-3 max-h-[24rem] divide-y divide-line overflow-y-auto">
        {visible.map((a) => (
          <li key={a.id}>
            <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-accent" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-strong">{a.nome}</span>
              <span className="text-xs text-ink-muted">HC {(handicapOf(a) ?? 0).toFixed(1).replace('.', ',')}</span>
            </label>
          </li>
        ))}
        {!visible.length && <li className="py-4 text-sm text-ink-muted">Nenhum atleta encontrado.</li>}
      </ul>
    </section>
  );
}
