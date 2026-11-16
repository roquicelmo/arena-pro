'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, X } from 'lucide-react';
import { normalizeName } from '../../lib/text';
import { useAction } from '../../lib/useAction';
import { unshareRecordsAction } from '../../server/actions/shares';
import type { ManagedRecord, ManagedType } from '../../server/services/records';
import { Button, EmptyState, Input, Select, cn } from '../ui';
import { ReassignDialog } from './ReassignDialog';
import { ShareDialog, type ShareUser } from './ShareDialog';

export interface RecordsManagerProps {
  type: ManagedType;
  userId: string;
  records: ManagedRecord[];
  users: ShareUser[];
}

const TABS: Array<{ type: ManagedType; label: string }> = [
  { type: 'atletas', label: 'Atletas' },
  { type: 'arenas', label: 'Arenas' },
  { type: 'provas', label: 'Provas' },
];

const GRID_BASE = 'md:grid md:items-center md:gap-4';
const GRID_SHARED = `${GRID_BASE} md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,2fr)]`;
const GRID_EVENTS = `${GRID_BASE} md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)]`;

const tabHref = (type: ManagedType, userId: string) => {
  const params = new URLSearchParams({ tipo: type });
  if (userId) params.set('usuario', userId);
  return `/cadastros?${params.toString()}`;
};

export function RecordsManager({ type, userId, records, users }: RecordsManagerProps) {
  // A chave reinicia busca e seleção ao trocar de aba ou de filtro.
  return <RecordsPanel key={`${type}|${userId}`} type={type} userId={userId} records={records} users={users} />;
}

function RecordsPanel({ type, userId, records, users }: RecordsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'share' | 'unshare' | 'reassign' | null>(null);
  const unshare = useAction(unshareRecordsAction, { toastErrors: true, successMessage: 'Compartilhamento removido.' });

  const isEvents = type === 'provas';
  const recordType = type === 'atletas' ? 'athlete' : 'arena';
  const grid = isEvents ? GRID_EVENTS : GRID_SHARED;

  const visible = useMemo(() => {
    const term = normalizeName(search);
    if (!term) return records;
    return records.filter((r) => normalizeName(`${r.name} ${r.detail}`).includes(term));
  }, [records, search]);

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.includes(r.id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? selected.filter((id) => !visible.some((r) => r.id === id)) : [...new Set([...selected, ...visible.map((r) => r.id)])]);
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  const clear = () => setSelected([]);

  const changeUser = (next: string) => router.replace(next ? tabHref(type, next) : tabHref(type, ''), { scroll: false });

  return (
    <div className="mt-6 flex flex-col gap-4">
      <nav aria-label="Tipos de cadastro" className="flex gap-1 border-b border-line">
        {TABS.map((tab) => {
          const active = tab.type === type;
          return (
            <Link
              key={tab.type}
              href={tabHref(tab.type, userId)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 font-display text-sm font-semibold uppercase tracking-wider transition-colors',
                active ? 'border-accent text-ink-strong' : 'border-transparent text-ink-muted hover:text-ink-strong',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-64">
          <Select label="Usuário" value={userId} onChange={(e) => changeUser(e.target.value)}>
            <option value="">Todos os usuários</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:w-80">
          <Input label="Buscar" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome ou detalhes" autoComplete="off" />
        </div>
        <p className="text-sm font-semibold text-ink-muted sm:ml-auto sm:pb-2.5">{visible.length} {visible.length === 1 ? 'cadastro' : 'cadastros'}</p>
      </div>

      {selected.length > 0 && (
        <div role="region" aria-label="Seleção" className="flex flex-col gap-2 rounded-ui border border-accent bg-accent-soft px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-ink-strong" aria-live="polite">
            {selected.length} selecionado(s)
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {isEvents ? (
              <Button onClick={() => setDialog('reassign')}>Alterar responsável…</Button>
            ) : (
              <>
                <Button onClick={() => setDialog('share')}>Compartilhar com…</Button>
                <Button variant="secondary" onClick={() => setDialog('unshare')}>
                  Remover compartilhamento…
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={clear}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nenhum cadastro encontrado" description="Ajuste a busca ou o filtro de usuário." />
      ) : (
        <div className="overflow-hidden rounded-ui border border-line bg-surface">
          <div className={`hidden border-b border-line bg-nav px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-muted md:grid ${grid}`}>
            <input type="checkbox" aria-label="Selecionar todos" className="size-4 accent-accent" checked={allVisibleSelected} onChange={toggleAll} />
            <span>Nome</span>
            <span>Detalhes</span>
            <span>Proprietário</span>
            {!isEvents && <span>Compartilhado com</span>}
          </div>
          <div className="flex items-center gap-3 border-b border-line bg-nav px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted md:hidden">
            <input type="checkbox" aria-label="Selecionar todos" className="size-4 accent-accent" checked={allVisibleSelected} onChange={toggleAll} />
            <span>Selecionar todos</span>
          </div>
          <ul className="divide-y divide-line">
            {visible.map((record) => (
              <li key={record.id} className={`flex flex-col gap-2 px-4 py-3 ${grid}`}>
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${record.name}`}
                  className="size-4 accent-accent"
                  checked={selected.includes(record.id)}
                  onChange={() => toggle(record.id)}
                />
                <p className="min-w-0 break-words font-semibold text-ink-strong md:truncate">{record.name}</p>
                <p className="min-w-0 break-words text-sm text-ink md:truncate">{record.detail}</p>
                <p className="min-w-0 truncate text-xs text-ink-muted md:text-sm">{record.ownerName ?? 'Sem atribuição'}</p>
                {!isEvents && (
                  <ul className="flex min-w-0 flex-wrap gap-1.5">
                    {record.sharedWith.length === 0 && <li className="text-xs text-ink-muted">—</li>}
                    {record.sharedWith.map((target) => (
                      <li key={target.id} className="inline-flex max-w-full items-center gap-1 rounded-ui bg-nav py-0.5 pl-2 pr-0.5 text-xs font-semibold text-ink-strong">
                        <span className="truncate">{target.name}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${target.name} de ${record.name}`}
                          disabled={unshare.pending}
                          onClick={() => void unshare.execute({ type: recordType, ids: [record.id], userIds: [target.id] })}
                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-ui text-ink-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEvents && (
        <ShareDialog
          open={dialog === 'share' || dialog === 'unshare'}
          onClose={() => setDialog(null)}
          mode={dialog === 'unshare' ? 'unshare' : 'share'}
          type={recordType}
          ids={selected}
          users={users}
          onDone={clear}
        />
      )}
      {isEvents && <ReassignDialog open={dialog === 'reassign'} onClose={() => setDialog(null)} ids={selected} users={users} onDone={clear} />}
    </div>
  );
}
