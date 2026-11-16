'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Brand, SidebarNav, type ShellUser } from './SidebarNav';
import { MobileDrawer } from './MobileDrawer';
import type { SerializableNavItem } from './navItems';

interface AppShellProps {
  user: ShellUser;
  navItems: SerializableNavItem[];
  children: React.ReactNode;
}

export function AppShell({ user, navItems, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-sand text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-line bg-surface lg:block no-print">
        <SidebarNav navItems={navItems} user={user} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden no-print">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setDrawerOpen(true)}
          className="rounded-ui p-2 text-ink-strong hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Brand />
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SidebarNav navItems={navItems} user={user} onNavigate={() => setDrawerOpen(false)} />
      </MobileDrawer>

      <div className="lg:pl-[248px]">{children}</div>
    </div>
  );
}
