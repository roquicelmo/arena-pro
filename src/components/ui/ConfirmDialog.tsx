'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (options && dialog && !dialog.open) dialog.showModal();
  }, [options]);

  const finish = useCallback((value: boolean) => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
    returnFocusRef.current?.focus();
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-dialog-title"
        aria-describedby={options?.description ? 'confirm-dialog-description' : undefined}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-ui border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink-strong/40"
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) finish(false);
        }}
      >
        {options && (
          <div className="flex flex-col gap-4 p-6">
            <h2 id="confirm-dialog-title" className="font-display text-2xl font-bold uppercase tracking-wide text-ink-strong">
              {options.title}
            </h2>
            {options.description && (
              <p id="confirm-dialog-description" className="text-sm text-ink-muted">
                {options.description}
              </p>
            )}
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => finish(false)} autoFocus>
                {options.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} onClick={() => finish(true)}>
                {options.confirmLabel ?? 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}
