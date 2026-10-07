# 0010. Token do convite

**Status:** Aceito
**Data:** 06/10/2026

## Contexto

O convite (fluxo 6 da [PRD](../prd.md)) leva a pessoa a criar a conta por um link público, sem sessão. Quem tiver o link cria a conta com o perfil e a área do convite, então o token precisa resistir a vazamento do banco e a adivinhação.

## Decisão

- Token aleatório de 64 caracteres, guardado em `invitations.token` como SHA-256. O valor em claro só existe no e-mail.
- Uso único: aceitar trava a linha do convite (`SELECT ... FOR UPDATE`) numa transação, confere `accepted_at`, `expires_at` e que o e-mail ainda não tem conta, e só então cria o usuário. Dois cliques simultâneos criam uma conta só. Convidar de novo trava a mesma linha e confere a conta outra vez, para um reconvite simultâneo não reabrir um convite já usado. A consulta e o aceite usam a mesma regra de convite válido.
- Validade configurável em `INVITATION_EXPIRE_DAYS` (padrão 7, como na PRD).
- A notificação `InvitationSent` vai pela fila com `ShouldBeEncrypted`, porque o job carrega o token em claro, e fica fora de `notification_logs`, que não pode guardar o link. O job leva só os valores do e-mail, e não o convite: um reconvite feito antes do envio não troca os dados do e-mail anterior.
- Sem throttle nas rotas públicas do convite: com 64 caracteres aleatórios, adivinhar um token é inviável.

Alternativas descartadas:

- bcrypt no token: o hash é salgado, então não dá para buscar o convite pelo token; teríamos de percorrer e comparar todas as linhas. SHA-256 basta para um valor com essa entropia.
- Token em claro no banco: um vazamento do banco daria links válidos para criar contas.
- Throttle nas rotas públicas: custo e complexidade sem ganho, dada a entropia.

## Consequências

- Positivas: banco vazado não revela links; convite só se usa uma vez, mesmo com concorrência.
- Custos: o token não pode ser reexibido, então reenviar é gerar um novo convite; o job na fila guarda o token (criptografado) até ser processado.
