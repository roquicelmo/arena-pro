'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../components/ui/Toaster';
import type { ActionResult, FieldErrors } from './actionResult';
import { redirectToLogin } from './apiClient';

const NETWORK_MESSAGE = 'Sem conexão com o servidor. Tente novamente.';

interface UseActionOptions<T> {
  successMessage?: string | ((data: T) => string);
  /** Ações sem formulário mostram o erro em toast; formulários o exibem inline. */
  toastErrors?: boolean;
}

export function useAction<I, T>(action: (input: I) => Promise<ActionResult<T>>, options: UseActionOptions<T> = {}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const inFlight = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const reset = useCallback(() => {
    setMessage(null);
    setFieldErrors({});
  }, []);

  const execute = useCallback(
    async (input: I): Promise<ActionResult<T> | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setPending(true);
      setMessage(null);
      setFieldErrors({});

      let result: ActionResult<T>;
      try {
        result = await action(input);
      } catch {
        result = { ok: false, message: NETWORK_MESSAGE };
      } finally {
        inFlight.current = false;
        setPending(false);
      }

      const { successMessage, toastErrors } = optionsRef.current;
      if (result.ok) {
        if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(result.data) : successMessage);
      } else if (result.code === 'UNAUTHENTICATED') {
        toast.error(result.message);
        redirectToLogin();
      } else {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        if (toastErrors) toast.error(result.message);
      }
      return result;
    },
    [action],
  );

  return { pending, message, fieldErrors, execute, reset };
}
