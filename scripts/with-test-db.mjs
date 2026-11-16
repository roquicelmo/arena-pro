// Executa um comando com DATABASE_URL/DATABASE_URL_POOLED apontando para o banco de testes.
import { spawnSync } from 'node:child_process';
import { assertLocalDatabaseUrl } from './assert-local-db.mjs';

const testUrl = process.env.DATABASE_URL_TEST;
try {
  assertLocalDatabaseUrl(testUrl);
} catch (error) {
  console.error(error.message.replace('DATABASE_URL', 'DATABASE_URL_TEST'));
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: testUrl, DATABASE_URL_POOLED: testUrl },
});
process.exit(result.status ?? 1);
