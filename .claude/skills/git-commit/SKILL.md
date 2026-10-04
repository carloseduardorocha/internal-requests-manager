---
name: git-commit
description: Prepara e cria commits neste repositório seguindo Conventional Commits, sempre com a permissão do usuário antes de executar. Use sempre que for commitar, quando o usuário pedir para "commitar", "fazer o commit", "preparar o commit" ou precisar de uma mensagem de commit, e em toda etapa de commit das outras skills (como implement-issue).
---

# Commit

Monta os comandos `git add` + `git commit` no padrão [Conventional Commits](https://www.conventionalcommits.org/), mostra ao usuário e **só executa depois que ele aprovar**. A aprovação vale para os commits mostrados naquele momento, não para os próximos.

Em qual branch commitar (direto na `main` ou numa branch própria) está no `AGENTS.md`.

## Passo 1: entender o que mudou

Rode em paralelo:

```bash
git status
git diff HEAD
git diff --cached
```

Leia o diff inteiro. É preciso entender *o que* mudou e *por quê* (pela conversa, pela issue ou pelo plano) antes de agrupar.

Arquivos não versionados que não fazem parte do trabalho ficam de fora. Alguns são arquivos pessoais do usuário e nunca devem ser commitados.

## Passo 2: agrupar em commits lógicos

Cada commit é uma mudança coerente e atômica. Pergunta-guia: "se alguém fizer bisect e cair neste commit, ele faz sentido sozinho?"

**Separe quando:**
- uma funcionalidade nova e uma correção sem relação vieram juntas;
- testes e código de funcionalidades diferentes estão misturados;
- configuração de CI ou infra mudou junto com código da aplicação;
- uma atualização de dependência veio junto com regra de negócio.

**Mantenha junto quando:**
- o código e o teste implementam a mesma mudança;
- uma refatoração toca vários arquivos, mas é um movimento só;
- uma correção exige mudar código e configuração.

Se tudo estiver bem relacionado, um commit só basta.

## Passo 3: escrever a mensagem

Em inglês:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Funcionalidade ou comportamento novo visível para quem usa ou consome a API |
| `fix` | Correção de bug |
| `refactor` | Reestruturação sem mudança de comportamento |
| `test` | Só testes (novos ou corrigidos) |
| `chore` | Manutenção: ferramentas, configurações, dependências, scripts, skills e agentes |
| `docs` | Só documentação |
| `ci` | Pipelines de CI/CD |
| `perf` | Melhoria de desempenho |
| `build` | Sistema de build, Docker |

### Escopo

O domínio ou a camada afetada. Neste projeto, prefira o fluxo da PRD (`auth`, `requests`, `review`, `dashboard`, `notifications`) ou a camada (`api`, `db`, `ui`, `docker`). Omita o escopo só quando a mudança for transversal, sem um dono claro.

### Regras da mensagem

- **Descrição:** imperativo, minúscula, sem ponto final, com menos de 72 caracteres. Escreva `add retry logic`, não `Added retry logic.`
- **Corpo** (opcional): explica o *porquê*, não o *quê*; o diff já mostra o quê.
- **`BREAKING CHANGE:`** no rodapé quando o contrato público mudar de forma incompatível.

## Passo 4: mostrar e pedir permissão

Mostre um bloco por commit, numerado na ordem de execução, com os arquivos listados um a um:

```bash
git add path/to/file.php path/to/other.php
git commit -m "feat(requests): add status filter to listing"
```

Com corpo ou rodapé:

```bash
git add path/to/file.php path/to/other.php
git commit -m "$(cat <<'EOF'
feat(review): reject decision without justification

The PRD requires every decision to be justified and traceable,
so an empty justification now returns 422.
EOF
)"
```

Pergunte se pode executar. Se o usuário pedir ajustes, refaça e mostre de novo.

## Passo 5: executar

Com a aprovação, rode os comandos exatamente como foram mostrados e faça o push da branch atual. Depois confira com `git log --oneline -<n>` e `git status --short` e informe o resultado.

## Regras fixas

- **Nunca commite sem a aprovação do usuário.**
- **Nunca use `git add .`, `git add -A` ou uma pasta inteira:** liste cada arquivo.
- **Comece com o índice vazio:** o `git commit` leva tudo o que está no índice, e não só o que o `git add` passou. Se o `git diff --cached` mostrar algo antes do primeiro commit (um `git rm` de um agente, por exemplo), tire com `git restore --staged <arquivos>` e inclua esses arquivos no `git add` do commit certo.
- **Nunca adicione `Co-Authored-By` nem outro trailer.**
- **Nunca use `--gpg-sign`, `-S` ou `--no-verify`.**
- **Nunca use amend, rebase ou qualquer comando que reescreva o histórico.**
- **Push só junto com um commit aprovado:** a aprovação do commit vale também para o push.
