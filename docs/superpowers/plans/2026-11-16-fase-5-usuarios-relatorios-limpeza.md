# Fase 5 — Usuários, relatórios e limpeza: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (o usuário pediu economia de tokens: execução na própria sessão e uma revisão final única).

**Goal:**
- Migrar Usuários e solicitações de acesso, e também Relatórios, para Server Components com Server Actions.
- Remover os endpoints `/api` sem consumidor, a camada CSS `!important` legada e os componentes antigos que sobraram.
- Fechar a referência técnica.

**Architecture:** O padrão das fases 2 a 4 se mantém: commands sem `server-only`, `runAction` e componentes Arena. Os relatórios são lidos num service com `eventScope`/`ownerScope`, e os filtros ficam na URL.

**Spec:** [refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md), seções 3, 6.3, 9 (fase 5). **Base:** `refactor/fase-4-pista` (PR roquicelmo/arena-pro#9), empilhado sobre o #8.

## Global Constraints

- **Schema intocado.**
- **Regras de usuários (as atuais, sem mudança):**
  - só `MANAGER_ROLES` acessam;
  - **criar, editar e excluir** (desativar) são exclusivos do **Admin**;
  - o **Manager** só ativa ou desativa usuários **provisórios**;
  - ninguém exclui a si mesmo (422);
  - e-mail duplicado dá 409;
  - senha com 8 a 128 caracteres e hash bcrypt de custo 12;
  - os papéis atribuíveis são `ADMIN`, `MANAGER` e `USER`;
  - `accessExpiresAt` é opcional.
- **Solicitações de acesso:**
  - só gerentes revisam;
  - aprovar exige senha inicial com 8+ caracteres e cria o usuário `USER` provisório e inativo, numa transação;
  - e-mail já cadastrado dá 409;
  - só se revisa solicitação pendente (senão, 404).
  - O `POST /api/access-requests` (formulário público com reCAPTCHA) **continua**.
- **Relatórios:**
  - totais de provas, atletas, arenas, sorteios e corridas, mais as 10 provas mais recentes;
  - filtros de dono (só gerente), status, de e até, na URL (`?dono=&status=&de=&ate=`);
  - escopo: provas por `eventScope`, atletas e arenas por `accessScope`, já que o compartilhamento conta (spec 6.9).
- **`/api`:** ficam só os endpoints com consumidor:
  - `/api/auth/*`;
  - `POST /api/access-requests`;
  - `PATCH /api/runs/:id/times` (pista).
  - Os demais handlers saem do gateway e são apagados. Os e2e que chamavam endpoints removidos passam a verificar o mesmo pelo caminho que restou.
- **CSS:** sai a camada `!important` legada de `src/index.css` quando nenhuma classe legada (`slate-*`, `amber-*`, `teal-*`, `blue-*`, hex do protótipo) restar em `app/` e `src/`. A impressão e as utilidades `no-print` e `print-header` ficam.
- Tokens Arena e as regras de UI das fases anteriores. Lint, unit, e2e e build verdes no fim.

## Review Focus

1. **Manager tentando editar um Admin ou ativar um usuário não provisório:** recusado (403), sem alterar nada. Teste na Task 1.
2. **Aprovar solicitação com e-mail já existente ou duas vezes:** 409 ou 404, sem criar usuário duplicado. Teste na Task 1.
3. **User acessando `/usuarios` ou chamando a action:** 404 na página e recusa na action. Teste na Task 2.
4. **Relatório de User com `?dono=` de outro usuário:** o filtro é ignorado e só os dados dele aparecem. Teste na Task 3.
5. **Remoção de endpoint ainda usado por alguma tela:** o grep de consumidores zera e o e2e completo fica verde. Task 4.

---

### Task 1: Commands e actions de usuários e solicitações

**Files:** Create `src/server/services/commands/users.ts` e `accessRequests.ts`, com testes; `src/server/actions/users.ts`; `src/lib/schemas/users.ts`.

**Produces:**
- Commands:
  - `createUser(actor, input)`;
  - `updateUser(actor, id, input)`;
  - `setUserActive(actor, id, active)`;
  - `deactivateUser(actor, id)`;
  - `reviewAccessRequest(actor, id, { decision: 'APPROVED' | 'REJECTED', password? })`.
- Mensagens atuais preservadas:
  - "Somente administradores podem criar usuários.";
  - "Managers só podem habilitar usuários provisórios.";
  - "Não é possível excluir o próprio usuário.";
  - "Já existe um usuário com este e-mail.";
  - "Solicitação pendente não encontrada.";
  - "Informe uma senha inicial com pelo menos 8 caracteres.".
- As actions usam `roles: MANAGER_ROLES` e revalidam `/usuarios`.

- [ ] Testes:
  - Manager não cria (403);
  - Manager ativa provisório e não ativa não provisório;
  - Admin não exclui a si mesmo;
  - e-mail duplicado dá 409 (`P2002`);
  - aprovar cria `USER` provisório e inativo na transação;
  - aprovar e-mail existente dá 409;
  - solicitação não pendente dá 404.
- [ ] Commit: `feat: commands e actions de usuários e solicitações de acesso`.

### Task 2: Tela de usuários

**Files:** Create `src/components/users/UsersView.tsx`, `UserFormDialog.tsx` e `AccessRequestsPanel.tsx`. Modify `app/(app)/usuarios/page.tsx`, que lê `listUsers` e as solicitações pendentes no servidor. Delete `src/components/UsersPage.tsx`.

**UI:**
- Painel "Solicitações pendentes", com os botões "Aprovar" (diálogo de senha inicial) e "Recusar" (confirmação).
- Lista de usuários com nome, e-mail, papel, status (Ativo, Inativo, Provisório) e expiração.
- **Admin:** "Novo usuário", "Editar `<nome>`" e "Excluir `<nome>`" (confirmação).
- **Manager:** "Ativar `<nome>`" ou "Desativar `<nome>`", só para provisórios.

- [ ] e2e em `e2e/users.spec.ts`:
  - o Admin cria um usuário (nome com o sufixo do projeto) e o vê na lista;
  - o Manager não vê "Novo usuário";
  - o User recebe 404 em `/usuarios`.
- [ ] Commit: `feat: tela de usuários e solicitações com server actions`.

### Task 3: Relatórios

**Files:** Create `src/server/services/reports.ts`, com `getReportOverview(user, filters)` e o teste de escopo; `src/components/reports/ReportFilters.tsx` (client, `router.replace`). Modify `app/(app)/relatorios/page.tsx`. Delete `src/components/ReportsPage.tsx`.

- [ ] Teste: User com `dono` de outro usuário usa o próprio id; datas viram `gte` e `lte` em UTC; status inválido é ignorado.
- [ ] e2e: `/relatorios?status=FINISHED` mantém o filtro depois do reload e mostra os `StatTile`s. Commit: `feat: relatórios em server component com filtros na URL`.

### Task 4: Limpeza

- [ ] Remover do `next-data-gateway.ts` e apagar os handlers: arenas, athletes, events, `events/[eventId]`, registrations, draws, publish, reports e users. O handler de `access-requests` fica só com o POST.
- [ ] Adaptar os e2e:
  - `shares.spec.ts` sai, porque a mesma garantia já é coberta em `athletes.spec.ts` pela tela;
  - `quick-draw.spec.ts` usa ids inexistentes;
  - `event-routes.spec.ts` lê o id da corrida em `data-run-id`, que o `TrackRow` passa a expor;
  - `results.spec.ts` deixa o POST de publicação, cuja autorização está coberta no unit e no 404 das rotas da prova.
- [ ] Apagar a camada `!important` legada de `src/index.css` depois do grep vazio de classes legadas.
- [ ] Ajustar a mensagem de sessão expirada no login para avisar que alterações em andamento, como tempos, podem não ter sido salvas (pendência da fase 4).
- [ ] Commit: `chore: remove endpoints /api sem consumidor e a camada CSS legada`.

### Task 5: Documentação final

- [ ] Reescrever na referência técnica as seções de rotas, API (só os endpoints restantes), componentes, Server Actions e pendências conhecidas. Lint, unit, e2e e build verdes. Commit: `docs: referência técnica final da refatoração`.
