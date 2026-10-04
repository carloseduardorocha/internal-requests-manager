# 0001. Back-end Laravel em camadas

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

Cada fluxo da [PRD](../prd.md) tem regras próprias (quem pode, em que status, o que registrar). Colocá-las nos controllers espalha a autorização e dificulta testar cada fluxo isoladamente.

## Decisão

Cada requisição passa por: Controller fino → Form Request (validação) → Action → Model.

- Uma Action por caso de uso, por exemplo `AssumeInternalRequest`.
- Policies para a autorização por perfil e dono.
- API Resources para o formato das respostas.
- Enums PHP para status, prioridade e perfil.
- Mensagens da API em português: `APP_LOCALE=pt_BR`.

Alternativa descartada: regras nos controllers ou em Services genéricos, que crescem sem fronteira clara.

## Consequências

- Positivas: cada fluxo vira uma classe testável sozinha; a autorização fica num lugar só.
- Custos: mais arquivos por funcionalidade e uma convenção a respeitar.
