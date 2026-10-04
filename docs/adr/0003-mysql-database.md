# 0003. MySQL como banco de dados

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

O produto precisa de um banco relacional para pedidos, usuários e histórico. O modelo está em [database.md](../database.md).

## Decisão

MySQL 8. Status, prioridade e perfil são gravados como `varchar` e convertidos para enums no Laravel.

Alternativa descartada: o tipo `ENUM` do MySQL, que exige alterar a coluna a cada novo valor e complica as migrations.

## Consequências

- Positivas: banco conhecido, com bom suporte no Laravel e no Docker; migrations simples.
- Custos: o banco não impede valores inválidos nessas colunas, então a validação fica por conta da aplicação (enums e Form Requests).
