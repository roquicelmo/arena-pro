# Fase 4 — Pista, locução e resultado: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (o usuário pediu economia de tokens: execução na própria sessão e uma revisão final única).

**Goal:**
- Tirar a pista do `RunsTable` de 1.200 linhas e dividi-la em componentes Arena, com lançamento por teclado.
- Deixar o User lançar tempos nas próprias provas, com gravação e recálculo em transação.
- Fazer a locução se atualizar sozinha.
- Corrigir o dono na publicação e reestilizar o resultado com impressão.

**Architecture:**
- **Commands** sem `server-only`, usados pelos handlers `/api` e pelas Server Actions: `src/server/services/commands/times.ts` e `results.ts`.
- **Cálculo puro de total, média e status** em `src/lib/runResult.ts`.
- **Pista:** continua gravando por `PATCH /api/runs/:id/times`, porque já tem fila, atraso de gravação e aviso de sessão expirada testados; o handler passa a delegar ao command.
- **Publicação:** vira Server Action.

**Spec:** [refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md), seções 6.4, 6.6, 6.7 e 9 (fase 4). **Fase anterior:** [fase 3](2026-11-16-fase-3-inscricoes-e-sorteio.md). Este branch parte de `refactor/fase-3-sorteio` (PR roquicelmo/arena-pro#8, ainda aberto).

## Global Constraints

- Schema intocado.
- **Tempos:**
  - Lançam tempos o User nas provas que criou e Admin ou Manager em todas, pelo `eventScope` da prova da corrida. Fora do escopo: "Corrida não encontrada." (404).
  - Gravação e recálculo de total, média, NT e status em uma `prisma.$transaction` que trava a linha da prova (`SELECT … FOR UPDATE`). O `generateDraw` passa a fazer o mesmo, para que um tempo gravado durante um refazer não fique órfão.
  - Corrida de versão antiga do sorteio: 409 "Esta corrida é de uma versão antiga do sorteio. Recarregue a página.".
  - Prova finalizada ou publicada: 409 "Resultado publicado: os tempos não podem mais ser alterados.".
- **Cálculo (regra atual, sem mudança):**
  - qualquer NT → `isNt` e status `ELIMINATED`, sem total;
  - todos os bois da corrida com tempo → `totalTime` (2 casas), `averageTime = total / bois` e status `COMPLETED`;
  - caso contrário, status `IN_PROGRESS`, ou `PENDING` sem nenhum tempo.
- **Publicação:**
  - prova no `eventScope` (corrige o achado da spec 6.4: hoje qualquer User publica prova alheia);
  - bloqueada com corrida `PENDING` ou `IN_PROGRESS`;
  - na transação: `Draw.status = PUBLISHED` e `publishedAt`; `Event.status = FINISHED` e `publishedAt`.
- **Pista (spec 6.6):**
  - corrida atual destacada (a primeira da versão sem total e sem NT) e o botão "Ir para a corrida atual";
  - `StatTile`s de Concluídas, NT, Restantes e Melhor média;
  - busca por nome ou número e filtro de bateria.
  - **Teclado:**
    - Enter e Tab avançam para o próximo campo de tempo;
    - a tecla `n` marca ou desmarca NT no boi;
    - Esc devolve o valor gravado.
  - Bois que não correm não têm campo.
  - Feedback otimista com reversão e toast em caso de erro, como hoje.
  - As gravações do mesmo boi saem **em série**, na ordem da digitação. Ao fechar a página (`pagehide`), as pendentes são enviadas com `keepalive`.
- **Locução (spec 6.7):**
  - `router.refresh()` a cada 3 s, só com a aba visível, e imediatamente ao voltar a ela;
  - corrida atual grande, próximas 5 corridas e últimas 5 concluídas;
  - sem campo novo no banco.
- **Resultado:**
  - ranking por média, com NT e incompletas no fim;
  - pódio com os 3 primeiros;
  - "Publicar resultado" com confirmação e bloqueio explicado;
  - "Imprimir", via impressão CSS.
- Tokens Arena e as mesmas regras de UI das fases 2 e 3. O `text-white` legado do `EventDetailsPage` sai (pendência da fase 3).
- Lint, `npm test`, `npm run test:e2e` e `npm run build` verdes no fim.

## Review Focus

1. **User B lançando tempo ou publicando na prova do A** pela API: 404, sem gravar nada. Testes nas Tasks 1 e 2.
2. **Digitar rápido "8", "8.1", "8.12"** no mesmo boi: o banco termina com 8.12, porque as gravações saem em série. Teste na Task 3.
3. **Tempo depois da publicação ou corrida de versão antiga:** 409 claro, e a tela mostra o toast e volta ao valor gravado. Teste na Task 1.
4. **Locução aberta em outro computador:** depois de um tempo lançado na pista, ela mostra a corrida seguinte sem recarregar a página. Teste e2e na Task 4.
5. **Publicar com corrida incompleta:** botão desabilitado com a explicação e 422 no servidor. Teste na Task 5.

---

### Task 1: `runResult` + command de tempos (+ trava no sorteio)

**Files:** Create `src/lib/runResult.ts` e o teste; `src/server/services/commands/times.ts` e o teste. Modify `src/server/routes/runs/[runId]/times.ts` (delega ao command e mantém o JSON) e `commands/draws.ts` (`FOR UPDATE` na prova).

**Produces:**
- `computeRunResult(numberOfBulls, times: Array<{ bullNumber; timeSeconds: number | null; isNt }>) → { totalTime: number | null; averageTime: number | null; isNt: boolean; status }`;
- `recordTime(user, runId, { bullNumber, timeSeconds: number | null, isNt })`, que devolve a corrida atualizada com os tempos (mesmo shape do JSON atual). O boi acima de `numberOfBulls` dá 422.

- [ ] Testes:
  - `computeRunResult` cobre NT, completa, parcial e vazia;
  - `recordTime` deixa o User gravar na própria prova e devolve 404 para a prova de outro;
  - 409 com a prova `FINISHED`;
  - 409 com a corrida de versão antiga;
  - roda em `$transaction` com `$executeRaw` de lock.
- [ ] Commit: `feat: tempos gravados em transação, User nas próprias provas e trava de versão`.

### Task 2: Publicação com dono + action

**Files:** Create `commands/results.ts` e o teste; `publishResultsAction(eventId)` em `src/server/actions/results.ts`, que revalida o layout da prova, `/provas` e `/`. Modify o handler `results/publish.ts`, que delega ao command.

- [ ] Testes: User B → 404; corrida incompleta → 422 com a mensagem atual; sucesso grava `publishedAt` no Draw e no Event na transação. Commit: `fix: publicação de resultado respeita o dono da prova`.

### Task 3: Pista em componentes

**Files:**
- Create em `src/components/track/`:
  - `TrackBoard.tsx`: estatísticas, busca, filtro de bateria, corrida atual e baterias;
  - `TrackRow.tsx`;
  - `TimeCell.tsx`: input `inputMode="decimal"`, `placeholder="0.00"` e `aria-label="Tempo boi N da corrida X"`, mais o botão NT (`aria-pressed`, `aria-label="NT boi N da corrida X"`);
  - `currentRun.ts`, puro.
- Modify `TrackClient.tsx` (fila em série por boi, `keepalive` e `pagehide`).
- Delete `src/components/RunsTable.tsx`.

- [ ] Testes:
  - `TimeCell.test.tsx`: Enter foca o próximo `[data-time-cell]`, `n` chama `onNt` e Esc restaura;
  - `currentRun.test.ts`;
  - o teste da fila em série vai em `src/lib/serialQueue.ts` e no seu teste.
- [ ] e2e: o fluxo da pista passa a rodar como **userA**, não como admin; "Ir para a corrida atual" foca o campo do boi 1 dela; sem scroll horizontal no celular. Commit: `feat: pista em componentes Arena com lançamento por teclado`.

### Task 4: Locução com atualização automática

**Files:** Create `src/lib/useAutoRefresh.ts` (intervalo de 3 s, pausa com `document.hidden`, refresh no `visibilitychange`) e o teste; `src/components/announcer/AnnouncerBoard.tsx`. Modify `locucao/AnnouncerClient.tsx` e `page.tsx`. Delete `src/components/AnnouncerPage.tsx`.

- [ ] Teste do hook com timers falsos: chama o refresh a cada 3 s, não chama com a aba oculta e chama ao voltar.
- [ ] e2e com dois `page` no mesmo contexto (locução e pista): lançar os tempos da corrida atual na pista faz a locução mostrar a próxima em até 8 s. Commit: `feat: locução atualizada sozinha a cada 3 s`.

### Task 5: Resultado e publicação

**Files:** Create `src/components/results/ResultsBoard.tsx` e `src/lib/ranking.ts` com o teste. Modify `resultado/ResultsClient.tsx` e `page.tsx`, `EventDetailsPage.tsx` (sem `text-white`) e o CSS de impressão (`@media print` com cabeçalho e tabela). Delete `src/components/ResultsPage.tsx`.

- [ ] Teste do ranking: menor média primeiro; NT e incompletas no fim, em ordem de número.
- [ ] e2e: o botão de publicar fica desabilitado com corrida incompleta; a API devolve 404 ao User B que tenta publicar a prova do A. Commit: `feat: resultado com ranking, publicação e impressão`.

### Task 6: Docs e verificação

- [ ] Referência técnica: tempos, publicação, locução e pista. Lint, unit, e2e completo e build verdes; screenshots da pista, da locução e do resultado no celular. Commit: `docs: referência técnica da fase 4`.
