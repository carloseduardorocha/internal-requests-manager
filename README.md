# Gestão de Solicitações Internas

Os pedidos internos costumam chegar por e-mail, mensagens e planilhas, sem dono nem histórico. Este produto reúne tudo num só lugar: quem pede registra e acompanha, quem analisa assume e decide com justificativa, e a gestão acompanha a operação por um painel. A equipe é avisada no Discord, e o solicitante, por e-mail.

O porquê e as regras estão na [PRD](docs/prd.md#visão-geral).

## Como rodar

**Pré-requisito:** Docker com Compose. No Windows, use o Docker Desktop com a integração WSL ligada.

```bash
git clone https://github.com/carloseduardorocha/internal-requests-manager.git
cd internal-requests-manager
docker compose up -d --build
```

A primeira subida demora alguns minutos, por causa do `composer install` e do `npm ci`. A cada subida, a API prepara o ambiente: na primeira, cria o `backend/.env` a partir do `backend/.env.example` e gera a chave; em todas, roda as migrations e o seed. O seed recria os usuários e os pedidos de exemplo que estiverem faltando, inclusive os que você editar ou excluir. Para acompanhar, use `docker compose logs -f api`. A API está pronta quando `/up` responde. O front-end roda em modo de desenvolvimento, então o primeiro acesso a cada página leva alguns segundos para compilar.

| Serviço | URL |
|---|---|
| Front-end | http://localhost:3000 |
| API | http://localhost:8000 (health check em `/up`) |
| Mailpit (e-mails enviados) | http://localhost:8025 |
| MySQL | localhost:3306 (banco, usuário e senha no `docker-compose.yml`) |

- Parar: `docker compose down`. Zerar o banco: `docker compose down -v`.
- Se alguma porta já estiver em uso, copie o `.env.example` da raiz para `.env` e troque as portas.
- O `worker` não recarrega o código: depois de mudar um job ou uma notificação, rode `docker compose restart worker`. A `api` não relê o `backend/.env`: depois de mudá-lo, rode `docker compose restart api worker`.

### Notificações

As notificações saem por uma fila no banco, processada pelo serviço `worker` ([ADR 0005](docs/adr/0005-database-queue-and-retries.md)). Por isso, a ação de quem usa nunca espera o envio. Se um envio falhar, o sistema tenta de novo até 3 vezes, com espera de 1, 5 e 15 minutos, num total de 4 tentativas. Cada tentativa fica em `notification_logs`, e o job que esgota as tentativas vai para `failed_jobs`.

Os segredos das notificações ficam no `backend/.env`, que está fora do Git. Depois de mudá-lo, rode `docker compose restart api worker`. As worktrees recebem uma cópia dele (veja [Várias branches ao mesmo tempo](#várias-branches-ao-mesmo-tempo)).

#### Discord

O canal da equipe recebe uma mensagem quando um pedido é criado e quando é decidido. A mensagem traz o número, o título, a prioridade, o solicitante e a área, e um link para o pedido. Na decisão, entram também o resultado, quem decidiu e a justificativa.

1. No Discord, vá em **Configurações do canal → Integrações → Webhooks → Novo webhook** e copie a URL.
2. Preencha `DISCORD_WEBHOOK_URL=<a URL copiada>` no `backend/.env` e rode `docker compose restart api worker`.

Com `DISCORD_WEBHOOK_URL` vazia (o padrão), nada vai ao Discord: nenhum job e nenhum registro. O resto do produto funciona normalmente. A URL é um segredo, porque quem a tem consegue postar no canal. Ela não vai para o Git e não é gravada nos jobs nem nos logs.

#### E-mail

O solicitante recebe um e-mail quando o pedido dele é assumido e quando é decidido. O e-mail traz o título, o novo status, quem assumiu ou decidiu, a justificativa (na decisão) e o botão "Ver pedido". O link de recuperação de senha também sai por aqui, pelo mesmo `worker`.

O convite de conta (fluxo 6 da PRD) também é um e-mail, enviado pela mesma fila, e aparece no Mailpit. O link vale por `INVITATION_EXPIRE_DAYS` dias (padrão 7, no `backend/.env`).

No desenvolvimento, não é preciso configurar nada. O `backend/.env.example` já aponta para o Mailpit, que recebe os e-mails sem entregá-los a ninguém. Para vê-los, abra http://localhost:8025.

Para enviar de verdade pelo Gmail, basta mudar a configuração, sem tocar no código ([ADR 0007](docs/adr/0007-discord-webhook-and-smtp.md)):

1. Na conta Google, ligue a verificação em duas etapas e crie uma **senha de app**.
2. Ajuste estas variáveis no `backend/.env`. O `backend/.env.example` tem um bloco comentado com elas, menos o `MAIL_FROM_ADDRESS`, que fica fora do bloco.

   ```dotenv
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=<sua conta>@gmail.com
   MAIL_PASSWORD=<senha de app>
   MAIL_FROM_ADDRESS=<sua conta>@gmail.com
   ```

   O remetente precisa ser a própria conta, porque o Gmail reescreve um remetente diferente. A senha de app é um segredo.
3. Aplique a mudança como indicado acima.

**Atenção:** os destinatários são os e-mails dos usuários do seed. Por padrão, eles usam `empresa.com`, que é um domínio real, de terceiros. Antes de ligar o Gmail, configure a `SEED_USERS_EMAIL` (veja [Usuários de demonstração](#usuários-de-demonstração)) para os e-mails de teste chegarem na sua caixa.

Se o SMTP estiver errado ou fora do ar, assumir e decidir continuam funcionando, e os envios falham no `worker`, com novas tentativas e registro de cada uma.

## Usuários de demonstração

Todos usam a senha `password`.

| E-mail | Perfil | O que dá para testar |
|---|---|---|
| `solicitante@empresa.com` | Solicitante (Ana Souza, Financeiro) | Criar, editar e excluir os próprios pedidos abertos; acompanhar o andamento |
| `analista@empresa.com` | Analista (Bruno Lima, Operações) | Ver todos os pedidos, assumir, aprovar ou rejeitar com justificativa; painel |
| `admin@empresa.com` | Administrador (Carla Mendes, Tecnologia) | Tudo o que os outros perfis fazem, sobre qualquer pedido |

- Os usuários só são criados nos ambientes `local` e `testing`. As áreas são criadas sempre.
- O seed cria 10 pedidos da Ana: 6 abertos, 2 em análise com o Bruno, 1 aprovado e 1 rejeitado.

Para receber os e-mails de teste na sua caixa, preencha a `SEED_USERS_EMAIL` com o seu endereço, no `backend/.env`. Por exemplo, `SEED_USERS_EMAIL=voce@gmail.com` cria `voce+solicitante@gmail.com`, `voce+analista@gmail.com` e `voce+admin@gmail.com`, todos com a senha `password`, e esses passam a ser os logins. O `+` funciona no Gmail e na maioria dos provedores, mas não em todos.

O seed procura os usuários pelo e-mail. Por isso, depois de ligar, trocar ou desligar a variável, recrie o banco. Sem isso, a próxima subida cria mais 3 usuários e duplica os pedidos de exemplo:

```bash
docker compose exec -u "$(id -u):$(id -g)" api php artisan migrate:fresh --seed
```

## Roteiro rápido

Um caminho de ponta a ponta, em uns cinco minutos. Os fluxos completos estão na [PRD](docs/prd.md#fluxos).

1. Entre como `solicitante@empresa.com` e crie um pedido. Se o webhook estiver configurado, a mensagem aparece no Discord.
2. Saia e entre como `analista@empresa.com`. Abra o pedido novo na lista e clique em **Assumir análise**. O e-mail "Seu pedido #N está em análise" chega no [Mailpit](http://localhost:8025).
3. No mesmo pedido, escreva uma justificativa, clique em **Aprovar** ou **Rejeitar** e confirme. O e-mail da decisão chega no Mailpit, e o Discord recebe a decisão.
4. Abra o **Painel** e veja os totais por status e a distribuição por prioridade.
5. Volte como `solicitante@empresa.com`. O pedido aparece decidido, com a justificativa e o histórico de status, e não pode mais ser editado.

## Arquitetura e decisões

Front-end em Next.js e API em Laravel, separados, com MySQL e um `worker` para a fila. Tudo sobe com o Docker Compose.

| ADR | Decisão |
|---|---|
| [0001](docs/adr/0001-layered-laravel-backend.md) | Back-end em camadas: controller fino, Form Request, Action por caso de uso, Policy e Resource |
| [0002](docs/adr/0002-feature-based-nextjs-frontend.md) | Front-end Next.js organizado por fluxo (`src/features/<fluxo>`) |
| [0003](docs/adr/0003-mysql-database.md) | MySQL 8, com enums gravados como texto |
| [0004](docs/adr/0004-sanctum-spa-authentication.md) | Sessão em cookie com Sanctum SPA, sem token no navegador |
| [0005](docs/adr/0005-database-queue-and-retries.md) | Fila no banco, 4 tentativas e registro de cada envio |
| [0006](docs/adr/0006-docker-compose.md) | Ambiente com Docker Compose, em cinco serviços |
| [0007](docs/adr/0007-discord-webhook-and-smtp.md) | Discord por webhook e e-mail por SMTP |
| [0008](docs/adr/0008-quality-tooling-and-ci.md) | Lint, análise estática, testes no MySQL e CI por aplicação |
| [0009](docs/adr/0009-shadcn-ui-component-library.md) | shadcn/ui como base dos componentes |
| [0010](docs/adr/0010-invitation-token.md) | Token do convite: aleatório, guardado como hash e de uso único |
| [0011](docs/adr/0011-password-reset-native-broker.md) | Recuperação de senha com o broker nativo do Laravel |

Mais detalhes:
- [Diagramas](docs/architecture/): os containers e o fluxo das notificações.
- [Contrato da API](docs/api.md).
- [Modelo de dados](docs/database.md).
- [Design system](docs/design-system.md) e [mockups aprovados](docs/mockups/).

## Entregue e pendente

| Fase | Situação |
|---|---|
| [Fase 1: operação básica](https://github.com/carloseduardorocha/internal-requests-manager/milestone/1?closed=1) | Entregue: acesso, solicitações, análise e decisão, e painel |
| [Fase 2: comunicação](https://github.com/carloseduardorocha/internal-requests-manager/milestone/2?closed=1) | Entregue: Discord para a equipe e e-mail para o solicitante |
| [Fase 3: expansão](docs/prd.md#fases) | Não iniciada (veja [Evolução](#evolução)) |

**Limitações conhecidas**

- Roda só localmente. Os containers são de desenvolvimento, com o código montado do disco e o servidor embutido do PHP, e não há imagens nem guia de produção.
- O convite e a gestão de usuários (editar, desativar e reativar) existem só na API; ainda não há tela. Se dois administradores se desativarem ao mesmo tempo, ou um desativar o outro enquanto o outro tira o perfil de administrador do primeiro, o sistema pode ficar sem administrador ativo ([ADR 0004](docs/adr/0004-sanctum-spa-authentication.md)).
- Não há tela para ver `notification_logs` nem `failed_jobs`. Para reenviar o que falhou, rode `docker compose exec -u "$(id -u):$(id -g)" api php artisan queue:retry all`.
- O e-mail usa o layout padrão do Laravel, sem a identidade visual do produto, e não há preferência de notificação por usuário.
- O Discord tem um canal só, o da equipe.
- Se o `worker` cair no meio de um envio, essa tentativa não fica registrada em `notification_logs` ([ADR 0005](docs/adr/0005-database-queue-and-retries.md)).
- O painel mostra só contagens. Os tempos até assumir e até decidir ficam para a Fase 3.
- Os checks do CI não são obrigatórios na `main`, e o [ADR 0008](docs/adr/0008-quality-tooling-and-ci.md) explica o que seria preciso para torná-los obrigatórios.

**Critérios de priorização**

As fases da [PRD](docs/prd.md#fases) seguem esta ordem:

1. **Operação básica primeiro:** sem registrar, decidir e acompanhar pedidos, não há produto. Cada fluxo virou uma issue de API e uma de tela, na ordem da PRD.
2. **Comunicação depois:** as notificações só têm valor quando o fluxo já funciona, e não podem atrasar nem quebrar quem usa. Por isso saem por uma fila, com novas tentativas e o registro de cada uma.
3. **Expansão por último:** convite, produção, SSO, IA e novos canais ampliam o alcance de algo que já precisa estar estável.

## Evolução

O que a [Fase 3 da PRD](docs/prd.md#fases) prevê:

- Cadastro por convite, recuperação de senha e gestão de usuários.
- Disponibilização online.
- Sugestão de prioridade ou resumo do pedido por IA, sempre com a decisão final de uma pessoa.
- Login com Google ou SSO da empresa.
- Indicadores de tempo até assumir e até decidir.
- Notificações em outros canais, como Slack e Teams.

O caminho técnico:

- **Produção:** front e API em `app.<domínio>` e `api.<domínio>`, configurados só por variáveis de ambiente ([ADR 0004](docs/adr/0004-sanctum-spa-authentication.md)). Para isso, faltam imagens de produção e o deploy.
- **Fila:** trocar o driver `database` por outro, como o Redis, é só configuração, sem mudar o código ([ADR 0005](docs/adr/0005-database-queue-and-retries.md)).
- **Novos canais:** Slack e Teams podem seguir o padrão atual, como mais um canal nas mesmas Notifications do Laravel, com a mesma fila, as mesmas tentativas e o mesmo registro. Isso ainda não está decidido em ADR.
- **Login com Google ou SSO:** pode entrar ao lado da sessão Sanctum ([ADR 0004](docs/adr/0004-sanctum-spa-authentication.md)), que continuaria sendo a sessão do produto. Isso também ainda não está decidido em ADR.

## Desenvolvimento

### Comandos

Use sempre `-u "$(id -u):$(id -g)"`, para não criar arquivos de root.

No back-end, prefixe os comandos com `docker compose exec -u "$(id -u):$(id -g)" api`:

| Comando | O que faz |
|---|---|
| `composer lint` | Confere o estilo (Pint); `composer lint:fix` corrige |
| `composer analyse` | Análise estática (Larastan) |
| `composer test` | Testes (PHPUnit, MySQL `testing`) |
| `php artisan migrate:fresh --seed` | Recria o banco com os dados iniciais |

No front-end, prefixe os comandos com `docker compose exec -u "$(id -u):$(id -g)" frontend`:

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run format:check` | Confere o Prettier; `npm run format` corrige |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes (Vitest) |
| `npm run build` | Build de produção |

Os testes nunca enviam ao Discord nem e-mail real, mesmo com os segredos configurados: o `phpunit.xml` força a URL do Discord vazia e um mailer de teste.

O CI roda esses mesmos comandos no GitHub Actions, um workflow por aplicação ([ADR 0008](docs/adr/0008-quality-tooling-and-ci.md)).

### Várias branches ao mesmo tempo

Cada branch pode ter a própria worktree, com uma stack própria, ou seja, containers e banco separados:

```bash
git fetch
git worktree add .claude/worktrees/<branch> -b <branch> origin/main
cd .claude/worktrees/<branch>
cp .env.example .env   # troque as portas, por exemplo 8001, 3001, 3307, 8026 e 1026
cp ../../../backend/.env backend/.env     # seus segredos e configurações locais
cp ../../../frontend/.env frontend/.env
docker compose up -d --build
```

- As URLs da tabela de [Como rodar](#como-rodar) passam a usar as portas do `.env` da worktree. Essas portas valem também para a API (CORS, sessão e links das notificações), sem editar o `backend/.env`.
- O cookie de sessão vale para `localhost` em qualquer porta. Para usar dois front-ends logados ao mesmo tempo, abra o segundo em outro perfil do navegador ou numa janela anônima.
- Os `.env` de `backend/` e `frontend/` vêm do checkout principal. Ao criar a worktree, confira se o seu `backend/.env` tem todas as variáveis do `backend/.env.example` (o mesmo vale para o front) e complete o que faltar. O `.env` da raiz não é copiado, porque as portas mudam em cada worktree.
- Para remover, rode `docker compose down -v` dentro da worktree e depois `git worktree remove .claude/worktrees/<branch>`.

## Uso de IA

O projeto foi desenvolvido com o Claude Code, num fluxo em que a IA executa e uma pessoa decide. As regras para os agentes estão no [AGENTS.md](AGENTS.md).

1. **Issue:** cada fluxo da PRD vira uma issue por aplicação, com critérios de aceite ligados à PRD (skill [`new-issue`](.claude/skills/new-issue/SKILL.md)).
2. **Plano:** a IA lê a issue, a PRD e o código, tira as dúvidas uma por vez e propõe um plano. O plano aprovado fica registrado como comentário na issue (skill [`plan-issue`](.claude/skills/plan-issue/SKILL.md)).
3. **Implementação:** a skill [`implement-issue`](.claude/skills/implement-issue/SKILL.md) coordena quatro [agentes](.claude/agents/) numa worktree própria:
   - o `implementer` escreve o código;
   - o `tester` escreve os testes a partir dos critérios de aceite, de forma independente da implementação;
   - o `reviewer` revisa contra a PRD, o plano e as convenções;
   - o `documenter` atualiza a documentação.
4. **PR:** o PR fecha uma issue só, passa pelo CI e é revisado e mergeado pela pessoa responsável.

Ficam com a pessoa: o escopo e a PRD, as decisões em aberto, a aprovação de cada plano, de cada commit e dos mockups de tela, e o merge. Quando algo dá errado ou é corrigido, a regra que faltou vai para o `AGENTS.md`, para o agente ou para a skill, e não para um arquivo de lições à parte.
