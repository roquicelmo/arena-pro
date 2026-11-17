'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import type { Competitor } from '../../types/roping';
import type { EventRegistrationItem } from '../../server/services/draws';
import { normalizeName } from '../../lib/text';
import { cancelRegistrationAction, registerAthleteAction } from '../../server/actions/draws';
import { Button, EmptyState, Input, cn, toast, useConfirm } from '../ui';

type Category = 'CABECEIRO' | 'PEZEIRO';

interface Props {
  eventId: string;
  registrations: EventRegistrationItem[];
  athletes: Competitor[];
}

const STEPS: { category: Category; label: string; plural: string; short: string }[] = [
  { category: 'CABECEIRO', label: 'Cabeceiros', plural: 'cabeceiros', short: 'cabeceiro' },
  { category: 'PEZEIRO', label: 'Pezeiros', plural: 'pezeiros', short: 'pezeiro' },
];

const hc = (value: number | undefined) => (value ?? 0).toFixed(1).replace('.', ',');
const handicapFor = (athlete: Competitor, category: Category) =>
  category === 'CABECEIRO' ? athlete.headHandicap ?? athlete.handicap : athlete.heelHandicap ?? athlete.handicap;

/**
 * Inscrição em duas etapas (cabeceiros, depois pezeiros): à esquerda os atletas
 * disponíveis, à direita os inscritos da etapa. Um clique na linha inscreve ou
 * cancela. Cada atleta tem uma única inscrição por prova, então quem já entrou
 * numa categoria some da lista da outra.
 */
