# 0008. Ferramentas de qualidade e CI

**Status:** Aceito
**Data:** 04/10/2026

## Contexto

O projeto é tratado como produto real: estilo, tipos e testes precisam ser verificados igual para todo mundo, e não só na máquina de quem escreveu o código.

## Decisão

- Back-end: Pint (estilo), Larastan no nível 6 (análise estática) e PHPUnit.
- Os testes do back-end rodam no MySQL, no banco `testing`, e não em SQLite. O motivo é que a collation do `LIKE` (busca) e o travamento de linha (concorrência na análise) se comportam diferente entre bancos.
- Front-end: ESLint, Prettier, `typecheck` (TypeScript) e Vitest com Testing Library.
- CI no GitHub Actions: um workflow por aplicação (`backend.yml` e `frontend.yml`), filtrado por caminho, em pull request e em push na `main`.
- Os comandos estão no [README](../../README.md#comandos).

Alternativa descartada: um único workflow para o repositório, que rodaria o back-end e o front-end mesmo quando só um deles mudou.

## Consequências

- Positivas: o mesmo critério vale local e no CI; cada aplicação é verificada só quando muda.
- Custos: os testes dependem de um MySQL no CI. Se os checks virarem obrigatórios na `main`, um PR que não toca o caminho de um workflow não gera o check e fica pendente; seria preciso remover o filtro de caminho ou ter um job final que sempre roda.
