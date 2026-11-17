'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { Button, Input, Select } from '../ui';

const STATUS = [['', 'Todos os status'], ['OPEN', 'Aberta'], ['DRAWN', 'Sorteada'], ['IN_PROGRESS', 'Em andamento'], ['FINISHED', 'Finalizada'], ['CANCELLED', 'Cancelada']];

/** Filtros do relatório na URL (`?dono=&status=&de=&ate=`), compartilháveis e preservados no reload. */
export function ReportFilters({ owners }: { owners: Array<{ id: string; name: string | null; email: string }> | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`);
  };
  return (
    <div className="no-print grid gap-3 rounded-ui border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
      {owners && (
        <Select label="Proprietário" value={params.get('dono') ?? ''} onChange={(e) => set('dono', e.target.value)}>
          <option value="">Todos os proprietários</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name ?? o.email}</option>)}
        </Select>
      )}
      <Select label="Status" value={params.get('status') ?? ''} onChange={(e) => set('status', e.target.value)}>
        {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <Input label="De" type="date" value={params.get('de') ?? ''} onChange={(e) => set('de', e.target.value)} />
      <Input label="Até" type="date" value={params.get('ate') ?? ''} onChange={(e) => set('ate', e.target.value)} />
      <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimir</Button>
    </div>
  );
}
