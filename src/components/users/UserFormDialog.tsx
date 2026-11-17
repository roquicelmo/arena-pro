'use client';

import { useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import { createUserAction, updateUserAction } from '../../server/actions/users';
import { Button, Dialog, Input, Select } from '../ui';
import type { ManagedUser } from './types';

export function UserFormDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user?: ManagedUser }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={user ? 'Editar usuário' : 'Novo usuário'} busy={busy}>
      <UserForm key={user?.id ?? 'novo'} user={user} onClose={onClose} onBusy={setBusy} />
    </Dialog>
  );
}

function UserForm({ user, onClose, onBusy }: { user?: ManagedUser; onClose: () => void; onBusy: (b: boolean) => void }) {
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', password: '', role: (user?.role === 'ORGANIZER' ? 'MANAGER' : user?.role ?? 'USER') as 'ADMIN' | 'MANAGER' | 'USER',
    provisional: user?.provisional ?? false, accessExpiresAt: user?.accessExpiresAt?.slice(0, 10) ?? '',
  });
  const save = useAction(
    (input: typeof form) => (user ? updateUserAction(user.id, input) : createUserAction(input)),
    { successMessage: user ? 'Usuário atualizado.' : 'Usuário criado.' },
  );
  const err = (f: string) => save.fieldErrors[f]?.[0];
  const banner = formBannerMessage(save.message, save.fieldErrors);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    onBusy(true);
    const result = await save.execute(form);
    onBusy(false);
    if (result?.ok) onClose();
  };
  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="grid gap-3">
      {banner && <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm text-danger">{banner}</p>}
      <Input label="Nome" value={form.name} error={err('name')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="E-mail" type="email" value={form.email} error={err('email')} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input label={user ? 'Nova senha (opcional)' : 'Senha'} type="password" autoComplete="new-password" value={form.password} error={err('password')} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Papel" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
          <option value="USER">Usuário</option><option value="MANAGER">Manager</option><option value="ADMIN">Administrador</option>
        </Select>
        <Input label="Acesso até (opcional)" type="date" value={form.accessExpiresAt} error={err('accessExpiresAt')} onChange={(e) => setForm({ ...form, accessExpiresAt: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-strong">
        <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.provisional} onChange={(e) => setForm({ ...form, provisional: e.target.checked })} /> Usuário provisório
      </label>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" disabled={save.pending} onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={save.pending}>Salvar usuário</Button>
      </div>
    </form>
  );
}
