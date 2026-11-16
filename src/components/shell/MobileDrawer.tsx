'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Drawer modal baseado em <dialog>: Esc e clique fora fecham; o foco volta ao botão que abriu. */
export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus();
    }
  }, [open]);

  // Navegar fecha o drawer.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu principal"
      className="m-0 h-full max-h-none w-[min(18rem,85vw)] max-w-none border-r border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink-strong/40"
      onClose={() => {
        // Fechamento iniciado pelo navegador: mantém o estado do pai em sincronia.
        if (open) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {open && (
        <div className="relative h-full">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="absolute right-3 top-4 rounded-ui p-2 text-ink hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
