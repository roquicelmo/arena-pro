import { BarChart3, CalendarDays, Dices, FolderCog, LayoutDashboard, Trophy, UserCog, Users, type LucideIcon } from 'lucide-react';
import { MANAGER_ROLES } from '../../server/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ALL_ITEMS: Array<NavItem & { managerOnly?: boolean }> = [
  { href: '/', label: 'Painel', icon: LayoutDashboard },
  { href: '/provas', label: 'Provas', icon: Trophy },
  { href: '/atletas', label: 'Atletas', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/sorteio-avulso', label: 'Sorteio avulso', icon: Dices },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, managerOnly: true },
  { href: '/cadastros', label: 'Cadastros', icon: FolderCog, managerOnly: true },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

/** Item serializável (server -> client): o ícone é resolvido no cliente por `navIconFor`. */
export type SerializableNavItem = Pick<NavItem, 'href' | 'label'>;

export function navIconFor(href: string): LucideIcon {
  return ALL_ITEMS.find((item) => item.href === href)?.icon ?? LayoutDashboard;
}

export function navItemsFor(role: string): NavItem[] {
  const isManager = (MANAGER_ROLES as readonly string[]).includes(role);
  return ALL_ITEMS.filter((item) => !item.managerOnly || isManager).map(({ href, label, icon }) => ({ href, label, icon }));
}

export function isActivePath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return href !== '/' && pathname.startsWith(`${href}/`);
}

export function roleLabel(role: string): string {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'MANAGER' || role === 'ORGANIZER') return 'Gestor';
  if (role === 'USER') return 'Usuário';
  return role;
}
