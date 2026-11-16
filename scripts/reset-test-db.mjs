// Recria do zero o banco LOCAL de testes (sorteios_lagoa_test) e aplica o seed de e2e.
// Recusa qualquer banco remoto ou cujo nome não termine em `_test`.
import { spawnSync } from 'node:child_process';
import { assertTestDatabaseUrl } from './assert-local-db.mjs';

const url = process.env.DATABASE_URL;
try {
  assertTestDatabaseUrl(url);
  assertTestDatabaseUrl(process.env.DATABASE_URL_POOLED ?? url);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const run = (command, args, input) => {
  const result = spawnSync(command, args, {
    stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input,
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('npx', ['prisma', 'db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
  'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['tsx', 'prisma/seed-e2e.ts']);
