'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Com ação em andamento, Esc, fundo e "Fechar" não fecham o diálogo. */
  busy?: boolean;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, busy = false, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pressStartedOnBackdropRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        // Prefere o primeiro campo do formulário; sem campos, o foco nativo (botão Fechar).
        const field = dialog.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea');
        (field ?? dialog.querySelector<HTMLElement>('button'))?.focus();
      }
    } else if (dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
  }, [open]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-ui border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink-strong/40"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          requestClose();
        }
      }}
      onMouseDown={(event) => {
        pressStartedOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Só fecha se o clique começou e terminou no fundo: arrastar uma seleção de texto até ele não conta.
        const startedOnBackdrop = pressStartedOnBackdropRef.current;
        pressStartedOnBackdropRef.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) requestClose();
      }}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={titleId} className="break-words font-display text-2xl font-bold uppercase tracking-wide text-ink-strong">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={requestClose}
              disabled={busy}
              className="-mr-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-ui text-ink-muted hover:bg-surface-sunken hover:text-ink-strong disabled:opacity-50"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
