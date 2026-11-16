# Fase 3 — Inscrições e sorteio: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (escolhido pelo usuário para economizar tokens: execução na própria sessão e uma revisão final única). Steps em checkbox.

**Goal:** Levar inscrições, sorteio da prova, súmula em PDF e sorteio avulso para Server Actions e componentes Arena, com a versão do sorteio em transação, a regra de refazer e a validação de escopo do atleta inscrito.

**Architecture:** Mesmo padrão da fase 2. Commands sem `server-only` em `src/server/services/commands/{registrations,draws}.ts`, usados pelas actions (`runAction`) e pelos handlers `/api`. A lógica pura de planejamento das baterias sai do `DrawConfiguration` para `src/lib/drawPlanning.ts`, e a paginação da súmula fica em `src/lib/sumula.ts` (ambas testadas). O PDF é gerado em Route Handlers com `@react-pdf/renderer`.

**Tech Stack:** Next.js 16.4, React 19.2, Prisma 6.19, Zod 4.6, `@react-pdf/renderer` (dependência nova, decidida na spec 4.2), Vitest e Playwright.

**Spec:** [2026-11-16-refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md), seções 6.4, 6.5, 6.8, 6.9 (impacto na fase 3), 7 e 9 (fase 3). **Fase anterior:** [2026-11-16-fase-2-cadastros.md](2026-11-16-fase-2-cadastros.md).

## Global Constraints

- **Branch:** `refactor/fase-3-sorteio`, a partir de `main`. O PR aponta para `main`.
- **Schema intocado.** A unicidade `@@unique([eventId, version])` do `Draw` já existe e serve de trava contra corrida.
- **Escopo:** a prova segue `eventScope`. O atleta inscrito precisa estar ativo e no `accessScope` do **dono da prova** (dele ou compartilhado com ele). Fora disso: "Atleta não encontrado ou inativo." (404).
- **Regra de refazer:** é permitido gerar uma versão nova enquanto nenhuma corrida da versão atual tiver `RunTime` e a prova não estiver `FINISHED` nem com `publishedAt`. Caso contrário, o command recusa com 409 e a tela mostra o botão desabilitado com a explicação. Refazer com sorteio existente pede confirmação: "Súmulas já impressas ficam desatualizadas."
- **Versão em transação:** dentro de `prisma.$transaction`, leitura da última versão, checagem de trava, criação do `Draw` e dos `Run`, e prova em `DRAWN`. Uma colisão `P2002` vira 409: "Outro sorteio foi gerado ao mesmo tempo. Recarregue a página."
- **PDF (spec 7):**
  - A4 retrato, 28 corridas por página.
  - Cabeçalho em toda página: rótulo ("Súmula de pista" ou "Sorteio"), título, data, arena ou local, "Versão N" (só na prova), total de corridas e "Página X de Y".
  - Faixa por bateria: "Bateria N · Cabeceiros X × Pezeiros Y · Corridas a–b". Quando a bateria mistura cruzamentos, a faixa diz só "Bateria N · Corridas a–b" e entra a coluna "Grupos". Uma bateria que quebra de página repete a faixa com "(continuação)".
  - Colunas: Nº · Cabeceiro (nome e HC) · Pezeiro (nome e HC) · SHC · T1 · T2 · T3 · Total. As caixas de tempo ficam em branco; os bois além de `numberOfBulls` aparecem riscados.
  - Rodapé: "Arena Pro · gerado em dd/mm/aaaa hh:mm" e "Assinatura do juiz".
  - Barlow e Barlow Condensed embutidas; só preto e cinzas.
  - `Content-Disposition: attachment; filename="sumula-<slug>-v<N>.pdf"`. Sem sorteio: 404 com mensagem.
