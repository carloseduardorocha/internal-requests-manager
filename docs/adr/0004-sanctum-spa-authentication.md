# 0004. Autenticação por sessão com Sanctum SPA

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

O front-end e a API são aplicações separadas, e o navegador chama a API direto. O fluxo de Acesso está na [PRD](../prd.md); aqui ficam os valores técnicos.

## Decisão

Laravel Sanctum em modo SPA: sessão em cookie httpOnly, com proteção CSRF. O navegador envia credenciais em toda chamada.

- **Ambientes:** local em `localhost:3000` (front) e `localhost:8000` (API), sem domínio de cookie. Produção em `app.<domínio>` e `api.<domínio>`, configurada só por variáveis de ambiente (`SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` e CORS com credenciais).
- **Sessão:** `SESSION_EXPIRE_ON_CLOSE=true` e 120 minutos sem uso. O cookie tem nome estável (`SESSION_COOKIE=irm_session`), usado pelo front para checar se há sessão.
- **Mantenha-me conectado:** usa o *remember me* nativo do Laravel; o limite de 30 dias é configurado na duração do *remember* do guard.
- **Logout:** invalida a sessão e o *remember token*.
- **Bloqueio:** 5 tentativas erradas seguidas, contadas por e-mail + IP, bloqueiam por 15 minutos. Credencial errada responde `422` com mensagem genérica; o bloqueio responde `429` com `Retry-After`.
- O contador de tentativas usa o RateLimiter no cache (store `database`, tabela `cache`) e é zerado no login correto.
- Todos os valores acima ficam em variáveis de ambiente.
- **Conta desativada:** `users.deactivated_at` preenchido. O login, o `reset-password` e o `forgot-password` tratam a conta como inexistente (condição `deactivated_at is null` no `attempt` e no broker). Desativar apaga as linhas de `sessions` da pessoa e troca o `remember_token`, só na primeira vez; o middleware `active`, nas rotas autenticadas, encerra e responde `401` à sessão que sobrar. Risco aceito: a transação trava só a conta alvo, não a de quem age. Se dois administradores se desativarem ao mesmo tempo, ou um desativar o outro enquanto o outro tira o perfil de administrador do primeiro, o sistema pode ficar sem administrador ativo.
- **Proteção de rotas no front:** o `src/proxy.ts` faz só uma checagem otimista do cookie (`irm_session` ou `remember_web_*`), sem chamar a API, e redireciona para `/login`. Só as rotas listadas em `PUBLIC_PATHS` passam sem cookie, com match exato: `/login`, `/forgot-password`, `/reset-password` e `/accept-invitation` (cadastro pelo convite). A identidade vem do `GET /api/me`, carregado pelo layout autenticado. A restrição por perfil (`RequireRole`, com o mapa único em `features/auth/routes.ts`) serve só à navegação; a autorização de verdade é da API. Em `401` ou `419`, o front leva a `/login?expired=1`.

Alternativa descartada: tokens (JWT ou Sanctum com token) guardados no navegador, expostos a roubo por script.

## Consequências

- Positivas: o token de sessão não é acessível por JavaScript; sem infraestrutura de autenticação extra.
- Custos: exige o passo do CSRF antes do login, CORS com credenciais e domínios de front e API compatíveis em produção; o logout troca o `remember_token` e desconecta o "Mantenha-me conectado" em todos os dispositivos da pessoa.
