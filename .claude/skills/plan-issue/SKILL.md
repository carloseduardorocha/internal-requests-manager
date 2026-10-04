---
name: plan-issue
description: Planeja a implementação de uma issue do GitHub deste repositório, tira as dúvidas com o usuário e registra o plano aprovado como comentário na issue. Use quando o usuário pedir para planejar uma issue ou antes de implementar uma (`/plan-issue <número>`).
---

# Planejar issue

O plano é onde as decisões acontecem. A implementação (`/implement-issue`) só executa o que estiver aqui, então tudo o que for ambíguo precisa ser resolvido agora.

Não altere código nem documentação nesta etapa.

## Passos

1. **Leia a issue:** `gh issue view <número> --comments`. Se já houver um comentário `## Plano`, pergunte se é para revisar o plano existente ou começar de novo.
2. **Leia as fontes de verdade** listadas no CLAUDE.md que tocam a issue: o fluxo da PRD, os ADRs, `docs/api.md`, `docs/database.md` e o código que já existe. Para o que já foi entregue, leia também os planos e os PRs das issues fechadas relacionadas (`gh issue list --state closed`, `gh pr list --state merged`): é ali que estão as decisões anteriores e os seus motivos.
3. **Confira as dependências.** Se a issue depende de outra que ainda não foi feita (por exemplo, telas antes da API ou qualquer coisa antes do setup), avise e pergunte como seguir.
4. **Tire as dúvidas**, uma por vez, cada uma com uma opção recomendada e o motivo. Não invente escopo: o que não está na PRD ou na issue é pergunta, não decisão.
5. **Escreva o plano** com o modelo abaixo, num arquivo no scratchpad.
6. **Mostre o plano** e espere a aprovação. Ajuste até o usuário aprovar.
7. **Publique o plano aprovado** como comentário na issue:
   ```bash
   gh issue comment <número> --body-file <arquivo>
   ```
8. Responda com o link do comentário e sugira `/implement-issue <número>`.

## Modelo do plano

O plano é a única fonte para quem implementa, testa e revisa. Ele precisa ser específico o bastante para um agente sem contexto executar sem fazer perguntas.

```markdown
## Plano

**Branch:** `<feat|chore|fix>/<número>-<slug>`, ou "direto na `main`" para issues só de `docs/`.

### Decisões
- Decisão tomada e o motivo. Marque com **(ADR)** as que viram ADR.

### Implementação
- Arquivos a criar ou alterar, com o papel de cada um (rotas, controllers, models, migrations, policies, telas, componentes).

### Contrato e dados
- Endpoints (método, rota, payload, respostas e erros) e mudanças no banco. Escreva "nenhum" se não houver.

### Testes
| Critério de aceite | Teste |
|---|---|
| Critério da issue | O que o teste verifica e o tipo (feature ou unitário) |

### Documentação
- O que atualizar: `docs/api.md`, `docs/database.md`, ADRs, diagramas, README.

### Fora do escopo
- O que fica para outra issue.
```

Escreva em português do Brasil, de forma curta. Cada regra de negócio é **referenciada** na PRD, não copiada.
