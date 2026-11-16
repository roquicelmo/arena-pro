'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../../../src/components/ui';

const TABS = [
  { suffix: '', label: 'Visão geral' },
  { suffix: '/inscricoes', label: 'Inscrições' },
  { suffix: '/sorteio', label: 'Sorteio' },
  { suffix: '/pista', label: 'Pista' },
  { suffix: '/locucao', label: 'Locução' },
  { suffix: '/resultado', label: 'Resultado' },
] as const;

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/provas/${eventId}`;
  return (
    <nav aria-label="Seções da prova" className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map(({ suffix, label }) => {
          const href = base + suffix;
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-flex min-h-11 items-center border-b-2 px-3 font-display text-sm font-semibold uppercase tracking-wider transition-colors',
                  active
                    ? 'border-accent text-ink-strong'
                    : 'border-transparent text-ink-muted hover:border-line hover:text-ink-strong',
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
