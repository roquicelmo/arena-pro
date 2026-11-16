'use client';

import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAction } from '../../lib/useAction';
import { deactivateArenaAction } from '../../server/actions/arenas';
import type { ArenaOption } from '../../types/arenas';
import { Badge, Button, EmptyState, useConfirm } from '../ui';
import { ArenaFormDialog } from './ArenaFormDialog';

export interface ArenasPanelProps {
  arenas: ArenaOption[];
  canSeeOwners: boolean;
  currentUserId: string;
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
}

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-ui text-ink-muted transition-colors hover:bg-nav hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function ArenasPanel({ arenas, canSeeOwners, currentUserId, states, defaultCity }: ArenasPanelProps) {
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ArenaOption | undefined>();
  const deactivate = useAction(deactivateArenaAction, { toastErrors: true, successMessage: 'Arena desativada.' });

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (arena: ArenaOption) => {
    setEditing(arena);
    setFormOpen(true);
  };
  const onDeactivate = async (arena: ArenaOption) => {
    const confirmed = await confirm({
      title: 'Desativar a arena?',
      description: `${arena.name} deixa de aparecer na escolha de arenas. Provas já cadastradas continuam com ela.`,
      confirmLabel: 'Desativar arena',
      tone: 'danger',
    });
    if (confirmed) await deactivate.execute(arena.id);
  };

  return (
    <section aria-label="Arenas" className="flex min-w-0 flex-col gap-3 rounded-ui border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-strong">Arenas</h2>
        <Button variant="secondary" onClick={openNew}>
          <Plus aria-hidden className="size-4" />
          Nova arena
        </Button>
      </div>

      {arenas.length === 0 ? (
        <EmptyState icon={MapPin} title="Nenhuma arena cadastrada" description="Cadastre uma arena para usar nas provas." />
      ) : (
        <ul className="divide-y divide-line">
          {arenas.map((arena) => {
            const shared = !canSeeOwners && arena.ownerId !== undefined && arena.ownerId !== currentUserId;
            return (
              <li key={arena.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink-strong">{arena.name}</p>
                  <p className="break-words text-xs text-ink-muted">
                    {arena.cityCode === undefined ? 'Cidade a revisar' : `${arena.city}/${arena.state}`}
                  </p>
                  {canSeeOwners && arena.ownerName && <p className="break-words text-xs text-ink-muted">Proprietário: {arena.ownerName}</p>}
                  {shared && (
                    <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-ink-muted">
                      <Badge tone="accent">Compartilhada</Badge>
                    </p>
                  )}
                </div>
                {!shared && (
                  <div className="flex shrink-0 items-center">
                    <button type="button" className={iconButton} aria-label={`Editar ${arena.name}`} onClick={() => openEdit(arena)}>
                      <Pencil aria-hidden className="size-4" />
                    </button>
                    <button type="button" className={iconButton} aria-label={`Desativar ${arena.name}`} onClick={() => void onDeactivate(arena)}>
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ArenaFormDialog open={formOpen} onClose={() => setFormOpen(false)} arena={editing} states={states} defaultCity={defaultCity} />
    </section>
  );
}
