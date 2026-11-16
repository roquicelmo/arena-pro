'use client';

import { useEffect, useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import { reassignEventsAction } from '../../server/actions/shares';
import { Button, Dialog, Select } from '../ui';
import type { ShareUser } from './ShareDialog';

export interface ReassignDialogProps {
  open: boolean;
  onClose: () => void;
  ids: string[];
  users: ShareUser[];
  onDone?: () => void;
}

export function ReassignDialog(props: ReassignDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={props.open} onClose={props.onClose} busy={busy} title="Alterar responsável">
      <ReassignForm {...props} onBusyChange={setBusy} />
    </Dialog>
  );
}

function ReassignForm({ onClose, ids, users, onDone, onBusyChange }: ReassignDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const [ownerId, setOwnerId] = useState('');
  const reassign = useAction(reassignEventsAction, { successMessage: 'Responsável alterado.' });
  useEffect(() => {
    onBusyChange(reassign.pending);
  }, [reassign.pending, onBusyChange]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await reassign.execute({ ids, ownerId });
    if (result?.ok) {
      onDone?.();
      onClose();
    }
  };

  const banner = formBannerMessage(reassign.message, reassign.fieldErrors);
  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {banner && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {banner}
        </p>
      )}
      <Select
        label="Responsável"
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        error={reassign.fieldErrors.ownerId?.[0]}
        hint="As provas selecionadas passam a ser deste usuário."
      >
        <option value="">Selecione…</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name ?? u.email}
          </option>
        ))}
      </Select>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={reassign.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={reassign.pending}>
          Alterar responsável
        </Button>
      </div>
    </form>
  );
}
