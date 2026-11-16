'use client';

import { Inbox, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatTile,
  eventStatusBadge,
  toast,
  useConfirm,
  type EventStatus,
} from '../../../src/components/ui';

const STATUSES: EventStatus[] = ['OPEN', 'DRAWN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'];

export function UiShowcase() {
  const confirm = useConfirm();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Desenvolvimento"
        title="Vitrine de componentes"
        description="Primitivas da identidade Arena usadas em todas as telas."
        actions={<Button size="sm"><Plus className="h-4 w-4" aria-hidden="true" />Nova prova</Button>}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-strong">Botões</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Principal</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="danger">Excluir</Button>
          <Button loading>Salvando</Button>
          <Button size="lg">Próxima corrida</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-strong">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => {
            const badge = eventStatusBadge(status);
            return <Badge key={status} tone={badge.tone}>{badge.label}</Badge>;
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Concluídas" value="12/252" hint="Bateria 1" />
        <StatTile label="NT" value={2} />
        <StatTile label="Melhor média" value="7,84s" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome da prova" placeholder="Ex.: Bolão de Novembro" hint="Aparece no PDF da súmula." />
        <Input label="E-mail" defaultValue="invalido" error="Informe um e-mail válido." />
        <Select label="Arena" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option>Arena Lagoa</option>
        </Select>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-ink-strong">Carregando</h2>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </section>

      <EmptyState
        icon={Inbox}
        title="Nenhuma prova ainda"
        description="Crie a primeira prova para começar as inscrições e o sorteio."
        action={<Button>Criar prova</Button>}
      />

      <section className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            const ok = await confirm({ title: 'Cancelar a prova?', description: 'As inscrições serão mantidas.', confirmLabel: 'Cancelar prova', tone: 'danger' });
            if (ok) toast.success('Prova cancelada');
          }}
        >
          Abrir confirmação
        </Button>
        <Button variant="secondary" onClick={() => toast.success('Tudo certo', { description: 'Tempo registrado.' })}>
          Mostrar toast
        </Button>
      </section>
    </main>
  );
}
