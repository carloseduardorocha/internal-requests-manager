# AGENTS.md

Regras para agentes de IA neste repositório.

## Projeto

Produto de gestão de solicitações internas: API em Laravel (`backend/`), front-end em Next.js com TypeScript (`frontend/`) e MySQL, tudo rodando via Docker Compose.

## Fontes de verdade

| Assunto | Onde |
|---|---|
| Escopo, fluxos, regras e fases | `docs/prd.md` |
| Decisões técnicas e motivos | `docs/adr/` |
| Diagramas | `docs/architecture/` |
| Modelo de dados | `docs/database.md` |
| Contrato da API | `docs/api.md` |
| Design system e mockups aprovados | `docs/design-system.md` e `docs/mockups/` |
| Backlog | GitHub Issues, milestones por fase e o project "Board de Atividades" |

Antes de propor escopo, leia a PRD. Não duplique informação entre documentos: cada assunto tem um lugar só, e os outros documentos apontam para ele.

## Git

- Conventional Commits em inglês, sempre pela skill `/git-commit`.
- Raiz do repositório e `docs/`: commit e merge direto na `main`.
- `backend/` e `frontend/`: sempre em branch própria e PR, fechando exatamente uma issue.
- Planejar, implementar e testar sempre numa worktree própria em `.claude/worktrees/<branch>` (a da `main` para raiz e `docs/`), nunca no checkout principal. Como criar e subir a stack está no README.
- Push junto com o commit aprovado: autorizar o commit autoriza o push.
- Sem atribuição de IA em commits, PRs, issues e comentários: nada de `Co-Authored-By`, "Generated with Claude Code" ou equivalentes.

## Issues

Use a skill `/new-issue`: uma issue por fluxo da PRD em cada aplicação, com título `[área] Fluxo: resumo`, uma label de área e uma de tipo, o milestone da fase e o corpo ligado à PRD. Mostre o rascunho antes de criar.

## Documentação

- Curta, com visão de produto, organizada por fluxo e cada regra dita uma vez só.
- A PRD não leva detalhe técnico, que vai para os ADRs, a API ou o README.
- O projeto é tratado como produto real.
- Toda mudança de regra de produto atualiza a PRD, a versão dela (menor para regra ajustada, por exemplo 2.0 → 2.1; maior para mudança de escopo ou fase) e a data.

## Idioma

- Código (classes, tabelas, rotas, enums), nomes de arquivos e commits em inglês.
- Documentação e interface em português do Brasil.
- A entidade principal se chama `InternalRequest`, para não conflitar com a classe `Request` do Laravel.

## Como trabalhar com o usuário

- Diante de uma decisão em aberto, pergunte uma coisa por vez, com uma opção recomendada e o motivo.
- Toda escolha precisa ser defensável: prefira o simples e proporcional ao problema.
