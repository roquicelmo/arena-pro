import React from 'react';
import Link from 'next/link';
import { CalendarDays, ClipboardList, FileText, MapPin, Mic2, Trophy, Users } from 'lucide-react';
import type { EventSummary } from '../types/events';

interface EventDetailsPageProps {
  event: EventSummary;
  /** Rota base da prova (`/provas/[id]`); os atalhos levam às sub-rotas. */
  baseHref: string;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ event, baseHref }) => (
  <section className="space-y-5">
    <div className="rounded-ui border border-line bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-ink">Detalhes da prova</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-strong">{event.name}</h2>
        </div>
        <span className="w-fit rounded-full bg-accent-soft px-3 py-1.5 text-xs font-extrabold text-accent-ink">
          {event.status}
        </span>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-ink-muted sm:grid-cols-2 lg:grid-cols-3">
        <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent-ink" />{event.date}</span>
        <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-accent-ink" />{event.arena}</span>
        <span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-accent-ink" />{event.format}</span>
        {event.steward && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-accent-ink" />Mesário: {event.steward}</span>}
        <span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-accent-ink" />Rodadas automáticas por handicap</span>
        <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-accent-ink" />Sem duplas fixas</span>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-ui bg-nav px-4 py-4">
          <p className="text-2xl font-extrabold text-ink-strong">{event.fixedPairs ?? event.registeredAthletes ?? 0}</p>
          <p className="mt-1 text-xs text-ink-muted">{event.fixedPairs ? 'Duplas fixas' : 'Atletas inscritos'}</p>
        </div>
        <div className="rounded-ui bg-accent-soft px-4 py-4">
          <p className="text-2xl font-extrabold text-accent-ink">{event.runs}</p>
          <p className="mt-1 text-xs text-ink-muted">Versões do sorteio</p>
        </div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Link href={`${baseHref}/inscricoes`} className="inline-flex items-center justify-center gap-2 rounded-ui bg-nav px-4 py-3 text-sm font-bold text-ink-strong transition hover:bg-line-soft">
        <ClipboardList className="h-4 w-4" /> Inscrições
      </Link>
      <Link href={`${baseHref}/sorteio`} className="inline-flex items-center justify-center gap-2 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-on-accent transition hover:bg-accent-hover">
        <Trophy className="h-4 w-4" /> Sorteio e pista
      </Link>
      <Link href={`${baseHref}/locucao`} className="inline-flex items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 py-3 text-sm font-bold text-ink-strong transition hover:bg-nav">
        <Mic2 className="h-4 w-4" /> Tela do locutor
      </Link>
      <Link href={`${baseHref}/resultado`} className="inline-flex items-center justify-center gap-2 rounded-ui border border-line bg-surface px-4 py-3 text-sm font-bold text-ink-strong transition hover:bg-nav">
        <FileText className="h-4 w-4" /> Resultado final
      </Link>
    </div>
  </section>
);
