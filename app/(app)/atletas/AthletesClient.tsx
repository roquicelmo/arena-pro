'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AthletesPage } from '../../../src/components/AthletesPage';
import { NewCompetitorModal } from '../../../src/components/NewCompetitorModal';
import { toast, useConfirm } from '../../../src/components/ui';
import { apiRequest } from '../../../src/lib/apiClient';
import type { Competitor } from '../../../src/types/roping';

interface AthletesClientProps {
  athletes: Competitor[];
  owners: Array<{ id: string; name: string | null; email: string }>;
  canFilterOwners: boolean;
  defaultOwnerId: string;
}

export function AthletesClient({ athletes, owners, canFilterOwners, defaultOwnerId }: AthletesClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onAdd = async (competitor: Competitor) => {
    try {
      await apiRequest('/api/athletes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: competitor.nome,
          city: competitor.cidade,
          headHandicap: competitor.headHandicap ?? competitor.handicap,
          heelHandicap: competitor.heelHandicap ?? competitor.handicap,
          ownerId: competitor.ownerId,
        }),
      }, 'Não foi possível cadastrar o atleta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cadastrar o atleta.');
      return;
    }
    toast.success('Atleta cadastrado.');
    router.refresh();
  };

  const onRemove = async (competitor: Competitor) => {
    const confirmed = await confirm({
      title: 'Remover o atleta?',
      description: `${competitor.nome} será removido do cadastro.`,
      confirmLabel: 'Remover atleta',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiRequest(`/api/athletes/${competitor.id}`, { method: 'DELETE' }, 'Não foi possível remover o atleta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover o atleta.');
      return;
    }
    toast.success('Atleta removido.');
    router.refresh();
  };

  return (
    <>
      <AthletesPage athletes={athletes} owners={owners} canFilterOwners={canFilterOwners} onAdd={() => setIsModalOpen(true)} onRemove={(athlete) => void onRemove(athlete)} />
      <NewCompetitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(competitor) => void onAdd(competitor)}
        owners={owners}
        defaultOwnerId={defaultOwnerId}
        canAssignOwner={canFilterOwners}
      />
    </>
  );
}
