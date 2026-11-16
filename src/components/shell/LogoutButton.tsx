'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '../../auth/session';
import { Button, toast } from '../ui';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await authClient.logout();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão.');
    }
  };

  return (
    <Button variant="secondary" size="sm" loading={loading} onClick={() => void logout()} className={className}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Sair
    </Button>
  );
}
