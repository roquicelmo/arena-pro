import { AppShell } from '../../src/components/shell/AppShell';
import { navItemsFor } from '../../src/components/shell/navItems';
import { getCurrentUserProfile, requireUser } from '../../src/server/session';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const profile = await getCurrentUserProfile();
  return (
    <AppShell
      user={{ name: profile?.name ?? null, email: profile?.email ?? user.email ?? '', role: user.role }}
      navItems={navItemsFor(user.role).map(({ href, label }) => ({ href, label }))}
    >
      {children}
    </AppShell>
  );
}
