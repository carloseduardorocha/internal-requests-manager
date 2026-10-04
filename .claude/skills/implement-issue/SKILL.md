---
name: implement-issue
description: Implementa uma issue do GitHub deste repositório a partir do plano aprovado no comentário da issue, usando os agentes implementer, tester, reviewer e documenter. Use quando o usuário pedir para implementar, executar ou fazer uma issue (`/implement-issue <número>`).
---

# Implementar issue

Executa o plano aprovado por `/plan-issue`. Esta sessão orquestra: ela delega o trabalho aos agentes, roda os testes, faz os commits e conversa com o usuário. Os agentes não fazem commit.

## Passos

1. **Leia o plano:** `gh issue view <número> --comments` e use o comentário `## Plano` mais recente. Se não existir, pare e sugira `/plan-issue <número>`. Mova a issue para **Doing** no board: `.claude/scripts/board-status.sh <número> "Doing"`.
2. **Entre na worktree da issue** (`EnterWorktree` com `path`), criada pelo `/plan-issue`; se não existir, crie-a do mesmo jeito. Todos os agentes, testes e commits rodam nela. Issues só de `docs/` usam a worktree da `main`; nesse caso, rode o passo 6 (documentar) e depois o passo 5 (revisar), com os achados indo para o `documenter`.
3. **Implemente:** chame o agente `implementer` passando o número da issue e o plano completo. Se ele voltar com uma dúvida, pergunte ao usuário (com uma opção recomendada) e chame-o de novo com a resposta. Commit: `feat(<escopo>): ...` (ou `chore`/`fix`, conforme o tipo).
4. **Teste:** chame o agente `tester` com o número da issue e o plano. Rode a suíte completa e o lint com os comandos do README. Se um teste falhar por defeito no código, mande a falha ao `implementer` e repita. Commit: `test(<escopo>): ...`.
5. **Revise:** chame o agente `reviewer` com o número da issue. Envie os achados **bloqueantes** e **importantes** ao `implementer`, rode os testes de novo e, se a correção tiver sido grande, revise outra vez. Sugestões ficam a critério do usuário.
6. **Documente:** chame o agente `documenter` com o número da issue e o plano. Commit: `docs: ...`.
7. **Feche a checagem:** confira cada critério de aceite da issue e mostre ao usuário um resumo com os commits, o resultado dos testes, os achados do review (corrigidos e pendentes) e a checagem dos critérios.
8. **Abra o PR só quando o usuário pedir:** faça o push e rode `gh pr create` com `Refs #<número>` e o resumo do passo 7 no corpo. Use `Refs`, e não `Closes`, para o merge não fechar a issue sozinho. Depois mova a issue para **Code Review**: `.claude/scripts/board-status.sh <número> "Code Review"`. Em issues só de `docs/`, que não têm PR, mova para **Code Review** depois do push.
9. **Retrospectiva** (veja abaixo).

A issue só é fechada quando o usuário avisar, depois do merge.

## Commits

Todo commit desta skill passa pela skill `git-commit`, que exige a aprovação do usuário antes de executar.

## Retrospectiva

O aprendizado vai para o lugar onde a regra mora, e não para um arquivo de lições à parte. Ao final, olhe para o que aconteceu nesta issue:

- o usuário corrigiu algum comportamento ou decisão;
- o reviewer apontou um problema que se repete;
- um agente travou, errou ou precisou de várias voltas;
- o plano deixou de fora algo que fez falta na implementação.

Para cada ponto que valha virar regra, proponha a mudança no arquivo certo: `AGENTS.md` (regra do projeto), `.claude/agents/<agente>.md` (comportamento de um agente) ou `.claude/skills/<skill>/SKILL.md` (etapa do fluxo). Mostre o diff e só aplique com aprovação. Esses arquivos ficam na raiz, então o commit vai direto na `main` (`chore: ...`), separado do PR.

Se nada valer, diga isso em uma linha.
