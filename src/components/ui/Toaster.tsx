'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';
import { useEffect, useState } from 'react';

export { toast };

export function Toaster() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setIsNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <SonnerToaster
      position={isNarrow ? 'top-center' : 'bottom-right'}
      toastOptions={{
        classNames: {
          toast: 'rounded-ui border border-line bg-surface text-ink-strong font-sans shadow-sm',
          description: 'text-ink-muted',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
        },
      }}
    />
  );
}