export function RegistrationsView({ eventId, registrations, athletes }: Props) {
  const confirm = useConfirm();
  const [stepIndex, setStepIndex] = useState(0);
  const [search, setSearch] = useState('');
  /** Inscrições enviadas e ainda não refletidas pelo servidor (id do atleta → categoria). */
  const [pending, setPending] = useState<Map<string, Category>>(() => new Map());
  const [cancelling, setCancelling] = useState<Set<string>>(() => new Set());
  const step = STEPS[stepIndex];

  const registeredIds = useMemo(() => new Set(registrations.map((r) => r.athlete.id)), [registrations]);
  const counts = useMemo(() => {
    const result: Record<Category, number> = { CABECEIRO: 0, PEZEIRO: 0 };
    for (const r of registrations) if (!cancelling.has(r.registrationId)) result[r.category] += 1;
    for (const [id, category] of pending) if (!registeredIds.has(id)) result[category] += 1;
    return result;
  }, [registrations, pending, cancelling, registeredIds]);

  const inStep = registrations.filter((r) => r.category === step.category && !cancelling.has(r.registrationId));
  const pendingInStep = athletes.filter((a) => pending.get(a.id) === step.category && !registeredIds.has(a.id));
  const available = useMemo(() => {
    const q = normalizeName(search);
    return athletes.filter(
      (a) => !registeredIds.has(a.id) && !pending.has(a.id) && (!q || normalizeName([a.nome, a.apelido, a.cidade].filter(Boolean).join(' ')).includes(q)),
    );
  }, [athletes, registeredIds, pending, search]);

  const onRegister = async (athlete: Competitor) => {
    const category = step.category;
    setPending((current) => new Map(current).set(athlete.id, category));
    let failure: string | null = null;
    try {
      const result = await registerAthleteAction(eventId, { athleteId: athlete.id, category });
      if (!result.ok) failure = result.message;
    } catch {
      failure = 'Não foi possível inscrever. Verifique a conexão e tente de novo.';
    }
    if (failure) toast.error(`${athlete.nome}: ${failure}`);
    setPending((current) => {
      const next = new Map(current);
      next.delete(athlete.id);
      return next;
    });
  };

  const onCancel = async (item: EventRegistrationItem) => {
    const ok = await confirm({
      title: 'Cancelar a inscrição?',
      description: `${item.athlete.nome} sai da lista de ${step.plural}. Para entrar no sorteio, gere ou refaça o sorteio depois.`,
      confirmLabel: 'Cancelar inscrição',
      cancelLabel: 'Manter',
      tone: 'danger',
    });
    if (!ok) return;
    setCancelling((current) => new Set(current).add(item.registrationId));
    let failure: string | null = null;
    try {
      const result = await cancelRegistrationAction(eventId, item.registrationId);
      if (!result.ok) failure = result.message;
    } catch {
      failure = 'Não foi possível cancelar. Verifique a conexão e tente de novo.';
    }
    if (failure) toast.error(failure);
    else toast.success('Inscrição cancelada.');
    setCancelling((current) => {
      const next = new Set(current);
      next.delete(item.registrationId);
      return next;
    });
  };

  const rowClass =
    'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset disabled:cursor-wait disabled:opacity-60';

  const emptyAvailable = search ? (
    <EmptyState icon={Search} title="Nenhum atleta encontrado" description="Ajuste a busca." />
  ) : athletes.length === 0 ? (
    <EmptyState
      icon={Users}
      title="Nenhum atleta cadastrado"
      description="Cadastre atletas para inscrevê-los nesta prova."
      action={
        <Link href="/atletas" className="text-sm font-semibold text-accent-ink underline underline-offset-2">
          Ir para Atletas
        </Link>
      }
    />
  ) : (
    <EmptyState icon={Check} title="Todos já inscritos" description="Todos os atletas disponíveis já estão nesta prova." />
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Etapas da inscrição" className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, index) => (
            <button
              key={s.category}
              type="button"
              aria-current={index === stepIndex ? 'step' : undefined}
              onClick={() => setStepIndex(index)}
              className={cn(
                'flex items-center gap-2 rounded-ui border px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors',
                index === stepIndex ? 'border-accent bg-accent-soft text-ink-strong' : 'border-line bg-surface text-ink-muted hover:text-ink-strong',
              )}
            >
              <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs', index === stepIndex ? 'bg-accent text-on-accent' : 'bg-sand')}>
                {index + 1}
              </span>
              {s.label} ({counts[s.category]})
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {stepIndex > 0 ? (
            <Button variant="secondary" onClick={() => setStepIndex(stepIndex - 1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para {STEPS[stepIndex - 1].plural}
            </Button>
          ) : null}
          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={() => { setStepIndex(stepIndex + 1); setSearch(''); }}>
              Avançar para {STEPS[stepIndex + 1].plural} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Link href={`/provas/${eventId}/sorteio`} className="inline-flex items-center gap-2 rounded-ui bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">
              Ir para o sorteio <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="disponiveis" className="flex min-w-0 flex-col rounded-ui border border-line bg-surface lg:h-[calc(100dvh-20rem)] lg:min-h-[24rem]">
          <div className="border-b border-line p-4">
            <h2 id="disponiveis" className="font-display text-lg font-bold uppercase tracking-wide text-ink-strong">
              Atletas disponíveis ({available.length})
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Clique no atleta para inscrevê-lo como {step.short}.</p>
            <div className="relative mt-3">
              <Input label="Buscar atleta" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, apelido ou cidade" />
              <Search className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-ink-muted" aria-hidden="true" />
            </div>
          </div>
          {available.length ? (
            <ul className="max-h-[32rem] min-h-0 divide-y lg:max-h-none lg:flex-1 divide-line overflow-y-auto">
              {available.map((a) => (
                <li key={a.id}>
                  <button type="button" className={rowClass} aria-label={`Inscrever ${a.nome} como ${step.short}`} onClick={() => void onRegister(a)}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-strong">{a.nome}</span>
                      <span className="text-xs text-ink-muted">
                        HC {hc(handicapFor(a, step.category))}
                        {a.cidade ? ` · ${a.cidade}` : ''}
                      </span>
                    </span>
                    <UserPlus className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">{emptyAvailable}</div>
          )}
        </section>

        <section aria-labelledby="inscritos" className="flex min-w-0 flex-col rounded-ui border border-line bg-surface lg:h-[calc(100dvh-20rem)] lg:min-h-[24rem]">
          <div className="border-b border-line p-4">
            <h2 id="inscritos" className="font-display text-lg font-bold uppercase tracking-wide text-ink-strong">
              {step.label} inscritos ({inStep.length + pendingInStep.length})
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Clique para cancelar uma inscrição.</p>
          </div>
          {inStep.length || pendingInStep.length ? (
            <ul className="max-h-[36rem] min-h-0 divide-y lg:max-h-none lg:flex-1 divide-line overflow-y-auto">
              {inStep.map((item) => (
                <li key={item.registrationId}>
                  <button type="button" className={rowClass} aria-label={`Cancelar inscrição de ${item.athlete.nome}`} onClick={() => void onCancel(item)}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-strong">{item.athlete.nome}</span>
                      <span className="text-xs text-ink-muted">
                        HC {hc(handicapFor(item.athlete, step.category))}
                        {item.athlete.cidade ? ` · ${item.athlete.cidade}` : ''}
                      </span>
                    </span>
                    <UserMinus className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {pendingInStep.map((a) => (
                <li key={`pending-${a.id}`}>
                  <button type="button" className={rowClass} disabled aria-label={`Inscrevendo ${a.nome}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-strong">{a.nome}</span>
                      <span className="text-xs text-ink-muted">Inscrevendo…</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-ink-muted">Nenhum {step.short} inscrito. Clique nos atletas à esquerda.</p>
          )}
        </section>
      </div>

    </div>
  );
}
