'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Plus } from 'lucide-react';
import type { EventSummary } from '../types/events';
import { EmptyState, StatTile } from './ui';

interface DashboardProps {
  athleteCount: number;
  /** Destino do atalho para iniciar um sorteio. */
  startDrawHref: string;
  events?: EventSummary[];
  owners?: Array<{ id: string; name: string | null; email: string }>;
  canFilterOwners?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  athleteCount,
  startDrawHref,
  events = [],
  owners = [],
  canFilterOwners = false,
}) => {
  const [ownerId, setOwnerId] = React.useState('');
  const visibleEvents = events.filter((event) => !ownerId || event.ownerId === ownerId);
  const openEvents = visibleEvents.filter((event) => event.status === 'ABERTA').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canFilterOwners ? (
          <select
            aria-label="Filtrar por proprietário"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            className="h-10 rounded-ui border border-line bg-surface px-3 text-sm text-ink-strong"
          >
            <option value="">Todos os proprietários</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name ?? owner.email}</option>)}
          </select>
        ) : <span />}
        <Link
          href={startDrawHref}
          className="inline-flex h-10 items-center gap-2 rounded-ui bg-accent px-4 text-[0.95rem] font-semibold text-on-accent hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Começar um sorteio
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile label="Atletas" value={athleteCount} hint="Disponíveis para novas inscrições" />
        <StatTile label="Provas" value={visibleEvents.length} hint="No contexto selecionado" />
        <StatTile label="Provas abertas" value={openEvents} hint="Aguardando sorteio" />
      </section>

      <section className="rounded-ui border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-strong">Provas recentes</h2>
          <Link href="/provas" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover">
            Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {visibleEvents.length ? (
          <ul className="divide-y divide-line">
            {visibleEvents.slice(0, 5).map((event) => (
              <li key={event.id}>
                <Link href={`/provas/${event.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-nav">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink-strong">{event.name}</span>
                    <span className="block truncate text-sm text-ink-muted">{event.arena} · {event.date}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">{event.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma prova cadastrada"
              description="Crie uma prova para acompanhar inscrições, sorteio e resultado neste painel."
            />
          </div>
        )}
      </section>
    </div>
  );
};
