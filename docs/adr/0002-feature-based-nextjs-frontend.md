# 0002. Front-end Next.js organizado por feature

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

O front-end acompanha os fluxos da [PRD](../prd.md). Agrupar por tipo de arquivo (todos os componentes juntos, todos os hooks juntos) espalha cada fluxo por várias pastas.

## Decisão

Next.js com App Router e TypeScript.

- `src/app/` contém só as rotas.
- `src/features/<fluxo>/` reúne componentes, chamadas à API, hooks e tipos de cada fluxo: `auth`, `requests`, `review`, `dashboard` e `users`.
- Biblioteca de componentes: [ADR 0009](0009-shadcn-ui-component-library.md). Visual: [design-system.md](../design-system.md).

Alternativa descartada: organização por tipo de arquivo.

## Consequências

- Positivas: mexer num fluxo toca uma pasta; o escopo de cada issue fica claro.
- Custos: é preciso decidir o que é compartilhado entre features e o que pertence a uma só.
