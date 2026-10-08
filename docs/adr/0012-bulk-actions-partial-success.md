# 0012. Ações em massa com sucesso parcial

**Status:** Aceito
**Data:** 08/10/2026

## Contexto

A [PRD](../prd.md) pede ações em massa na lista de solicitações (fluxo 2, Ações na lista) e na gestão de usuários (fluxo 7), com sucesso parcial: o que pode ser feito é feito, e o resto é informado. Os endpoints estão em [api.md](../api.md).

## Decisão

- **`POST` com `{ids}`:** `bulk/delete` e `bulk/assign`, em vez de `DELETE` com corpo, que clientes e proxies podem descartar. O limite é de 100 IDs por requisição, o mesmo teto da paginação.
- **Uma transação por item:** o lote chama a Action individual de cada pedido, que já tem a própria transação e o lock. As regras ficam num lugar só e uma falha não desfaz as outras.
- **Perfil no lote inteiro:** quem não pode usar o endpoint recebe `403` sem processar nada (`bulkDelete` e `bulkAssign` na Policy).
- **Permissão por item:** checada com `Gate::forUser($user)->inspect`. Recusa vira `not_found`, igual ao pedido inexistente, para não revelar que o pedido existe.
- **Resposta:** `BulkResultResource`, no padrão do [ADR 0001](0001-layered-laravel-backend.md), com `done` (IDs) e `skipped` (`id`, `reason`, `message`). O `reason` é estável e em inglês; a `message`, em português. ID repetido é `422` (`distinct`), sem deduplicar.
- **Motivo no momento do lock:** reflete o estado do pedido quando ele é processado. Um pedido excluído durante o lote aparece como `not_open`.
- O padrão vale também para a gestão de usuários (#48).

Alternativas descartadas:
- **Tudo ou nada:** um pedido já assumido por outra pessoa derrubaria o lote todo, contra a PRD.
- **`422` por `exists`:** um ID inexistente barraria o lote e a validação revelaria quais existem.
- **`DELETE` com corpo:** suporte irregular em clientes e proxies.

## Consequências

- Positivas: reaproveita as Actions e a concorrência já tratadas; o front mostra o resultado de cada item; nada vaza sobre pedidos alheios.
- Custos: até 100 transações por requisição; o front precisa tratar `skipped` mesmo com `200`.
