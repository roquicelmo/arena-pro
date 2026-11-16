'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../ui';
import { isActivePath, roleLabel, type SerializableNavItem, navIconFor } from './navItems';
import { LogoutButton } from './LogoutButton';

export interface ShellUser {
  name: string | null;
  email: string;
  role: string;
}

/** `full`: logo compacta (menu lateral e drawer). `bar`: símbolo + nome (barra superior do celular). */
export function Brand({ variant = 'full' }: { variant?: 'full' | 'bar' }) {
  if (variant === 'bar') {
    return (
      <span className="flex items-center gap-2">
        <Image src="/brand/arena-pro-simbolo.svg" alt="" width={295} height={228} unoptimized className="h-8 w-auto" />
        <span className="font-display text-xl font-bold uppercase leading-none tracking-wide text-ink-strong">Arena Pro</span>
      </span>
    );
  }
  return <Image src="/brand/arena-pro-logo-compacta.svg" alt="Arena Pro" width={392} height={244} unoptimized className="h-auto w-[184px]" />;
}

export function SidebarNav({ navItems, user, onNavigate }: { navItems: SerializableNavItem[]; user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Brand />
      </div>
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, label }) => {
            const Icon = navIconFor(href);
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-ui px-3 py-2.5 text-[0.95rem] font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'bg-ink-strong text-sand' : 'text-ink hover:bg-sand hover:text-ink-strong',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line px-5 py-4">
        <p className="truncate text-sm font-semibold text-ink-strong">{user.name || user.email}</p>
        <p className="mb-3 text-xs text-ink-muted">{roleLabel(user.role)}</p>
        <LogoutButton className="w-full" />
      </div>
    </div>
  );
}
