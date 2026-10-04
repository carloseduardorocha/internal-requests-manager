# 0005. Fila no banco, tentativas e registro de envios

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

A [PRD](../prd.md) exige que uma notificação nunca atrase nem impeça o uso do sistema e que cada tentativa de envio seja registrada. O fluxo está em [notifications.md](../architecture/notifications.md).

## Decisão

- Driver de fila `database`, sem serviço extra. Um container `worker` roda `queue:work`.
- Os jobs são despachados depois do commit da transação (`afterCommit`), para nunca atrasar nem desfazer a ação de quem usa.
- Cada notificação é enviada uma vez e, se falhar, tem 3 novas tentativas, com espera de 1, 5 e 15 minutos: 4 tentativas no total (`tries=4`, `backoff` de 60, 300 e 900 segundos).
- Cada tentativa, com sucesso ou falha, é gravada em `notification_logs` (`attempt` de 1 a 4).
- Esgotadas as tentativas, o job vai para `failed_jobs`.

Alternativa descartada: Redis ou um broker dedicado, serviço a mais sem necessidade para o volume de um produto interno.

## Consequências

- Positivas: nenhuma peça nova de infraestrutura; a fila usa o MySQL que já existe; trocar de driver depois exige só configuração.
- Custos: o banco passa a servir também de fila; é preciso manter o `worker` rodando; o desempenho é limitado frente a um broker dedicado.
