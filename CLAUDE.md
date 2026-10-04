# CLAUDE.md

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
| Backlog | GitHub Issues, milestones por fase e o project "Board de Atividades" |

Antes de propor escopo, leia a PRD. Não duplique informação entre documentos: cada assunto tem um lugar só, e os outros documentos apontam para ele.

## Git

- Conventional Commits em inglês.
- Raiz do repositório e `docs/`: commit e merge direto na `main`.
- `backend/` e `frontend/`: sempre em branch própria e PR, fechando exatamente uma issue.
- Push só quando o usuário pedir.

## Issues

Use a skill `/new-issue`: uma issue por fluxo da PRD em cada aplicação, com título `[área] Fluxo: resumo`, uma label de área e uma de tipo, o milestone da fase e o corpo ligado à PRD. Mostre o rascunho antes de criar.

## Documentação

- Curta, com visão de produto, organizada por fluxo e cada regra dita uma vez só.
- A PRD não leva detalhe técnico, que vai para os ADRs, a API ou o README.
- O projeto é tratado como produto real.

## Idioma

- Código (classes, tabelas, rotas, enums), nomes de arquivos e commits em inglês.
- Documentação e interface em português do Brasil.
- A entidade principal se chama `InternalRequest`, para não conflitar com a classe `Request` do Laravel.

## Como trabalhar com o usuário

- Diante de uma decisão em aberto, pergunte uma coisa por vez, com uma opção recomendada e o motivo.
- Toda escolha precisa ser defensável: prefira o simples e proporcional ao problema.
