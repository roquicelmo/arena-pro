import { pathToFileURL } from 'node:url';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Garante que a URL do banco aponta para um Postgres local.
 * Usado por todos os scripts de banco local e de testes para impedir
 * qualquer operação acidental contra a produção.
 */
export function assertLocalDatabaseUrl(url) {
  if (!url) {
    throw new Error('Recusado: DATABASE_URL não definida.');
  }

  let hostname;
  try {
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('protocolo');
    hostname = parsed.hostname;
  } catch {
    throw new Error('Recusado: DATABASE_URL não é local.');
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error('Recusado: DATABASE_URL não é local.');
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  try {
    assertLocalDatabaseUrl(process.env.DATABASE_URL);
    if (process.env.DATABASE_URL_POOLED) assertLocalDatabaseUrl(process.env.DATABASE_URL_POOLED);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
