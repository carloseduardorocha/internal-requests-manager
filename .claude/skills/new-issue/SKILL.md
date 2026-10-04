---
name: new-issue
description: Cria uma issue no GitHub deste repositório seguindo o padrão do projeto (título, labels, milestone, corpo com critérios de aceite ligados à PRD). Use quando o usuário pedir para criar, abrir ou registrar uma issue, tarefa ou item de backlog.
---

# Criar issue

Cria issues consistentes com a PRD (`docs/prd.md`) e com a organização do backlog.

## Convenções

**Granularidade:** uma issue por fluxo da PRD **em cada aplicação**. Cada PR em `backend/` ou `frontend/` fecha exatamente uma issue.

**Título:** `[área] Fluxo: resumo curto`
Exemplos: `[backend] Solicitações: criar, consultar, editar e excluir`, `[frontend] Painel: indicadores`.

**Labels** (sempre uma de área e uma de tipo):

| Área | Tipo |
|---|---|
| `backend`, `frontend`, `infra`, `docs` | `feature`, `chore`, `bug` |

**Milestone** (pela fase da PRD):

| Milestone | Conteúdo |
|---|---|
| `Fase 1 — Operação básica` | Setup, acesso, solicitações, análise e decisão, painel |
| `Fase 2 — Comunicação` | Notificações por Discord e e-mail |
| `Fase 3 — Expansão` | Convite, recuperação de senha, disponibilização online, IA, SSO etc. |

**Project:** toda issue entra no project `Board de Atividades`.

## Passos

1. Leia em `docs/prd.md` o fluxo relacionado. A issue **referencia** a PRD; não copia as regras de lá.
2. Defina área, tipo e milestone pelas tabelas acima. Se algo não estiver na PRD, pergunte ao usuário antes de inventar escopo.
3. Procure duplicatas: `gh issue list --state all --search "<termos>"`. Se existir, mostre e pergunte.
4. Escreva o corpo com o modelo abaixo num arquivo temporário (no scratchpad).
5. Mostre o rascunho (título, labels, milestone, corpo) e espere a confirmação, a menos que o usuário já tenha pedido para criar direto.
6. Crie:
   ```bash
   gh issue create --title "<título>" --body-file <arquivo> \
     --label "<área>,<tipo>" --milestone "<milestone>" --project "Board de Atividades"
   ```
7. Responda com o número e o link da issue.

Para várias issues de uma vez, mostre todos os rascunhos numa lista só, peça uma confirmação e crie em sequência.

## Modelo do corpo

```markdown
## Contexto
Por que isso existe, em uma ou duas frases. Fluxo da PRD: [<nome do fluxo>](https://github.com/carloseduardorocha/internal-requests-manager/blob/main/docs/prd.md#<âncora>).

## O que fazer
- Entregas concretas desta issue, só desta aplicação.

## Critérios de aceite
- [ ] Comportamento verificável, do ponto de vista de quem usa ou de quem consome a API.
- [ ] Testes cobrindo as regras da PRD envolvidas.

## Fora do escopo
- O que fica para outra issue (por exemplo, a parte da outra aplicação).
```

Escreva em português do Brasil, de forma curta. Não use as palavras "teste técnico", "avaliador" ou "desafio": o projeto é tratado como produto real.
