# 0013. Logs estruturados em JSON com identificador da requisição

**Status:** Aceito
**Data:** 11/10/2026

## Contexto

Para investigar um problema, é preciso ligar o que a API registrou ao que o `worker` fez depois, sem expor dados de quem usa o produto. A [PRD](../prd.md) deixa a disponibilização online, e com ela a coleta e a visualização de logs, para a Fase 4.

## Decisão

- **Formato e destino:** JSON no `stderr`, uma linha por registro (`LOG_CHANNEL=stderr` e `LOG_STDERR_FORMATTER=Monolog\Formatter\JsonFormatter`, no `backend/.env.example`). O stack trace de um erro vai na mesma linha. Cada linha traz `message`, `context`, `level`, `level_name`, `channel`, `datetime` e `extra`. Ver os logs: [README](../../README.md#logs).
- **`request_id`:** o middleware global `AssignRequestId` grava o id no `Context` do Laravel, que o acrescenta ao `extra` de cada log e o leva no payload dos jobs. Assim, o `worker` loga o mesmo `request_id` da requisição que disparou o job. Jobs que não vêm de uma requisição ficam sem ele. O header `X-Request-Id` da resposta e a regra do header recebido estão em [api.md](../api.md#convenções).
- **Eventos de negócio:** a mensagem é o nome estável do evento e o contexto leva só ids. Os eventos de pedido são logados depois do commit da transação, para não registrar o que um rollback desfez. As ações em massa logam um evento por pedido processado e nenhum para os pulados.

  | Evento | Nível | Contexto |
  |---|---|---|
  | `internal_request.created`, `.assumed`, `.approved`, `.rejected`, `.deleted` | info | `internal_request_id`, `user_id` (quem agiu) |
  | `auth.login_failed` | info | `ip`, `email_hash` |
  | `auth.login_throttled` | warning | `ip`, `email_hash` |
  | `notification.failed` | warning | `notification`, `channel`, `internal_request_id` (só nas notificações de pedido), `exception` |

  `email_hash` é o SHA-256 do e-mail em minúsculas: liga tentativas à mesma conta sem expô-la. `exception` é só a classe; a mensagem já sai no log de erro do `worker` quando o job falha.
- **O que nunca entra no log:** senha, token, URL do webhook, e-mail, título, descrição e justificativa.
- **Só JSON depois do boot:** o `worker` roda `queue:work --quiet`. A `api` roda `php -q -S 0.0.0.0:8000 -t public docker/server.php`, com um router próprio (`backend/docker/server.php`), e não mais `artisan serve`. O `artisan serve` reimprime as linhas do app e acrescenta linhas de acesso. O `server.php` do framework imprime uma linha de texto por requisição e não acha o `public/` sob `php -S` direto. O `-q` desliga as linhas de acesso do servidor do PHP.

Alternativas descartadas:
- Arquivo em disco: exigiria acessar o container para ler, e os logs do Docker já cobrem o desenvolvimento.
- Manter o `artisan serve`: a saída fica misturando texto e JSON, e o `jq` deixa de servir.

## Consequências

- Positivas: cada linha é lida por ferramentas (`jq`); uma ação se liga ao job que ela disparou pelo mesmo `request_id`; sem serviço novo.
- Custos: a API não usa mais o `artisan serve`.
- Limitações: o router é só para desenvolvimento e, como o do framework, serve qualquer arquivo de `public/`, inclusive ocultos como `.htaccess`; a disponibilização online (Fase 4) usa outro servidor. Uma exceção inesperada de banco (`QueryException`) pode trazer valores do SQL na mensagem. A preparação do entrypoint (composer, migrate, seed) e a linha "Development Server started" saem em texto.
