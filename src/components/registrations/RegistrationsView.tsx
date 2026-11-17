'use client';

import { useMemo, useState } from 'react';
import { Search, UserMinus, Users } from 'lucide-react';
import type { Competitor } from '../../types/roping';
import type { EventRegistrationItem } from '../../server/services/draws';
import { normalizeName } from '../../lib/text';
import { useAction } from '../../lib/useAction';
import { cancelRegistrationAction, registerAthleteAction } from '../../server/actions/draws';
import { Button, EmptyState, Input, useConfirm } from '../ui';

interface Props {
  eventId: string;
  registrations: EventRegistrationItem[];
  athletes: Competitor[];
}

const hc = (value: number | undefined) => (value ?? 0).toFixed(1).replace('.', ',');

export function RegistrationsView({ eventId, registrations, athletes }: Props) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const register = useAction(
    (input: { athleteId: string; category: 'CABECEIRO' | 'PEZEIRO' }) => registerAthleteAction(eventId, input),
    { successMessage: 'Inscrição feita.', toastErrors: true },
  );
  const cancel = useAction((registrationId: string) => cancelRegistrationAction(eventId, registrationId), {
    successMessage: 'Inscrição cancelada.',
    toastErrors: true,
  });

  const cabeceiros = registrations.filter((r) => r.category === 'CABECEIRO');
  const pezeiros = registrations.filter((r) => r.category === 'PEZEIRO');
  const registered = useMemo(() => new Set(registrations.map((r) => r.athlete.id)), [registrations]);
  const available = useMemo(() => {
    const q = normalizeName(search);
    return athletes.filter((a) => !registered.has(a.id) && (!q || normalizeName([a.nome, a.apelido, a.cidade].filter(Boolean).join(' ')).includes(q)));
  }, [athletes, registered, search]);

  const onCancel = async (item: EventRegistrationItem) => {
    const ok = await confirm({
      title: 'Cancelar a inscrição?',
      description: `${item.athlete.nome} sai da lista de ${item.category === 'CABECEIRO' ? 'cabeceiros' : 'pezeiros'}. Para entrar no sorteio, gere ou refaça o sorteio depois.`,
      confirmLabel: 'Cancelar inscrição',
      cancelLabel: 'Manter',
      tone: 'danger',
    });
    if (ok) await cancel.execute(item.registrationId);
  };

  const column = (title: string, items: EventRegistrationItem[], empty: string) => (
    <section className="min-w-0 rounded-ui border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-3 font-display text-lg font-bold uppercase tracking-wide text-ink-strong">
        {title} ({items.length})
      </h2>
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.registrationId} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-strong">{item.athlete.nome}</span>
                <span className="text-xs text-ink-muted">HC {hc(item.athlete.handicap)}{item.athlete.cidade ? ` · ${item.athlete.cidade}` : ''}</span>
              </span>
              <Button variant="ghost" size="sm" aria-label={`Cancelar inscrição de ${item.athlete.nome}`} disabled={cancel.pending} onClick={() => void onCancel(item)}>
                <UserMinus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-ink-muted">{empty}</p>
      )}
    </section>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {column('Cabeceiros', cabeceiros, 'Nenhum cabeceiro inscrito.')}
        {column('Pezeiros', pezeiros, 'Nenhum pezeiro inscrito.')}
      </div>
      <section className="min-w-0 rounded-ui border border-line bg-surface p-4">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink-strong">Inscrever atletas</h2>
        <div className="relative mt-3">
          <Input label="Buscar atleta" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, apelido ou cidade" />
          <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-ink-muted" aria-hidden="true" />
        </div>
        {available.length ? (
          <ul className="mt-3 max-h-[28rem] divide-y divide-line overflow-y-auto">
            {available.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-strong">{a.nome}</span>
                  <span className="text-xs text-ink-muted">Cab. {hc(a.headHandicap)} · Pé {hc(a.heelHandicap)}</span>
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant="secondary" disabled={register.pending} aria-label={`Inscrever ${a.nome} como cabeceiro`} onClick={() => void register.execute({ athleteId: a.id, category: 'CABECEIRO' })}>
                    Cab.
                  </Button>
                  <Button size="sm" variant="secondary" disabled={register.pending} aria-label={`Inscrever ${a.nome} como pezeiro`} onClick={() => void register.execute({ athleteId: a.id, category: 'PEZEIRO' })}>
                    Pé
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState icon={Users} title={search ? 'Nenhum atleta encontrado' : 'Todos já inscritos'} description={search ? 'Ajuste a busca.' : 'Cadastre atletas em Atletas para inscrevê-los.'} />
          </div>
        )}
      </section>
    </div>
  );
}
