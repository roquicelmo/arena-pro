# Aprendizados

Uma linha por lição: sintoma → causa/correção. Não apague linhas; corrija as que ficarem erradas.

## Next.js
- Página filha com `notFound()` respondia HTTP 200 → um `loading.tsx` do pai já tinha começado o streaming. Checagens de escopo ficam em layouts acima do `loading`.
- Permissão furada na navegação cliente → layouts não re-executam ao navegar. Toda página chama `requireUser`.
- `npx tsc --noEmit` dá ~48 erros ("possibly 'null'" em `useSearchParams`, `Decimal` x `number`) → falso alarme fora do `next build`. Verifique tipos com `npm run build`.
- "This module cannot be imported…" ao importar command → `server-only` em código alcançável pelo Pages API. Commands, localidades e raw ficam sem `server-only`.

## Banco e Prisma
- `prisma migrate reset` bloqueado para agentes → use `npm run db:test:reset`.
- Migrations geradas com `prisma migrate diff`, nunca `migrate dev`.
- Vazamento de dados entre usuários → `accessScope` devolve OR de topo. Combine com AND.
- Login em produção caiu com erro csrf 500 → faltava `AUTH_SECRET` na Vercel.
- Migration nova quebra produção → o build não migra. Rode `npm run db:deploy` antes de promover o deploy.

## UI
- `.text-white` não funcionava → camada CSS legada sobrescrevia (já removida). Use `text-on-accent`.
- "Escolha uma cidade da lista" ao enviar rápido → lista assíncrona (CityPicker) ainda carregando. Bloqueie o submit enquanto carrega.
- Overflow horizontal no mobile com nomes longos → `min-w-0` nos itens do grid.
- Caixas de tempo colapsadas no PDF → `flex: 1` dentro de coluna no @react-pdf. Remova.

## Pista e tempos
- NT nunca persistia → tempo vazio apagava a linha. Só apaga quando `timeSeconds` é null e não é NT.

## E2E
- Testes colidem com `--repeat-each` → registros com nome fixo por projeto. Use sufixo do projeto e não repita.
- Datas de relatório instáveis → use a data do seed.

## Processo
- Produção com layout antigo depois do merge → PRs empilhados (#9, #10) entraram nos branches base, não na `main`. PR sempre com base `main`, ou troque a base antes do merge.
- reCAPTCHA "Invalid key type" → as chaves eram v3. "browser-error" no localhost → o domínio não está nas chaves.
