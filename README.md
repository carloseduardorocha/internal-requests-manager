# Gestão de Solicitações Internas

Os pedidos internos costumam chegar por e-mail, mensagens e planilhas, sem dono nem histórico. Este produto reúne tudo num só lugar: quem pede registra e acompanha, quem analisa assume e decide com justificativa, e a gestão acompanha a operação por um painel. A equipe é avisada no Discord, e o solicitante, por e-mail.

- **[PRD](docs/prd.md):** escopo, fluxos, regras e fases.
- **[Board de Atividades](https://github.com/users/carloseduardorocha/projects/1):** issues por fase, cada uma com o plano aprovado e o PR que a fechou.

Para rodar, vá direto ao [Guia rápido](#guia-rápido).

## Organização do repositório

**Raiz do repositório**: as duas aplicações, a documentação e o ambiente.

```
.
├── backend/            API em Laravel
├── frontend/           Interface em Next.js com TypeScript
├── docs/               PRD, ADRs, diagramas, banco, API, design system e mockups
├── .claude/            Skills e agentes usados no desenvolvimento
├── .github/workflows/  CI separado para backend e frontend
├── docker-compose.yml  Front, API, worker, MySQL e Mailpit
└── AGENTS.md           Regras para os agentes de IA
```

**`backend/`**: cada requisição passa por Controller fino → Form Request → Action → Model ([ADR 0001](docs/adr/0001-layered-laravel-backend.md)).

```
app/
├── Actions/          Um caso de uso por classe (AssumeInternalRequest, DecideInternalRequest…)
├── Http/
│   ├── Controllers/  Recebem a requisição e delegam para a Action
│   ├── Requests/     Validação de entrada
│   ├── Resources/    Formato JSON das respostas
│   └── Middleware/   Conta ativa e request_id
├── Policies/         Quem pode fazer o quê, por perfil e dono
├── Enums/            Status (com as transições permitidas), prioridade, perfil
├── Notifications/    Discord e e-mail, enviados pela fila
├── Models/
└── Listeners/        Registro de cada tentativa de notificação
database/             Migrations, seeders e factories
tests/                Feature (endpoints) e Unit (regras)
```

**`frontend/`**: organizado por fluxo da PRD ([ADR 0002](docs/adr/0002-feature-based-nextjs-frontend.md)).

```
src/
├── app/              Só as rotas: (public) login, convite e senha; (app) pedidos, painel e usuários
├── features/         Um módulo por fluxo: auth, requests, dashboard e users,
│                     cada um com componentes, chamadas à API, hooks e tipos
├── components/       Componentes compartilhados; ui/ tem a base do shadcn/ui
├── hooks/            Hooks compartilhados (seleção, pesquisa com debounce)
└── lib/              Cliente HTTP único e tratamento de erros da API
```

**`docs/`**:

- [PRD](docs/prd.md)
- [ADRs](docs/adr/)
- [Diagramas](docs/architecture/)
- [Modelo de dados](docs/database.md)
- [Contrato da API](docs/api.md)
- [Design system](docs/design-system.md) e [mockups](docs/mockups/)
- [Desenvolvimento](docs/development.md)

## Como foi desenvolvido

O projeto foi feito com **desenvolvimento agêntico** (*agentic coding*), usando o Claude Code: agentes de IA planejam, implementam, testam, revisam e documentam, guiados por uma especificação (a PRD, os ADRs e os mockups), e uma pessoa decide em cada etapa. O objetivo é ganhar velocidade sem perder o controle: a especificação diz o que fazer, os agentes executam e nada entra sem aprovação. As regras para os agentes estão no [AGENTS.md](AGENTS.md).

| Etapa | Como |
|---|---|
| **Issue** | Cada fluxo da PRD vira uma issue por aplicação, com critérios de aceite ligados à PRD (skill [`new-issue`](.claude/skills/new-issue/SKILL.md)) |
| **Plano** | A IA lê a issue, a PRD e o código, tira as dúvidas uma por vez e propõe um plano. O plano aprovado fica como comentário na issue (skill [`plan-issue`](.claude/skills/plan-issue/SKILL.md)) |
| **Tela** | Antes do código, cada tela nova vira um mockup aprovado pela pessoa ([abaixo](#design-system-e-mockups)) |
| **Implementação** | A skill [`implement-issue`](.claude/skills/implement-issue/SKILL.md) coordena quatro [agentes](.claude/agents/) numa worktree própria: `implementer` escreve o código; `tester` escreve os testes a partir dos critérios de aceite, sem olhar a implementação; `reviewer` revisa contra a PRD, o plano e as convenções; `documenter` atualiza a documentação |
| **Commit e PR** | Conventional Commits (skill [`git-commit`](.claude/skills/git-commit/SKILL.md)). Cada PR fecha uma issue, passa pelo CI e é mergeado pela pessoa |

Ficam com a pessoa: o escopo e a PRD, as decisões em aberto, a aprovação de cada plano, mockup e commit, e o merge. Quando algo dá errado, a regra que faltou vai para o `AGENTS.md`, para o agente ou para a skill.

### Design system e mockups

A interface segue um design system próprio, com a identidade verde e o logo oficial da Sicredi, documentado em [`docs/design-system.md`](docs/design-system.md):

- tokens de cor para os temas claro e escuro, que alternam na interface;
- cores e ícones de cada status e prioridade (o status nunca é indicado só pela cor);
- tipografia (Exo 2, Nunito e JetBrains Mono para identificadores), arredondamento e densidade;
- regras de interface: foco visível, alvos de toque de pelo menos 44px, ações em massa, uso do logo.

A referência visual está em [`docs/mockups/design-system.html`](docs/mockups/design-system.html), e os valores no código, em `frontend/src/app/globals.css`.

A skill [`frontend-project-style`](.claude/skills/frontend-project-style/SKILL.md) faz o design system valer em toda tela:

1. Antes de qualquer código de front-end, a IA carrega o design system.
2. No plano de uma issue com tela nova, ela gera um mockup em HTML, com dados reais do domínio, num visualizador que alterna as versões (v1, v2… ou opções A, B e C) e as larguras de 375px, 768px e 100%.
3. A cada comentário da pessoa, sai uma nova versão, e as anteriores continuam lá para comparar.
4. A versão aprovada vai para [`docs/mockups/`](docs/mockups/) e entra no plano da issue.
5. Na implementação, a tela pronta é comparada com o mockup em 375px, 768px e 1280px.

Assim, a discussão de layout acontece antes do código, e nenhuma tela é refeita por mudança de visual.

## Perguntas técnicas do desafio

O que foi entregue e as respostas às perguntas da seção 8.2 do desafio.

### Entrega

Todo o obrigatório (cadastro, consulta com pesquisa, filtros e ordenação, análise e decisão, painel, API e migrations) e os seis diferenciais: Docker, testes automatizados, autenticação e autorização, logs estruturados, integração com serviços externos (Discord e SMTP) e uso de IA ([como foi desenvolvido](#como-foi-desenvolvido)).

| Fase da PRD | Entregue |
|---|---|
| [1: operação básica](https://github.com/carloseduardorocha/internal-requests-manager/milestone/1?closed=1) | Acesso, solicitações, análise e decisão, e painel |
| [2: comunicação](https://github.com/carloseduardorocha/internal-requests-manager/milestone/2?closed=1) | Discord para a equipe e e-mail para o solicitante |
| [3: extras](https://github.com/carloseduardorocha/internal-requests-manager/milestone/3?closed=1) | Convite, recuperação de senha, gestão de usuários, ações em massa e logs estruturados |

### Evolução da solução

#### Quais mudanças arquiteturais seriam necessárias para suportar o crescimento da solução?

Hoje, sessão, cache e fila ficam todos no MySQL, junto com os dados. Com muitos acessos, isso sobrecarrega o banco. Para crescer, eu:
- moveria sessão, cache e fila para o Redis, o que no Laravel é só configuração ([ADR 0005](docs/adr/0005-database-queue-and-retries.md));
- rodaria a API e o `worker` em várias instâncias atrás de um balanceador. A API já não guarda estado local, então isso não exige mudar o código.

#### Quais seriam os principais riscos técnicos identificados?

O principal é que o banco faz tudo: pela simplicidade do escopo atual, dados, fila, sessão e cache usam o mesmo MySQL. É o primeiro gargalo e um ponto único de falha.

#### Como garantir escalabilidade, disponibilidade e manutenibilidade da aplicação?

- **Escalabilidade:** mais de uma instância da API e do `worker` (escala horizontal), com o Redis no lugar do MySQL para fila, cache e sessão.
- **Disponibilidade:** monitoramento (Grafana ou Elastic APM, por exemplo) com alertas configurados para qualquer anomalia, sobre o health check `/up`, que já existe. As notificações já são assíncronas, então um serviço externo fora do ar não derruba o produto.
- **Manutenibilidade:** um padrão de código definido desde o início (uma Action por caso de uso, autorização nas Policies, [ADRs](docs/adr/) para cada decisão) e um fluxo de desenvolvimento estruturado: PRD → issue → plano → desenvolvimento → testes e CI → produção ([como foi desenvolvido](#como-foi-desenvolvido)).

#### Quais componentes ou camadas poderiam ser adicionados em uma evolução futura da arquitetura?

Eu focaria primeiro em observabilidade:
- **Laravel Horizon**, para acompanhar e gerir os jobs da fila.
- **Centralização dos logs** (Graylog, por exemplo). Os logs já saem em JSON com `request_id` ([ADR 0013](docs/adr/0013-structured-json-logs.md)), prontos para serem coletados.

Como funcionalidade, eu usaria **IA com uma base de conhecimento**: antes de criar o pedido, o sistema buscaria na base se a resposta já existe e a mostraria para a pessoa, que decide se ainda quer abrir o pedido. Isso evita pedidos repetidos e reduz a fila dos analistas.

### Integração com sistemas externos

O produto já tem duas integrações externas: o Discord, por webhook, e o e-mail, por SMTP. Para comunicar um sistema corporativo depois da aprovação, eu seguiria o mesmo caminho.

#### Como realizaria esta integração?

Começaria levantando o que o sistema de destino oferece: uma API, um webhook ou uma fila de mensagens. Se ele não oferecer nenhuma dessas, uma automação (com Python, por exemplo) pode fazer a ação no sistema.

Do nosso lado, a aprovação dispara um job na fila, como as notificações já fazem. O job chama o sistema por um cliente atrás de uma interface, então trocar um mock pelo cliente real, ou um sistema por outro, não mexe na regra de negócio.

#### Quais padrões ou tecnologias utilizaria?

Depende do que o sistema de destino oferece:
- **API REST ou webhook:** fila do Laravel e o HTTP client do Laravel, com timeout curto.
- **Mensageria** (RabbitMQ, Kafka ou SQS): o job publica o evento, e o sistema corporativo consome no ritmo dele.
- **Sem API:** uma automação em Python, rodando numa máquina virtual, por exemplo.

#### Como trataria falhas de comunicação?

Com novas tentativas e registro de cada erro, como as notificações já fazem: são 4 tentativas, com espera de 1, 5 e 15 minutos.
- **Erro temporário** (timeout, sistema fora do ar, limite de requisições): tenta de novo.
- **Erro permanente** (dados recusados pelo sistema): não insiste. Marca como falha e alerta.
- **Tentativas esgotadas:** o job vai para `failed_jobs` e pode ser reprocessado depois que o problema for resolvido.

#### Como garantiria rastreabilidade das operações realizadas?

Em duas camadas, que já existem para as notificações:
1. **No banco:** cada tentativa vira um registro, com pedido, canal, evento, número da tentativa, resultado, erro e data (hoje, a tabela `notification_logs`). A integração corporativa teria uma tabela igual.
2. **Nos logs:** cada requisição recebe um `request_id`, que acompanha a ação de quem aprovou e o job que ela disparou ([ADR 0013](docs/adr/0013-structured-json-logs.md)). Com os logs centralizados, uma busca por esse id mostra a história toda.

Além disso, o histórico do pedido já registra quem aprovou e quando. Com a integração, ele passaria a mostrar também a situação do envio (pendente, enviado ou com falha).

#### Como evitaria impacto na experiência do usuário caso o sistema externo estivesse indisponível?

- **Envio assíncrono:** a aprovação grava no banco e responde na hora. O envio acontece depois, no `worker`, então a pessoa não espera nenhum sistema externo.
- **A decisão não depende do envio:** se o sistema estiver fora do ar, o pedido continua aprovado e o envio fica na fila, sendo tentado de novo até o sistema voltar.
- **O erro técnico não chega a quem usa:** quem é avisado é a equipe que opera o sistema, por alerta, e não o analista que aprovou.
- **O sistema lento não trava a fila:** com timeout curto, uma chamada presa não segura o `worker`. Com muitas falhas seguidas, um circuit breaker pausa os envios até o sistema voltar, sem acumular erros.

## Guia rápido

**Pré-requisito:** Docker com Compose. No Windows, use o Docker Desktop com a integração WSL ligada.

```bash
git clone https://github.com/carloseduardorocha/internal-requests-manager.git
cd internal-requests-manager
cp backend/.env.example backend/.env
```

Antes de subir, ajuste o `backend/.env` se tiver as credenciais abaixo. Sem elas, tudo funciona igual: o Discord fica desligado, e os e-mails caem no Mailpit.

**Se tiver o webhook do Discord**, preencha:

```dotenv
DISCORD_WEBHOOK_URL=<URL do webhook>
```

**Se tiver a configuração do e-mail**, troque estas variáveis (o arquivo traz um bloco comentado com as do Gmail):

```dotenv
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<conta>@gmail.com
MAIL_PASSWORD=<senha de app>
MAIL_FROM_ADDRESS=<conta>@gmail.com
```

Depois, suba tudo:

```bash
docker compose up -d --build
```

A primeira subida demora alguns minutos, por causa do `composer install` e do `npm ci`. As migrations e o seed rodam sozinhos. Para acompanhar, use `docker compose logs -f api`.

| Serviço | URL |
|---|---|
| Front-end | http://localhost:3000 |
| API | http://localhost:8000 (health check em `/up`) |
| Mailpit (e-mails, quando o Gmail não está configurado) | http://localhost:8025 |

Se mudar o `backend/.env` depois da subida, rode `docker compose restart api worker`. Portas em uso e outros detalhes: [desenvolvimento](docs/development.md).

### Usuários de demonstração

Todos usam a senha `password`. Os e-mails caem numa caixa controlada pelo projeto.

| E-mail | Perfil |
|---|---|
| `carlos.dev.rocha+solicitante@gmail.com` | Carlos Solicitante (Financeiro) |
| `carlos.dev.rocha+analista@gmail.com` | Carlos Analista (Operações) |
| `carlos.dev.rocha+admin@gmail.com` | Carlos Administrador (Tecnologia) |

O seed cria 10 pedidos do Carlos Solicitante: 6 abertos, 2 em análise com o Carlos Analista, 1 aprovado e 1 rejeitado.

### Roteiro

Para receber os e-mails na sua caixa, comece convidando a si mesmo:

1. Entre como **administrador**, abra **Usuários**, clique em **Convidar usuário** e convide o seu e-mail com o perfil **Solicitante**.
2. Abra o e-mail do convite, clique em **Criar conta**, defina a senha e entre.
3. Crie um pedido. Se o Discord estiver configurado, a mensagem chega no canal.
4. Em outra janela anônima, entre como **analista**, abra o seu pedido e clique em **Assumir análise**. Você recebe o e-mail "em análise".
5. Escreva uma justificativa e clique em **Aprovar** ou **Rejeitar**. Você recebe o e-mail da decisão, e o Discord recebe a decisão.
6. Ainda como analista, abra o **Painel**.
7. Volte à sua conta: o pedido aparece decidido, com a justificativa e o histórico, e não pode mais ser editado.
