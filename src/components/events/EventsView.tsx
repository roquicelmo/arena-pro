'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Pencil, Plus, Trophy, Users, X } from 'lucide-react';
import { useAction } from '../../lib/useAction';
import { cancelEventAction } from '../../server/actions/events';
import type { ArenaOption } from '../../types/arenas';
import type { EventSummary } from '../../types/events';
import { ArenasPanel } from '../arenas/ArenasPanel';
import { OwnerFilter } from '../filters/OwnerFilter';
import { Button, EmptyState, PageHeader, useConfirm } from '../ui';
import { EventFormDialog } from './EventFormDialog';
import { EventStatusBadge } from './EventStatusBadge';

export interface EventsViewProps {
  events: EventSummary[];
  arenas: ArenaOption[];
  owners: Array<{ id: string; name: string | null; email: string }>;
  canFilterOwners: boolean;
  ownerFilter: string;
  showCancelled: boolean;
  currentUserId: string;
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
}

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-ui text-ink-muted transition-colors hover:bg-nav hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const linkButton =
  'inline-flex min-h-10 items-center justify-center rounded-ui border border-line bg-surface px-4 text-sm font-semibold text-ink-strong transition-colors hover:bg-nav focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function EventsView({
  events, arenas, owners, canFilterOwners, ownerFilter, showCancelled, currentUserId, states, defaultCity,
}: EventsViewProps) {
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventSummary | undefined>();
  const cancel = useAction(cancelEventAction, { toastErrors: true, successMessage: 'Prova cancelada.' });

  const visible = showCancelled ? events : events.filter((event) => event.status !== 'CANCELADA');
  const hasCancelled = events.some((event) => event.status === 'CANCELADA');

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (event: EventSummary) => {
    setEditing(event);
    setFormOpen(true);
  };
  const onCancel = async (event: EventSummary) => {
    const confirmed = await confirm({
      title: 'Cancelar a prova?',
      description: `A prova "${event.name}" será marcada como cancelada.`,
      confirmLabel: 'Cancelar prova',
      cancelLabel: 'Manter prova',
      tone: 'danger',
    });
    if (confirmed) await cancel.execute(event.id);
  };

  const toggleParams = new URLSearchParams();
  if (ownerFilter) toggleParams.set('dono', ownerFilter);
  if (!showCancelled) toggleParams.set('canceladas', '1');
  const toggleQuery = toggleParams.toString();
  const toggleHref = toggleQuery ? `/provas?${toggleQuery}` : '/provas';
  const toggleLabel = showCancelled ? 'Ocultar canceladas' : 'Mostrar canceladas';

  return (
    <>
      <PageHeader
        title="Provas e arenas"
        actions={
          <Button onClick={openNew}>
            <Plus aria-hidden className="size-4" />
            Nova prova
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <section aria-label="Provas" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {canFilterOwners && (
              <div className="sm:w-64">
                <OwnerFilter owners={owners} value={ownerFilter} />
              </div>
            )}
            {(hasCancelled || showCancelled) && (
              <Link href={toggleHref} className={`${linkButton} sm:ml-auto`}>
                {toggleLabel}
              </Link>
            )}
          </div>

          {events.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Nenhuma prova cadastrada"
              description="Cadastre a primeira prova para abrir as inscrições."
              action={<Button onClick={openNew}>Cadastrar prova</Button>}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Nenhuma prova ativa"
              description="Todas as provas foram canceladas."
              action={<Link href={toggleHref} className={linkButton}>Mostrar canceladas</Link>}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((event) => {
                const cancelled = event.status === 'CANCELADA';
                return (
                  <li key={event.id}>
                    <article className="flex flex-col gap-3 rounded-ui border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 break-words font-display text-xl font-bold uppercase tracking-wide text-ink-strong">
                          {event.name}
                        </h2>
                        <EventStatusBadge status={event.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-2"><CalendarDays aria-hidden className="size-4" />{event.date}</span>
                        <span className="inline-flex min-w-0 items-center gap-2"><MapPin aria-hidden className="size-4 shrink-0" /><span className="break-words">{event.arena}</span></span>
                        <span className="inline-flex items-center gap-2"><Users aria-hidden className="size-4" />{event.registeredAthletes ?? 0} inscritos</span>
                      </div>
                      {canFilterOwners && (
                        <p className="break-words text-xs font-semibold text-ink-muted">Proprietário: {event.ownerName ?? 'Sem atribuição'}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                        <Link href={`/provas/${event.id}`} className={linkButton}>
                          Detalhes
                        </Link>
                        {!cancelled && (
                          <div className="flex items-center gap-1">
                            <button type="button" className={iconButton} aria-label={`Editar ${event.name}`} onClick={() => openEdit(event)}>
                              <Pencil aria-hidden className="size-4" />
                            </button>
                            <button type="button" className={iconButton} aria-label={`Cancelar ${event.name}`} onClick={() => void onCancel(event)}>
                              <X aria-hidden className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ArenasPanel arenas={arenas} canSeeOwners={canFilterOwners} currentUserId={currentUserId} states={states} defaultCity={defaultCity} />
      </div>

      <EventFormDialog open={formOpen} onClose={() => setFormOpen(false)} event={editing} arenas={arenas} states={states} defaultCity={defaultCity} />
    </>
  );
}
