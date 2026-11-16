/**
 * Usuários de teste do banco LOCAL de e2e (sorteios_lagoa_test).
 * Valores fictícios, válidos somente no ambiente local.
 */
export const TEST_USERS = {
  admin: { email: 'admin@sorteios.test', password: 'admin-local-123', role: 'ADMIN', name: 'Admin Teste' },
  manager: { email: 'manager@sorteios.test', password: 'manager-local-123', role: 'MANAGER', name: 'Manager Teste' },
  userA: { email: 'user.a@sorteios.test', password: 'usera-local-123', role: 'USER', name: 'User A Teste' },
  userB: { email: 'user.b@sorteios.test', password: 'userb-local-123', role: 'USER', name: 'User B Teste' },
  blocked: { email: 'blocked@sorteios.test', password: 'blocked-local-123', role: 'USER', name: 'Bloqueado Teste' },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

/** Atleta do user B compartilhado com o user A pelo seed de e2e. */
export const TEST_SHARED_ATHLETE = 'PEZEIRO B1';

export const TEST_EVENTS = {
  userA: 'PROVA E2E USER A',
  userB: 'PROVA E2E USER B',
} as const;
