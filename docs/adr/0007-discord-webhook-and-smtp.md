# 0007. Discord por webhook e e-mail por SMTP

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

A [PRD](../prd.md) define dois canais: Discord para a equipe e e-mail para o solicitante.

## Decisão

- **Discord:** *webhook* do canal da equipe, configurado por variável de ambiente (`DISCORD_WEBHOOK_URL`, ver [README](../../README.md#discord)). Sem ela, nada é enviado: nenhum job é criado e nenhum log é gravado.
- **E-mail:** SMTP padrão do Laravel. No desenvolvimento, o Mailpit do Docker recebe as mensagens.

Alternativa descartada: um bot do Discord, que exige hospedagem e autenticação próprias para uma necessidade que o *webhook* resolve.

## Consequências

- Positivas: integrações simples, sem dependência de SDK; trocar o servidor SMTP é só configuração.
- Custos: o *webhook* só envia (não lê nem responde) e quem tem a URL pode postar no canal, então ela é tratada como segredo: não é gravada em jobs nem em logs. O job leva só um marcador de rota e o canal lê a URL da configuração.
