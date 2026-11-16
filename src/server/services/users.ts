import 'server-only';
import { findUsersRaw } from './raw';
import { isAdmin, isManager } from '../permissions';

type ScopeUser = { id: string; role: string };

export const listOwners = async (user: ScopeUser): Promise<Array<{ id: string; name: string | null; email: string }>> => {
  if (!isAdmin(user.role) && !isManager(user.role)) return [];
  const users = await findUsersRaw();
  return users.map(({ id, name, email }) => ({ id, name, email }));
};
