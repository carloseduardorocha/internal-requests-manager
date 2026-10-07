# Contrato da API

Fluxos e regras: [PRD](prd.md). Autenticação e valores de sessão: [ADR 0004](adr/0004-sanctum-spa-authentication.md).

## Convenções

- Base `/api`, JSON, sem versão.
- Autenticação por sessão (Sanctum SPA). Antes do login, o cliente chama `GET /sanctum/csrf-cookie`; em todas as chamadas envia credenciais (`credentials: include`) e o token CSRF.
- Todos os endpoints exigem sessão, exceto o CSRF, o login, a recuperação de senha (`forgot-password` e `reset-password`) e as duas rotas públicas do convite (`GET` e `accept`, seção 6); por isso qualquer um pode responder `401` (e `419` nas escritas).
- Respostas de recurso vêm dentro de `data`; a paginação padrão do Laravel acrescenta `links` e `meta`, com os limites na query da listagem.
- Ordem das checagens: visibilidade (`404`: pedido inexistente, excluído ou de outra pessoa, para o solicitante) → perfil ou dono (`403`) → validação (`422`) → status (`409`).
- Mensagens em português (`APP_LOCALE=pt_BR`, [ADR 0001](adr/0001-layered-laravel-backend.md)).
- Status: `open`, `in_review`, `approved`, `rejected`. Prioridade: `low`, `medium`, `high`. Perfil: `requester`, `analyst`, `admin`.

## Erros

Formato `{ "message": "..." }`. Erros de validação (`422`) trazem também `errors` por campo:

```json
{ "message": "É obrigatória a indicação de um valor para o campo título.", "errors": { "title": ["É obrigatória a indicação de um valor para o campo título."] } }
```

| Código | Quando |
|---|---|
| 200 | Sucesso com corpo |
| 201 | Recurso criado |
| 204 | Sucesso sem corpo |
| 401 | Sem sessão |
| 419 | Token CSRF inválido ou sessão expirada (inclui o login por cliente fora do SPA, que não tem sessão); o cliente renova o CSRF e volta ao login |
| 403 | Perfil ou dono sem permissão |
| 404 | Pedido inexistente, excluído ou de outra pessoa (para o solicitante); convite inválido, expirado ou usado |
| 409 | Status fora da ordem, ou pedido que mudou de status no meio da ação |
| 422 | Validação falhou, e-mail que já tem conta no convite, filtro inválido na listagem ou credencial inválida no login |
| 429 | Login bloqueado por tentativas, ou mais de 6 pedidos por minuto por IP em `forgot-password` (sem revelar a conta); traz `Retry-After`, exposto no CORS para o front conseguir lê-lo |

## 1. Acesso

| Endpoint | Quem | Payload | Sucesso | Erros |
|---|---|---|---|---|
| `GET /sanctum/csrf-cookie` | Público | n/d | `204` | n/d |
| `POST /api/login` | Público | `{email, password, remember}` | `200` usuário | `419`, `422` (mensagem genérica), `429` |
| `POST /api/logout` | Autenticado | n/d | `204` | n/d |
| `GET /api/me` | Autenticado | n/d | `200` usuário | n/d |
| `POST /api/forgot-password` | Público | `{email}` | `204` | `419`, `422` (formato do e-mail), `429` |
| `POST /api/reset-password` | Público | `{token, email, password, password_confirmation, logout_other_devices?}` | `204` | `419`, `422` |

`forgot-password` responde `204` exista ou não a conta, com o mesmo corpo e o mesmo tempo, porque o envio vai para a fila ([ADR 0011](adr/0011-password-reset-native-broker.md)). O link do e-mail abre no front em `/reset-password?token&email`.

`reset-password` não inicia sessão: a pessoa volta ao login. Token inválido, expirado ou já usado e e-mail sem conta respondem igual, `422` em `errors.token`. A senha tem no mínimo 8 caracteres e confirmação. Com `logout_other_devices = true` (padrão `false`), as outras sessões da pessoa são encerradas.

```json
{ "data": { "id": 1, "name": "Ana Souza", "email": "ana@empresa.com", "role": "requester", "area": { "id": 2, "name": "Financeiro" } } }
```

## 2. Solicitações

| Endpoint | Quem | Payload | Sucesso | Erros |
|---|---|---|---|---|
| `GET /api/internal-requests` | Autenticado (solicitante vê só os seus) | query abaixo | `200` paginado | `422` (filtro inválido) |
| `POST /api/internal-requests` | Solicitante e administrador | `{title, description, priority}` | `201` pedido | `403`, `422` |
| `GET /api/internal-requests/{id}` | Dono, analista e administrador | n/d | `200` com responsável, decisão e histórico | `404` |
| `PATCH /api/internal-requests/{id}` | Dono e administrador | `{title, description, priority}` | `200` pedido | `403`, `404`, `409`, `422` |
| `DELETE /api/internal-requests/{id}` | Dono e administrador | n/d | `204` | `403`, `404`, `409` |

Editar e excluir só valem com o pedido `open` (`409` caso contrário, inclusive se ele for assumido ou excluído durante a requisição, com a mesma mensagem: "Este pedido não está mais Aberto e não pode ser alterado.").

**Query da listagem**

