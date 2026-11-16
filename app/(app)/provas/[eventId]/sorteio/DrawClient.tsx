'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DrawConfiguration } from '../../../../../src/components/DrawConfiguration';
import { toast } from '../../../../../src/components/ui';
import { apiRequest } from '../../../../../src/lib/apiClient';
import type { Competitor, DrawConfig } from '../../../../../src/types/roping';

interface DrawClientProps {
  eventId: string;
  cabeceiros: Competitor[];
  pezeiros: Competitor[];
  /** Configuração do último sorteio da prova (ou a padrão). */
  initialConfig: DrawConfig;
}

const celebrate = () => {
  void import('canvas-confetti')
    .then(({ default: confetti }) => confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
    }))
    .catch(() => undefined);
};

export function DrawClient({ eventId, cabeceiros, pezeiros, initialConfig }: DrawClientProps) {
  const router = useRouter();
  const [config, setConfig] = useState<DrawConfig>(initialConfig);
  const [pending, setPending] = useState(false);

  const onGenerateDraw = async () => {
    if (pending) return;
    setPending(true);
    try {
      await apiRequest(`/api/events/${eventId}/draws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }, 'Não foi possível gerar o sorteio.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar o sorteio.');
      setPending(false);
      return;
    }
    toast.success('Sorteio gerado');
    celebrate();
    router.push(`/provas/${eventId}/pista`);
    // O layout da prova é compartilhado entre as abas: atualiza o status no cabeçalho.
    router.refresh();
  };

  return (
    <DrawConfiguration
      config={config}
      onChangeConfig={setConfig}
      cabeceiros={cabeceiros}
      pezeiros={pezeiros}
      onGenerateDraw={() => void onGenerateDraw()}
    />
  );
}
