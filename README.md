# Internal Requests Manager

Protótipo web para gestão de solicitações internas. O planejamento (PRD, ADRs, API e modelo de dados) está em `docs/`. Esta é uma versão curta do README; a completa vem na issue #11.

## Como rodar

Pré-requisito: Docker com Compose. No Windows, Docker Desktop com a integração WSL ligada.

```bash
docker compose up -d --build
```

A primeira subida demora, por causa do `composer install` e do `npm ci`.

| Serviço | URL |
|---|---|
| Front-end | http://localhost:3000 |
| API | http://localhost:8000 (health check em `/up`) |
| Mailpit | http://localhost:8025 |
| MySQL | localhost:3306 (banco, usuário e senha no `docker-compose.yml`) |

- Usuários do seed para uso local (senha `password`): `solicitante@empresa.com` (solicitante), `analista@empresa.com` (analista) e `admin@empresa.com` (administrador). Só são criados nos ambientes `local` e `testing`; as áreas são criadas sempre. O seed também cria pedidos de exemplo para a solicitante, abertos, em análise e decididos.
- Parar: `docker compose down`. Zerar o banco: `docker compose down -v`.
- O worker não recarrega o código: após mudar jobs, rode `docker compose restart worker`.

### Várias branches ao mesmo tempo

Cada branch pode ter a própria worktree, com uma stack própria (containers e banco separados):

```bash
git fetch
git worktree add .claude/worktrees/<branch> -b <branch> origin/main
cd .claude/worktrees/<branch>
cp .env.example .env   # troque as portas, por exemplo 8001, 3001, 3307, 8026 e 1026
docker compose up -d --build
```

- As URLs da tabela acima passam a usar as portas do `.env` da worktree.
- O cookie de sessão vale para `localhost` em qualquer porta: para usar dois front-ends logados ao mesmo tempo, abra o segundo em outro perfil ou numa janela anônima.
- Para remover: `docker compose down -v` dentro da worktree e depois `git worktree remove .claude/worktrees/<branch>`.

## Comandos

Use sempre `-u "$(id -u):$(id -g)"` para não criar arquivos de root.

Back-end, prefixando com `docker compose exec -u "$(id -u):$(id -g)" api`:

| Comando | O que faz |
|---|---|
| `composer lint` | Confere o estilo (Pint); `composer lint:fix` corrige |
| `composer analyse` | Análise estática (Larastan) |
| `composer test` | Testes (PHPUnit, MySQL `testing`) |
| `php artisan migrate:fresh --seed` | Recria o banco com os dados iniciais |

Front-end, prefixando com `docker compose exec -u "$(id -u):$(id -g)" frontend`:

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run format:check` | Confere o Prettier; `npm run format` corrige |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes (Vitest) |
| `npm run build` | Build de produção |