- **Sorteio avulso:** etapas Participantes → Configuração → Revisão → PDF.
  - Não persiste nada.
  - O sorteio roda numa Server Action sobre os ids enviados, conferidos no `accessScope` do usuário.
  - O PDF vem de um `POST` autenticado que recebe o cabeçalho e as corridas já sorteadas. Ele confere os ids, relê nomes e handicaps do banco e não sorteia de novo.
- Mesmas regras da fase 2:
  - feedback inline em formulários e toast nas ações soltas;
  - `noValidate` nos formulários;
  - tokens Arena, sem `text-white` nem hex legado;
  - nenhuma função passada de Server para Client Component;
  - toda página chama `requireUser()`;
  - `next/image` com `unoptimized` para SVG;
  - mensagens em pt-BR.
- Os endpoints `/api` de inscrições e sorteios delegam aos commands e mantêm o JSON e os status de sucesso.
- Apagar `DrawConfiguration.tsx`, `TransferList.tsx`, `WizardHeader.tsx` e `RegistrationPage.tsx`. O `RunsTable` fica para a fase 4.
- Lint, `npm test`, `npm run test:e2e` e `npm run build` verdes no fim.

## Review Focus

1. **Refazer depois do primeiro tempo lançado:** botão desabilitado com explicação, e o POST na API ou na action devolve 409. Testes nas Tasks 2 e 5.
2. **Duplo clique em "Gerar sorteio" ou dois computadores ao mesmo tempo:** uma única versão nova e 409 claro na outra tentativa. Teste na Task 2.
3. **User inscrevendo atleta de outro usuário**, por id adulterado: 404, sem gravar nada. Atleta compartilhado com o dono: aceito. Teste na Task 2.
4. **Bateria maior que uma página no PDF:** a faixa se repete com "(continuação)" e o "Página X de Y" fica correto. Teste na Task 6.
5. **PDF do avulso com corridas adulteradas** (atleta fora do escopo): 404, sem gerar PDF. Teste na Task 7.

---

### Task 1: Planejamento das baterias em `src/lib/drawPlanning.ts`

**Files:** Create `src/lib/drawPlanning.ts` e `src/lib/drawPlanning.test.ts`.

**Produces** (puras, movidas do `DrawConfiguration` sem mudar comportamento):
- `countPossibleRuns(cabeceiros, pezeiros): number` (exclui a dupla consigo mesmo);
- `boisDistribution(cabeceiros, pezeiros): { b1; b2; b3 }`;
- `effectiveBatteries(config): { numBatteries; mode: BatteryMode }`;
- `batteryRecommendation(runs, numGroups, config): { numBatteries; batteryMode; title; reason; runsPerBattery; isApplied }`, com os mesmos limiares e textos de hoje.

- [ ] Testes: 25 corridas → "1 Bateria Única"; 3 grupos com 90 corridas → 9 baterias `phases`; 3 grupos com 60 → 3 `major3`; 2 grupos com 50 → 4 `phases`; um atleta nas duas listas não faz dupla consigo (`countPossibleRuns([a,b],[a,c]) === 3`).
- [ ] Implementar, rodar `npx vitest run src/lib/drawPlanning.test.ts` e commitar: `refactor: planejamento de baterias em módulo puro`.

### Task 2: Commands de inscrições e sorteio; `/api` delega

**Files:** Create `src/server/services/commands/registrations.ts`, `draws.ts` e os testes. Modify os handlers em `src/server/routes/events/[eventId]/registrations/*` e `draws/index.ts`.

