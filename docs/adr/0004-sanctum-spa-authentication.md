# 0004. Autenticação por sessão com Sanctum SPA

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

O front-end e a API são aplicações separadas, e o navegador chama a API direto. O fluxo de Acesso está na [PRD](../prd.md); aqui ficam os valores técnicos.

## Decisão

Laravel Sanctum em modo SPA: sessão em cookie httpOnly, com proteção CSRF. O navegador envia credenciais em toda chamada.

- **Ambientes:** local em `localhost:3000` (front) e `localhost:8000` (API), sem domínio de cookie. Produção em `app.<domínio>` e `api.<domínio>`, configurada só por variáveis de ambiente (`SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` e CORS com credenciais).
- **Sessão:** `SESSION_EXPIRE_ON_CLOSE=true` e 120 minutos sem uso.
- **Mantenha-me conectado:** usa o *remember me* nativo do Laravel; o limite de 30 dias é configurado na duração do *remember* do guard.
- **Logout:** invalida a sessão e o *remember token*.
- **Bloqueio:** 5 tentativas erradas seguidas, contadas por e-mail + IP, bloqueiam por 15 minutos. Credencial errada responde `422` com mensagem genérica; o bloqueio responde `429` com `Retry-After`.
- O contador de tentativas usa o RateLimiter no cache (store `database`, tabela `cache`) e é zerado no login correto.
- Todos os valores acima ficam em variáveis de ambiente.

Alternativa descartada: tokens (JWT ou Sanctum com token) guardados no navegador, expostos a roubo por script.

## Consequências

- Positivas: o token de sessão não é acessível por JavaScript; sem infraestrutura de autenticação extra.
- Custos: exige o passo do CSRF antes do login, CORS com credenciais e domínios de front e API compatíveis em produção; o logout troca o `remember_token` e desconecta o "Mantenha-me conectado" em todos os dispositivos da pessoa.
