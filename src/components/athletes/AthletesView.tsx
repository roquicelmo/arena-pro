'use client';

import { useMemo, useState } from 'react';
import { NotebookPen, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import type { Competitor } from '../../types/roping';
import { useAction } from '../../lib/useAction';
import { normalizeName } from '../../lib/text';
import { deactivateAthleteAction } from '../../server/actions/athletes';
import { OwnerFilter } from '../filters/OwnerFilter';
import { Badge, Button, EmptyState, Input, PageHeader, useConfirm } from '../ui';
import { AthleteFormDialog } from './AthleteFormDialog';
import { AthleteNotesDialog } from './AthleteNotesDialog';

export interface AthletesViewProps {
  athletes: Competitor[];
  notes: Record<string, string>;
  owners: Array<{ id: string; name: string | null; email: string }>;
  canFilterOwners: boolean;
  ownerFilter: string;
  currentUserId: string;
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
}

const GRID_BASE = 'md:grid md:items-center md:gap-4';
const GRID = `${GRID_BASE} md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_4.5rem_4.5rem_auto]`;
const GRID_OWNER = `${GRID_BASE} md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_4.5rem_4.5rem_minmax(0,1fr)_auto]`;

const iconButton =
  'relative inline-flex size-10 items-center justify-center rounded-ui text-ink-muted transition-colors hover:bg-nav hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function AthletesView({ athletes, notes, owners, canFilterOwners, ownerFilter, currentUserId, states, defaultCity }: AthletesViewProps) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | undefined>();
  const [notesFor, setNotesFor] = useState<Competitor | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const remove = useAction(deactivateAthleteAction, { toastErrors: true, successMessage: 'Atleta removido.' });

  const allNotes = { ...notes, ...localNotes };
  const filtered = useMemo(() => {
    const term = normalizeName(search);
    if (!term) return athletes;
    return athletes.filter((a) => [a.nome, a.apelido, a.cidade].some((value) => value && normalizeName(value).includes(term)));
  }, [athletes, search]);

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (athlete: Competitor) => {
    setEditing(athlete);
    setFormOpen(true);
  };
  const onRemove = async (athlete: Competitor) => {
    const confirmed = await confirm({
      title: 'Remover o atleta?',
      description: `${athlete.nome} sai da lista de atletas. Inscrições e sorteios já feitos não mudam.`,
      confirmLabel: 'Remover atleta',
      tone: 'danger',
    });
    if (confirmed) await remove.execute(athlete.id);
  };
  const useExisting = (id: string) => {
    const existing = athletes.find((a) => a.id === id);
    if (existing) setSearch(existing.nome);
  };

  const grid = canFilterOwners ? GRID_OWNER : GRID;
  const count = `${athletes.length} ${athletes.length === 1 ? 'atleta' : 'atletas'}`;

  return (
    <>
      <PageHeader
        title="Atletas"
        actions={
          <Button onClick={openNew}>
            <UserPlus aria-hidden className="size-4" />
            Novo atleta
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-80">
            <Input
              label="Buscar atleta"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, apelido ou cidade"
            />
          </div>
          {canFilterOwners && (
            <div className="sm:w-64">
              <OwnerFilter owners={owners} value={ownerFilter} />
            </div>
          )}
          <p className="text-sm font-semibold text-ink-muted sm:ml-auto sm:pb-2.5">{count}</p>
        </div>

        {athletes.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum atleta cadastrado"
            description="Cadastre os laçadores que vão participar das provas."
            action={<Button onClick={openNew}>Cadastrar atleta</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum atleta encontrado"
            description="Ajuste a busca ou cadastre um novo atleta."
            action={<Button variant="secondary" onClick={() => setSearch('')}>Limpar busca</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-ui border border-line bg-surface">
            <div className={`hidden border-b border-line bg-nav px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted md:grid ${grid}`} aria-hidden="true">
              <span>Nome</span>
              <span>Cidade</span>
              <span>HC cab.</span>
              <span>HC pé</span>
              {canFilterOwners && <span>Proprietário</span>}
              <span className="w-[7.5rem] text-right">Ações</span>
            </div>
            <ul className="divide-y divide-line">
              {filtered.map((athlete) => {
                const shared = !canFilterOwners && athlete.ownerId !== currentUserId;
                const hasNote = Boolean(allNotes[athlete.id]);
                return (
                  <li key={athlete.id} className={`flex flex-col gap-2 px-4 py-3 ${grid}`}>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-strong">{athlete.nome}</p>
                      {athlete.apelido && <p className="truncate text-xs text-ink-muted">{athlete.apelido}</p>}
                      {shared && (
                        <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-ink-muted">
                          <Badge tone="accent">Compartilhado</Badge>
                          <span className="truncate">por {athlete.ownerName ?? 'outro proprietário'}</span>
                        </p>
                      )}
                    </div>
                    <div className="min-w-0 text-sm">
                      {athlete.cityNeedsReview ? (
                        <Badge tone="warning">Cidade a revisar</Badge>
                      ) : (
                        <p className="truncate text-ink">{athlete.cidade ? `${athlete.cidade}/${athlete.estado ?? ''}` : '—'}</p>
                      )}
                      {athlete.clube && <p className="truncate text-xs text-ink-muted">{athlete.clube}</p>}
                    </div>
                    <p className="text-sm text-ink md:contents">
                      <span className="font-display md:font-sans"><span className="text-ink-muted md:hidden">HC cab. </span>{athlete.headHandicap?.toFixed(1) ?? '—'}</span>
                      <span className="ml-3 font-display md:ml-0 md:font-sans"><span className="text-ink-muted md:hidden">HC pé </span>{athlete.heelHandicap?.toFixed(1) ?? '—'}</span>
                    </p>
                    {canFilterOwners && <p className="truncate text-xs text-ink-muted md:text-sm">{athlete.ownerName ?? 'Sem atribuição'}</p>}
                    <div className="flex justify-end md:w-[7.5rem]">
                      <button type="button" aria-label={`Notas de ${athlete.nome}`} onClick={() => setNotesFor(athlete)} className={iconButton}>
                        <NotebookPen aria-hidden className="size-4" />
                        {hasNote && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-accent" />}
                      </button>
                      {!shared && (
                        <>
                          <button type="button" aria-label={`Editar ${athlete.nome}`} onClick={() => openEdit(athlete)} className={iconButton}>
                            <Pencil aria-hidden className="size-4" />
                          </button>
                          <button type="button" aria-label={`Remover ${athlete.nome}`} onClick={() => void onRemove(athlete)} className={`${iconButton} hover:text-danger`}>
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <AthleteFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        athlete={editing}
        states={states}
        defaultCity={defaultCity}
        showOwner={canFilterOwners}
        onUseExisting={useExisting}
      />
      <AthleteNotesDialog
        open={notesFor !== null}
        onClose={() => setNotesFor(null)}
        athlete={notesFor}
        initialBody={notesFor ? allNotes[notesFor.id] ?? '' : ''}
        onSaved={(id, body) => setLocalNotes((prev) => ({ ...prev, [id]: body }))}
      />
    </>
  );
}