| Parâmetro | Descrição |
|---|---|
| `search` | Texto no título e na descrição (máximo 255 caracteres; acima disso responde `422`) |
| `status` | Filtra por status |
| `priority` | Filtra por prioridade |
| `sort` | `created_at` ou `-created_at` (padrão `-created_at`) |
| `page` | Página (padrão 1) |
| `per_page` | Itens por página (padrão 15, máximo 100; acima disso responde `422`) |

Parâmetros vazios (`search=`, `status=`, etc.) são ignorados e valem o padrão; valores inválidos respondem `422`. A listagem não traz `history`.

Exemplo de detalhe (`200`):

```json
{
  "data": {
    "id": 10,
    "title": "Notebook novo",
    "description": "Substituir o equipamento atual",
    "priority": "medium",
    "status": "approved",
    "requester": { "id": 1, "name": "Ana Souza" },
    "area": { "id": 2, "name": "Financeiro" },
    "assigned_to": { "id": 5, "name": "Bruno Lima" },
    "assigned_at": "2026-10-03T14:00:00Z",
    "decision": { "decided_by": { "id": 5, "name": "Bruno Lima" }, "decided_at": "2026-10-03T15:00:00Z", "justification": "Dentro do orçamento" },
    "history": [
      { "from_status": null, "to_status": "open", "changed_by": { "id": 1, "name": "Ana Souza" }, "created_at": "2026-10-03T13:00:00Z" },
      { "from_status": "open", "to_status": "in_review", "changed_by": { "id": 5, "name": "Bruno Lima" }, "created_at": "2026-10-03T14:00:00Z" },
      { "from_status": "in_review", "to_status": "approved", "changed_by": { "id": 5, "name": "Bruno Lima" }, "created_at": "2026-10-03T15:00:00Z" }
    ],
    "created_at": "2026-10-03T13:00:00Z",
    "can": { "update": false, "delete": false, "assign": false, "approve": false, "reject": false }
  }
}
```

`can` vem da Policy (e exige o pedido `open`) e vale na listagem e no detalhe, para o front mostrar ou esconder as ações.

## 3. Análise e decisão

| Endpoint | Quem | Payload | Sucesso | Erros |
|---|---|---|---|---|
| `POST /api/internal-requests/{id}/assign` | Analista e administrador | n/d | `200` pedido `in_review` | `403`, `404`, `409` |
| `POST /api/internal-requests/{id}/approve` | Quem assumiu e administrador | `{justification}` | `200` pedido `approved` | `403`, `404`, `409`, `422` |
| `POST /api/internal-requests/{id}/reject` | Quem assumiu e administrador | `{justification}` | `200` pedido `rejected` | `403`, `404`, `409`, `422` |

`assign` exige o pedido `open`; `approve` e `reject` exigem `in_review`. A resposta tem o mesmo formato do detalhe, e o pedido traz `can.assign`, `can.approve` e `can.reject`, calculados como `can.update` e `can.delete` (seção 2).

## 4. Painel

| Endpoint | Quem | Sucesso | Erros |
|---|---|---|---|
| `GET /api/dashboard` | Analista e administrador | `200` | `403` |

```json
{
  "total": 12,
  "by_status": { "open": 4, "in_review": 3, "approved": 3, "rejected": 2 },
  "by_priority": { "low": 3, "medium": 6, "high": 3 }
}
```

A resposta não vem dentro de `data`. Todas as chaves de status e prioridade aparecem sempre, com `0` quando não há pedidos, e `total` é a soma de `by_status`. Pedidos excluídos ficam fora da contagem.

## 5. Notificações

Sem endpoint: são disparadas pelas ações dos fluxos 2 e 3. Veja o [diagrama](architecture/notifications.md).

## 6. Convite

| Endpoint | Quem | Payload | Sucesso | Erros |
|---|---|---|---|---|
| `GET /api/areas` | Administrador | n/d | `200` lista de áreas, por nome | `403` |
| `POST /api/invitations` | Administrador | `{name, email, role, area_id}` | `201` convite | `403`, `422` |
| `GET /api/invitations/{token}` | Público | n/d | `200` convite | `404` |
| `POST /api/invitations/{token}/accept` | Público | `{password, password_confirmation}` | `201` usuário, já com sessão aberta | `404`, `419`, `422` |

`POST /api/invitations` envia o e-mail pela fila. Convidar de novo o mesmo e-mail substitui o convite anterior, e o link antigo deixa de valer. O e-mail que já tem conta responde `422`. O `id` só aparece nessa resposta; o token nunca é devolvido.

```json
{ "data": { "id": 3, "name": "Carla Dias", "email": "carla@empresa.com", "role": "analyst", "area": { "id": 2, "name": "Financeiro" }, "expires_at": "2026-10-13T12:00:00Z" } }
```

`GET` devolve o mesmo formato, sem `id`, para a tela de cadastro preencher os dados. `accept` cria a conta com os dados do convite, grava a senha e abre a sessão; a resposta é o usuário, no formato de `GET /api/me` (seção 1). Como o login, exige a sessão do SPA (`419` sem ela).

Convite inexistente, expirado ou já usado responde `404` com a mesma mensagem nos dois endpoints, sem distinguir o motivo: "Este convite expirou ou já foi usado. Peça um novo convite ao administrador." Regras e prazo: [PRD](prd.md), fluxo 6. Token: [ADR 0010](adr/0010-invitation-token.md).
