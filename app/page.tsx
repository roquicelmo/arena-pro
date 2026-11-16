import { redirect } from 'next/navigation';
import App from '../src/App';
import { prisma } from '../src/server/prisma';
import { getCurrentUser } from '../src/server/session';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  return (
    <App
      initialSession={{
        user: { id: user.id, name: account?.name ?? null, email: user.email ?? '', role: user.role },
        expiresAt: '',
      }}
    />
  );
}
