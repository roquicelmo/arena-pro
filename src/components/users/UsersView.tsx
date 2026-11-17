'use client';

import { useState } from 'react';
import { Pencil, UserPlus, UserX } from 'lucide-react';
import { useAction } from '../../lib/useAction';
import { deactivateUserAction, setUserActiveAction } from '../../server/actions/users';
import { Badge, Button, PageHeader, useConfirm } from '../ui';
import { AccessRequestsPanel } from './AccessRequestsPanel';
import { ROLE_LABEL, type ManagedUser, type PendingRequest } from './types';
import { UserFormDialog } from './UserFormDialog';

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso)) : '—');

export function UsersView({ users, requests, isAdmin, currentUserId }: { users: ManagedUser[]; requests: PendingRequest[]; isAdmin: boolean; currentUserId: string }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const toggle = useAction((i: { id: string; active: boolean }) => setUserActiveAction(i.id, i.active), { successMessage: 'Acesso atualizado.', toastErrors: true });
  const remove = useAction((id: string) => deactivateUserAction(id), { successMessage: 'Usuário excluído.', toastErrors: true });

  const onRemove = async (u: ManagedUser) => {
    if (!(await confirm({ title: 'Excluir o usuário?', description: `${u.name ?? u.email} perde o acesso (exclusão lógica: os dados dele ficam).`, confirmLabel: 'Excluir usuário', tone: 'danger' }))) return;
    await remove.execute(u.id);
  };

  return (
    <>
      <PageHeader title="Usuários" description="Administre perfis, acessos provisórios e solicitações."
        actions={isAdmin ? <Button onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Novo usuário</Button> : undefined} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 rounded-ui border border-line bg-surface" aria-label="Usuários">
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const canToggle = u.id !== currentUserId && (isAdmin || u.provisional);
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink-strong">{u.name ?? u.email}</span>
                    <span className="block truncate text-xs text-ink-muted">{u.email} · acesso até {date(u.accessExpiresAt)} · último login {date(u.lastLoginAt)}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      {u.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>}
                      {u.provisional && <Badge tone="warning">Provisório</Badge>}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {canToggle && (
                      <Button size="sm" variant="secondary" disabled={toggle.pending} aria-label={`${u.active ? 'Desativar' : 'Ativar'} ${u.name ?? u.email}`}
                        onClick={() => void toggle.execute({ id: u.id, active: !u.active })}>
                        {u.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="ghost" aria-label={`Editar ${u.name ?? u.email}`} onClick={() => setEditing(u)}><Pencil className="h-4 w-4" aria-hidden="true" /></Button>
                        {u.id !== currentUserId && u.active && (
                          <Button size="sm" variant="ghost" aria-label={`Excluir ${u.name ?? u.email}`} disabled={remove.pending} onClick={() => void onRemove(u)}><UserX className="h-4 w-4" aria-hidden="true" /></Button>
                        )}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <AccessRequestsPanel requests={requests} />
      </div>
      <UserFormDialog open={creating} onClose={() => setCreating(false)} />
      <UserFormDialog open={editing !== null} onClose={() => setEditing(null)} user={editing ?? undefined} />
    </>
  );
}
