'use client';

import { useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import { reviewAccessRequestAction } from '../../server/actions/users';
import { Button, Dialog, Input, useConfirm } from '../ui';
import type { PendingRequest } from './types';

export function AccessRequestsPanel({ requests }: { requests: PendingRequest[] }) {
  const confirm = useConfirm();
  const [approving, setApproving] = useState<PendingRequest | null>(null);
  const [password, setPassword] = useState('');
  const review = useAction(
    (input: { id: string; decision: 'APPROVED' | 'REJECTED'; password?: string }) => reviewAccessRequestAction(input.id, input),
    { successMessage: 'Solicitação revisada.' },
  );
  const reject = async (r: PendingRequest) => {
    if (!(await confirm({ title: 'Recusar a solicitação?', description: `${r.name} (${r.email}) não terá acesso.`, confirmLabel: 'Recusar', tone: 'danger' }))) return;
    await review.execute({ id: r.id, decision: 'REJECTED' });
  };
  const approve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approving) return;
    const result = await review.execute({ id: approving.id, decision: 'APPROVED', password });
    if (result?.ok) {
      setApproving(null);
      setPassword('');
    }
  };
  const banner = formBannerMessage(review.message, review.fieldErrors);

  return (
    <section className="min-w-0 rounded-ui border border-line bg-surface" aria-label="Solicitações pendentes">
      <h2 className="border-b border-line px-4 py-2 font-display text-lg font-bold uppercase text-ink-strong">Solicitações pendentes ({requests.length})</h2>
      {requests.length ? (
        <ul className="divide-y divide-line">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-strong">{r.name}</span>
                <span className="block truncate text-xs text-ink-muted">{r.email} · {r.phone}</span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" onClick={() => { setApproving(r); setPassword(''); }}>Aprovar</Button>
                <Button size="sm" variant="secondary" disabled={review.pending} onClick={() => void reject(r)}>Recusar</Button>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="px-4 py-4 text-sm text-ink-muted">Nenhuma solicitação pendente.</p>}
      <Dialog open={approving !== null} onClose={() => setApproving(null)} title="Aprovar acesso" busy={review.pending}>
        <form noValidate onSubmit={(e) => void approve(e)} className="grid gap-3">
          <p className="text-sm text-ink-muted">{approving?.name} entra como usuário provisório e inativo. Ative a conta na lista quando liberar o acesso.</p>
          {banner && <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm text-danger">{banner}</p>}
          <Input label="Senha inicial" type="password" autoComplete="new-password" value={password} error={review.fieldErrors.password?.[0]} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproving(null)}>Cancelar</Button>
            <Button type="submit" loading={review.pending}>Aprovar</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
