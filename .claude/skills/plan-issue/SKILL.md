---
name: plan-issue
description: Planeja a implementação de uma issue do GitHub deste repositório, tira as dúvidas com o usuário e registra o plano aprovado como comentário na issue. Use quando o usuário pedir para planejar uma issue ou antes de implementar uma (`/plan-issue <número>`).
---

# Planejar issue

O plano é onde as decisões acontecem. A implementação (`/implement-issue`) só executa o que estiver aqui, então tudo o que for ambíguo precisa ser resolvido agora.

Não altere código nem documentação nesta etapa.

## Passos

1. **Leia a issue:** `gh issue view <número> --comments`. Se já houver um comentário `## Plano`, pergunte se é para revisar o plano existente ou começar de novo. Atribua a issue ao usuário e mova-a para **To Do** no board:
   ```bash
   gh issue edit <número> --add-assignee @me
   .claude/scripts/board-status.sh <número> "To Do"
   ```
2. **Crie a worktree da issue** a partir da `main` remota, com o nome de branch que vai no plano, e entre nela (`EnterWorktree` com `path`). Se ela já existir, só entre. Issues só de `docs/` usam a worktree da `main`.
   ```bash
   git fetch
   git worktree add .claude/worktrees/<branch> -b <branch> origin/main
   ```
   Copie para ela o `backend/.env` e o `frontend/.env` do checkout principal e avise o usuário se faltar alguma variável do `.env.example` correspondente (passos no README, em "Várias branches ao mesmo tempo").
3. **Leia as fontes de verdade** listadas no AGENTS.md que tocam a issue: o fluxo da PRD, os ADRs, `docs/api.md`, `docs/database.md` e o código que já existe. Para o que já foi entregue, leia também os planos e os PRs das issues fechadas relacionadas (`gh issue list --state closed`, `gh pr list --state merged`): é ali que estão as decisões anteriores e os seus motivos. Antes de escrever no plano que um teste, um código ou um documento (PRD, ADR) já cobre ou diz algo, abra o arquivo e confira.
4. **Confira as dependências.** Se a issue depende de outra que ainda não foi feita (por exemplo, telas antes da API ou qualquer coisa antes do setup), siga "Sessões em paralelo" no AGENTS.md para combinar os contratos com a sessão dela, e então avise o usuário do que foi combinado.
5. **Tire as dúvidas**, uma por vez, cada uma com uma opção recomendada e o motivo. Não invente escopo: o que não está na PRD ou na issue é pergunta, não decisão.
   Em issues de `frontend/` com telas novas, valide o visual com um mockup antes de fechar o plano, seguindo a skill `frontend-project-style`.
6. **Escreva o plano** com o modelo abaixo, num arquivo no scratchpad.
7. **Mostre o plano** e espere a aprovação. Ajuste até o usuário aprovar.
8. **Publique o plano aprovado** como comentário na issue:
   ```bash
   gh issue comment <número> --body-file <arquivo>
   ```
9. Responda com o link do comentário e sugira `/implement-issue <número>`.

## Modelo do plano

O plano é a única fonte para quem implementa, testa e revisa. Ele precisa ser específico o bastante para um agente sem contexto executar sem fazer perguntas.

```markdown
## Plano

**Branch:** `<feat|chore|fix>/<número>-<slug>`, ou "direto na `main`" para issues só de `docs/`.

### Decisões
- Decisão tomada e o motivo. Marque com **(ADR)** as que viram ADR.
- Em integrações com segredo (token, URL de webhook, senha): onde ele é lido e como fica fora do payload da fila, das mensagens de exceção e dos logs.
- Em fluxos que não podem revelar se uma conta existe: como o corpo, o status e o tempo de resposta ficam iguais nos dois casos.

### Implementação
- Arquivos a criar ou alterar, com o papel de cada um (rotas, controllers, models, migrations, policies, telas, componentes).
- Mockup aprovado: `docs/mockups/<feature>.html` (só em issues de `frontend/` com telas).

### Contrato e dados
- Endpoints (método, rota, payload, respostas e erros) e mudanças no banco. Escreva "nenhum" se não houver.
- Em issues de tela, diga o que a tela faz com cada campo que a validação da API pode devolver no `422`, conferindo as regras do FormRequest, e não só os campos que o fluxo espera.

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