**Produces:**
- `registerAthlete(user, eventId, { athleteId, category: 'CABECEIRO' | 'PEZEIRO' })`: prova em `eventScope` (senão `notFound('Prova')`); atleta ativo em `accessScope({ id: event.createdById, role: 'USER' })` (senão `DomainError('Atleta não encontrado ou inativo.', { status: 404, field: 'athleteId' })`); inscrição ativa já existente dá 409 "Este atleta já está inscrito nesta prova."; inscrição cancelada é reativada.
- `cancelRegistration(user, eventId, registrationId)`.
- `getDrawLock(user, eventId): Promise<{ locked: false } | { locked: true; reason: 'times' | 'published' }>`.
- `generateDraw(user, eventId, config: DrawConfig)`: transação conforme as Global Constraints; 422 sem cabeceiro ou pezeiro; devolve `{ drawId, version }`.
- `quickDraw(user, { cabeceiroIds, pezeiroIds, config }): Run[]`: ids conferidos no `accessScope(user)` (algum fora → 404 "Atleta não encontrado ou inativo."); usa `executeGroupCrossDraw`.

- [ ] Testes (prisma mockado):
  - user não inscreve atleta de outro dono (404, `create` não chamado);
  - atleta compartilhado com o dono da prova é aceito (`where` com o `OR` de compartilhamento);
  - `generateDraw` recusa com 409 `times` quando há `RunTime` na versão atual;
  - `generateDraw` cria a versão `latest + 1` dentro do `$transaction`;
  - `P2002` vira a mensagem de 409.
- [ ] Os handlers delegam aos commands (os arrays de papéis literais viram `OPERATOR_ROLES`). Rodar `npm test` e os e2e de rotas da prova. Commitar: `refactor: commands de inscrição e sorteio com escopo, trava e versão em transação`.

### Task 3: Schemas e actions

**Files:** Create `src/lib/schemas/draws.ts` e `src/server/actions/draws.ts` (com testes).

**Produces:** `registerAthleteAction(eventId, input)`, `cancelRegistrationAction(eventId, registrationId)` e `generateDrawAction(eventId, config)`, que revalidam `{ path: '/provas/<id>', type: 'layout' }`, `/provas` e `/`; e `quickDrawAction(input): ActionResult<Run[]>`, sem revalidação. O `drawConfigSchema` espelha o Zod do handler atual.

- [ ] Testes: a action repassa ao command e revalida o layout da prova; a configuração inválida volta como `fieldErrors`. Commitar: `feat: actions de inscrição e sorteio`.

### Task 4: Tela de inscrições

**Files:** Create `src/components/registrations/RegistrationsView.tsx`. Modify `app/(app)/provas/[eventId]/inscricoes/page.tsx` e `loading.tsx`. Delete `RegistrationsClient.tsx` e `src/components/RegistrationPage.tsx`.

**UI:**
- duas colunas, "Cabeceiros (N)" e "Pezeiros (N)", com nome, HC da função e o botão `aria-label="Cancelar inscrição de <nome>"` (confirmação "Cancelar a inscrição?");
- painel "Inscrever atletas": busca "Buscar atleta" sobre os atletas disponíveis do dono da prova, ainda não inscritos, com os botões `aria-label="Inscrever <nome> como cabeceiro"` e `"… como pezeiro"`;
- empty states "Nenhum cabeceiro inscrito" e "Nenhum pezeiro inscrito";
- toasts "Inscrição feita." e "Inscrição cancelada.".

- [ ] e2e em `e2e/registrations.spec.ts`: inscrever um atleta novo, criado no teste com o sufixo do projeto, como pezeiro; cancelar com confirmação; o user B não vê os atletas do A na busca. Commitar: `feat: tela de inscrições com server actions`.

### Task 5: Sorteio da prova (configuração, geração e revisão)

**Files:**
- Create `src/components/draw/DrawSetup.tsx`, que é a configuração em cartões Arena (grupos e balanceamento, baterias com recomendação, regras de bois e gap, resumo) e usa `drawPlanning`.
- Create `src/components/draw/DrawReview.tsx`, a lista de corridas só para leitura, agrupada por bateria (reaproveitada no avulso).
- Modify `app/(app)/provas/[eventId]/sorteio/page.tsx` e `DrawClient.tsx`.
- Delete `src/components/DrawConfiguration.tsx`.

