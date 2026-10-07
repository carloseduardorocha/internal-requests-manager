# 0011. Recuperação de senha com o broker nativo

**Status:** Aceito
**Data:** 06/10/2026

## Contexto

O fluxo 6 da [PRD](../prd.md) pede um link que vale 60 minutos e só uma vez, resposta igual exista ou não a conta, e a escolha de desconectar dos outros dispositivos. Os endpoints estão em [api.md](../api.md).

## Decisão

- **Broker nativo do Laravel** (`Password::sendResetLink` e `Password::reset`) com a tabela `password_reset_tokens`. O token é guardado com hash, e o broker o apaga no uso e quando um novo é gerado, sem código próprio de validade ou uso único.
- **Resposta igual:** `forgot-password` responde sempre `204`, com o mesmo corpo, e ignora o status do broker. O broker roda num job na fila (`SendPasswordResetLink`), fora da requisição, porque o hash do token deixaria as contas existentes mais lentas e o tempo revelaria a conta. A rota tem `throttle:6,1` por IP.
- **Fila criptografada:** o e-mail sai em dois saltos, o job e depois a notificação `ResetPasswordNotification`, ambos com as tentativas do [ADR 0005](0005-database-queue-and-retries.md). A notificação é `ShouldBeEncrypted`, porque o token em texto puro fica no payload. Nenhum dos dois grava em `notification_logs`, que é por pedido.
- **Desconexão opcional:** com `logout_other_devices`, a redefinição apaga as linhas da pessoa em `sessions` e troca o `remember_token`. O reset não inicia sessão.
- **Segredos fora dos rastros de erro:** o token e a senha são `#[\SensitiveParameter]`, para não aparecerem em stack traces.

## Consequências

- Positivas: validade e uso único vêm do framework; a resposta não revela contas, nem pelo tempo.
- Custos: o link depende do `worker` rodando.
- Riscos aceitos:
  - Dois resets simultâneos com o mesmo token podem passar, porque o broker apaga o token só depois do callback. Só quem tem o link consegue, e um lock exigiria código próprio, desproporcional.
  - No `reset-password`, um token errado para uma conta com pedido pendente faz `Hash::check` e demora mais que um e-mail sem conta. Explorar isso exige disparar o `forgot-password` antes, e o throttle limita.
