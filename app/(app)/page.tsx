import App from '../../src/App';
import { requireUser, getCurrentUserProfile } from '../../src/server/session';

export default async function HomePage() {
  await requireUser();
  const profile = await getCurrentUserProfile();
  if (!profile) return null;
  return <App embedded initialSession={{ user: profile, expiresAt: '' }} />;
}