**Comportamento:**
- a página mostra `DrawSetup` e o botão "Gerar sorteio", que vira "Refazer sorteio" quando já existe versão;
- refazer pede confirmação, e com trava o botão fica desabilitado com o texto "Não é possível refazer: já há tempos lançados." ou "…: o resultado já foi publicado.";
- abaixo, "Sorteio atual — versão N" com `DrawReview` e o link "Baixar súmula (PDF)";
- depois de gerar, a página fica na própria tela, com o toast "Sorteio gerado" e o refresh.

- [ ] e2e: atualizar `event-routes.spec.ts` e `contrast.spec.ts` (gerar → revisão visível → aba Pista); teste novo: depois de lançar um tempo (admin), "Refazer sorteio" fica desabilitado com a explicação. Commitar: `feat: sorteio da prova com revisão e regra de refazer`.

### Task 6: Súmula em PDF

**Files:** Create `src/lib/sumula.ts` e o teste; `src/server/pdf/SumulaDocument.tsx`; as fontes em `src/server/pdf/fonts/` (woff de `@fontsource/barlow` e `@fontsource/barlow-condensed`, copiados); `app/(app)/provas/[eventId]/sorteio/sumula.pdf/route.ts`. Modify `next.config.ts` (`outputFileTracingIncludes` das fontes).

**Produces:** `paginateSumula(runs: SumulaRun[], perPage = 28): SumulaPage[]`, em que cada página é uma lista de itens `{ kind: 'band'; label; continued } | { kind: 'run'; run }`. As faixas contam como linha. `SumulaRun = { numero; bateria; cabeceiro: { nome; hc }; pezeiro: { nome; hc }; grupoCab; grupoPe; shc; bois }`.

- [ ] Testes: bateria única com 40 corridas → 2 páginas, e a segunda começa com a faixa `continued: true`; faixa com cruzamento único mostra "Cabeceiros A × Pezeiros B"; faixa mista omite os grupos; `buildFilename('Copa Lagoa 2026', 3) === 'sumula-copa-lagoa-2026-v3.pdf'`.
- [ ] A rota `GET` exige sessão (sem sessão, 401 JSON), aplica escopo (404) e responde 404 "Nenhum sorteio gerado para esta prova." sem sorteio.
- [ ] e2e: `GET` da súmula responde 200, `application/pdf`, corpo começando com `%PDF` e `/Type /Page`. Commitar: `feat: súmula de pista em PDF`.

### Task 7: Sorteio avulso com PDF

**Files:**
- Create `src/components/quick-draw/QuickDrawWizard.tsx` (etapas, com os passos em `nav` e `aria-current="step"`).
- Create `src/components/quick-draw/ParticipantPicker.tsx` (duas listas com checkbox e busca, "Selecionar todos" por lista, cadastro rápido via `AthleteFormDialog`).
- Create `app/(app)/sorteio-avulso/sumula.pdf/route.ts` (`POST`).
- Modify `page.tsx` e delete `QuickDrawClient.tsx`, `TransferList.tsx` e `WizardHeader.tsx`.

**UI:** a revisão traz os campos "Título do sorteio" (obrigatório), "Data" e "Local", e os botões "Baixar PDF" e "Refazer sorteio".

- [ ] e2e: atualizar `quick-draw.spec.ts` e `contrast.spec.ts`; selecionar todos → gerar → revisão com CABECEIRO A1 → baixar o PDF (o download é um `.pdf` não vazio); um `POST` com o id de um atleta do user B devolve 404. Commitar: `feat: sorteio avulso em etapas com PDF`.

### Task 8: Documentação e verificação

- [ ] `docs/project-technical-reference.md`: inscrições (escopo do dono), regra de refazer, transação, rotas de PDF e sorteio avulso.
- [ ] `npm run lint && npm test && npm run test:e2e && npm run build` verdes e screenshots conferidos (sorteio, súmula e avulso; desktop e mobile). Commitar: `docs: referência técnica da fase 3`.
