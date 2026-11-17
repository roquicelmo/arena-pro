@AGENTS.md

# Arena Pro

Sistema de sorteio e gestão de provas de laço em dupla. Referência técnica completa: `docs/project-technical-reference.md` (rotas, API, componentes, Server Actions e pendências em §31).

## Stack
- Next.js 16 (App Router) + React, TypeScript 6, Tailwind 4 com tokens Arena (`src/styles/tokens.css`).
- Prisma 6 + PostgreSQL (Docker local), Zod 4, Auth.js, @react-pdf/renderer (súmula).
- npm (`package-lock.json`).

## Comandos
- Testes unitários: `npm test` (um arquivo: `npx vitest run <arquivo>`).
- Typecheck: não há script próprio, e `tsc` direto acusa erros falsos (com `pages/` no projeto, `useSearchParams` e afins ficam anuláveis). A checagem de tipos válida é a do `npm run build`.
- Lint: `npm run lint` (oxlint, não ESLint).
- E2E: `npm run test:e2e` (projetos `desktop` e `mobile`, um só banco de teste; um spec: `npx playwright test e2e/<x>.spec.ts --project=desktop`).
- Build: `npm run build` (roda `prisma generate`).
- Banco local: `npm run db:local:up`, `npm run db:local:migrate`, `npm run db:local:seed`; reset do banco de teste: `npm run db:test:reset`.

## Padrões do código
- Regras de negócio em `src/server/services/commands/*` (sem `server-only`, porque o Pages API importa alguns). Server Actions chamam `runAction` (requireActionUser → Zod → command → revalidatePath) e devolvem `ActionResult`; no cliente, `useAction`.
- Erros de domínio com `DomainError` e status 400/403/404/409/422. `P2002` vira 409.
- Escopo de acesso: `accessScope` devolve um OR de topo, então combine com AND. Provas usam `eventScope`/`ownerScope`.
- Escritas concorrentes na prova (sorteio, tempos, publicação) travam a linha do Event com `SELECT … FOR UPDATE` dentro da transação.
- `/api` só tem `/api/auth/*`, `POST /api/access-requests` e `PATCH /api/runs/:id/times`. O resto é Server Component + Server Action.

## Regras
- Nunca use `.env.production.local`. Migrations: gere com `prisma migrate diff` (nunca `migrate dev`), avise antes de mexer no schema, e em produção rode `npm run db:deploy` antes de promover o deploy na Vercel.
- PRs sempre com base `main` (nada de PRs empilhados).
- Antes de começar, leia `memoria/aprendizados.md`. Ao terminar uma tarefa em que algo deu errado, registre ali a lição.
