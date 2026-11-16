'use client';

import { useEffect, useMemo, useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import type { RecordType } from '../../lib/schemas/shares';
import { normalizeName } from '../../lib/text';
import { useAction } from '../../lib/useAction';
import { shareRecordsAction, unshareRecordsAction } from '../../server/actions/shares';
import { Button, Dialog, Input } from '../ui';

export interface ShareUser {
  id: string;
  name: string | null;
  email: string;
}

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'share' | 'unshare';
  type: RecordType;
  ids: string[];
  users: ShareUser[];
  onDone?: () => void;
}

export function ShareDialog(props: ShareDialogProps) {
  const [busy, setBusy] = useState(false);
  const title = props.mode === 'share' ? 'Compartilhar cadastros' : 'Remover compartilhamento';
  return (
    <Dialog open={props.open} onClose={props.onClose} busy={busy} title={title}>
      <ShareForm {...props} onBusyChange={setBusy} />
    </Dialog>
  );
}

function ShareForm({ onClose, mode, type, ids, users, onDone, onBusyChange }: ShareDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const share = useAction(shareRecordsAction, { successMessage: (data) =>
      data.added > 0 ? `Compartilhado com ${data.added} usuário(s).` : 'Nenhum compartilhamento novo: os usuários já tinham acesso.', });
  const unshare = useAction(unshareRecordsAction, { successMessage: 'Compartilhamento removido.' });
  const action = mode === 'share' ? share : unshare;
  useEffect(() => {
    onBusyChange(action.pending);
  }, [action.pending, onBusyChange]);

  const visible = useMemo(() => {
    const term = normalizeName(search);
    return term ? users.filter((u) => normalizeName(`${u.name ?? ''} ${u.email}`).includes(term)) : users;
  }, [users, search]);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await action.execute({ type, ids, userIds: selected });
    if (result?.ok) {
      onDone?.();
      onClose();
    }
  };

  const banner = formBannerMessage(action.message, action.fieldErrors);
  const listError = action.fieldErrors.userIds?.[0] ?? action.fieldErrors.ids?.[0];

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {(banner || listError) && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {banner ?? listError}
        </p>
      )}
      <Input label="Buscar usuário" type="search" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
      <ul className="flex max-h-64 flex-col overflow-y-auto rounded-ui border border-line">
        {visible.length === 0 && <li className="px-3 py-3 text-sm text-ink-muted">Nenhum usuário encontrado.</li>}
        {visible.map((u) => (
          <li key={u.id} className="border-b border-line last:border-b-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm text-ink-strong">
              <input type="checkbox" className="size-4 accent-accent" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
              <span className="min-w-0 break-words">{u.name ?? u.email}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={action.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={action.pending}>
          {mode === 'share' ? 'Compartilhar' : 'Remover'}
        </Button>
      </div>
    </form>
  );
}
