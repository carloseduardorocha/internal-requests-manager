# Notificações

A API grava a ação e, só depois do commit, despacha o job e responde ao usuário na hora. O `worker` envia pelo canal e registra cada tentativa em `notification_logs`; se falhar, tenta de novo com espera crescente; esgotadas as tentativas, o job vai para `failed_jobs`. Número de tentativas e esperas: ADR.

Eventos e canais: fluxo 5 da [PRD](../prd.md). Decisão: [0005](../adr/0005-database-queue-and-retries.md).

```mermaid
sequenceDiagram
    actor U as Usuário
    participant A as api
    participant D as mysql (dados e fila)
    participant W as worker
    participant C as Canal (Discord ou SMTP)

    U->>A: cria, assume ou decide um pedido
    A->>D: transação grava a mudança
    D-->>A: commit
    A->>D: despacha o job (afterCommit)
    A-->>U: resposta imediata
    W->>D: busca o job
    loop até enviar ou esgotar as tentativas
        W->>C: envia a notificação
        alt envio ok
            C-->>W: sucesso
            W->>D: notification_logs (sent)
        else envio falhou
            C-->>W: erro
            W->>D: notification_logs (failed)
            Note over W: espera antes da nova tentativa
        end
    end
    opt todas as tentativas falharam
        W->>D: job vai para failed_jobs
    end
```
