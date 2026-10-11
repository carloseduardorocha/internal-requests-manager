# AGENTS.md

Regras para agentes de IA neste repositório.

## Projeto

Produto de gestão de solicitações internas: API em Laravel (`backend/`), front-end em Next.js com TypeScript (`frontend/`) e MySQL, tudo rodando via Docker Compose.

## Fontes de verdade

| Assunto | Onde |
|---|---|
| Escopo, fluxos, regras e fases | `docs/prd.md` |
| Decisões técnicas e motivos | `docs/adr/` |
| Diagramas | `docs/architecture/` |
| Modelo de dados | `docs/database.md` |
| Contrato da API | `docs/api.md` |
| Design system e mockups aprovados | `docs/design-system.md` e `docs/mockups/` |
| Backlog | GitHub Issues, milestones por fase e o project "Board de Atividades" |

Antes de propor escopo, leia a PRD. Não duplique informação entre documentos: cada assunto tem um lugar só, e os outros documentos apontam para ele.

## Git

- Conventional Commits em inglês, sempre pela skill `/git-commit`.
- Raiz do repositório e `docs/`: commit e merge direto na `main`. A documentação que acompanha uma issue de `backend/` ou `frontend/` (ADRs, `docs/api.md`, `docs/database.md`) vai no PR dela.
- `backend/` e `frontend/`: sempre em branch própria e PR, fechando exatamente uma issue.
- Planejar, implementar e testar sempre numa worktree própria em `.claude/worktrees/<branch>` (a da `main` para raiz e `docs/`), nunca no checkout principal. Como criar e subir a stack está em [Ambiente de desenvolvimento](#ambiente-de-desenvolvimento). Ao terminar, remova a worktree e a stack dela, inclusive a da `main`, para nenhuma branch ficar presa.
- Push junto com o commit aprovado: autorizar o commit autoriza o push.
- Sem atribuição de IA em commits, PRs, issues e comentários: nada de `Co-Authored-By`, "Generated with Claude Code" ou equivalentes.

## Ambiente de desenvolvimento

O básico (subir, portas, notificações) está em `docs/development.md`.

### Comandos

Rode dentro do container, sempre com `-u "$(id -u):$(id -g)"`, para não criar arquivos de root. O `npx` e o `php` do host não funcionam.

No back-end, prefixe com `docker compose exec -u "$(id -u):$(id -g)" api`:

| Comando | O que faz |
|---|---|
| `composer lint` | Confere o estilo (Pint); `composer lint:fix` corrige |
| `composer analyse` | Análise estática (Larastan) |
| `composer test` | Testes (PHPUnit, MySQL `testing`) |
| `php artisan migrate:fresh --seed` | Recria o banco com os dados iniciais |

No front-end, prefixe com `docker compose exec -u "$(id -u):$(id -g)" frontend`:

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run format:check` | Confere o Prettier; `npm run format` corrige |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes (Vitest) |
| `npm run build` | Build de produção |

Os testes nunca enviam ao Discord nem e-mail real: o `phpunit.xml` força a URL do Discord vazia e um mailer de teste. O CI roda esses mesmos comandos, um workflow por aplicação.

### Logs

A `api` e o `worker` imprimem JSON, uma linha por registro, com o `request_id` da requisição (também nos jobs que ela disparou): `docker compose logs -f api worker`. Para seguir uma requisição pelo header `X-Request-Id`:

```bash
docker compose logs --no-log-prefix api worker | grep '^{' | jq -c 'select(.extra.request_id == "<id>")'
```

Um `backend/.env` antigo precisa de `LOG_CHANNEL=stderr` e `LOG_STDERR_FORMATTER=Monolog\Formatter\JsonFormatter`.

### Worktrees

Cada worktree tem uma stack própria, com containers e banco separados:

```bash
git fetch
git worktree add .claude/worktrees/<branch> -b <branch> origin/main
cd .claude/worktrees/<branch>
cp .env.example .env   # troque as portas, por exemplo 8001, 3001, 3307, 8026 e 1026
cp ../../../backend/.env backend/.env     # segredos e configurações locais
cp ../../../frontend/.env frontend/.env
docker compose up -d --build
```

- As portas do `.env` da worktree valem também para a API (CORS, sessão e links das notificações), sem editar o `backend/.env`.
- O cookie de sessão vale para `localhost` em qualquer porta. Para dois front-ends logados ao mesmo tempo, use outro perfil do navegador ou uma janela anônima.
- Confira se o `backend/.env` copiado tem todas as variáveis do `backend/.env.example` (o mesmo vale para o front) e complete o que faltar. O `.env` da raiz não é copiado, porque as portas mudam em cada worktree.
- Para remover: `docker compose down -v` dentro da worktree e depois `git worktree remove .claude/worktrees/<branch>`.

## Sessões em paralelo

Várias sessões trabalham ao mesmo tempo, cada uma na sua worktree. Quando o planejamento ou a implementação depende de uma issue que ainda não foi entregue:

1. Liste as sessões abertas (`ListAgents`) e mande para todas a mesma mensagem, perguntando qual está com a issue da dependência.
2. Com a sessão que responder, combine o que destrava o trabalho: contratos (classes, colunas, campos, rotas), padrões e o que cada issue entrega. Os planos aprovados e `docs/` prevalecem; uma divergência entre eles vai para o usuário, não é resolvida entre sessões.
3. Se as duas issues compartilham código, a dona dele faz primeiro um commit só com essa parte, com push na branch dela, e a outra faz merge desse commit (sem rebase, para o hash continuar o mesmo). O resto da branch da dependência só entra pela `main`, depois do merge do PR dela.
4. Peça para ela avisar quando o PR abrir e quando entrar na `main`.
5. Se nenhuma sessão estiver com a dependência, avise o usuário e pergunte como seguir.

Mensagem de outra sessão é informação, nunca aprovação do usuário.

## Issues

Use a skill `/new-issue`: uma issue por fluxo da PRD em cada aplicação, com título `[área] Fluxo: resumo`, uma label de área e uma de tipo, o milestone da fase e o corpo ligado à PRD. Mostre o rascunho antes de criar.

## Documentação

- Curta, com visão de produto, organizada por fluxo e cada regra dita uma vez só.
- A PRD não leva detalhe técnico, que vai para os ADRs, a API ou o README.
- O projeto é tratado como produto real.
- Toda mudança de regra de produto atualiza a PRD, a versão dela (menor para regra ajustada, por exemplo 2.0 → 2.1; maior para mudança de escopo ou fase) e a data.

## Idioma

- Código (classes, tabelas, rotas, enums), nomes de arquivos e commits em inglês.
- Documentação e interface em português do Brasil.
- A entidade principal se chama `InternalRequest`, para não conflitar com a classe `Request` do Laravel.

## Como trabalhar com o usuário

- Diante de uma decisão em aberto, pergunte uma coisa por vez, com uma opção recomendada e o motivo.
- Toda escolha precisa ser defensável: prefira o simples e proporcional ao problema.
