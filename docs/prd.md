# Gestão de Solicitações Internas

**PRD · Versão 3.0 · 08/10/2026**

## Visão geral

Hoje os pedidos internos chegam por e-mail, mensagens e planilhas. Ninguém sabe ao certo o que foi pedido, em que pé está ou quem decidiu.

O produto reúne esses pedidos num só lugar:

- quem pede registra e acompanha o andamento;
- quem analisa assume o pedido, decide e justifica;
- a gestão acompanha a operação por um painel.

**Objetivos**

- Todo pedido registrado num único lugar, com responsável e status.
- Toda decisão justificada e rastreável: quem decidiu, quando e por quê.
- Visão rápida da operação: quantos pedidos existem, em que situação e com qual prioridade.

## Quem usa

| Perfil | O que faz |
|---|---|
| **Solicitante** | Abre pedidos e acompanha os seus |
| **Analista** | Assume pedidos, aprova ou rejeita e acompanha o painel |
| **Administrador** | Faz o que os outros perfis fazem, sobre qualquer pedido, e dá suporte à operação |

Cada pessoa tem um perfil e pertence a uma área da empresa.

## Fluxos

### 1. Acesso

- A pessoa entra com e-mail e senha e vê o sistema de acordo com o seu perfil.
- Não existe cadastro aberto. As contas são criadas por convite do administrador (fluxo 6). Até a Fase 3, são criadas pela equipe de suporte.
- A mensagem de erro no login não diz se o problema foi o e-mail ou a senha.
- Depois de várias tentativas erradas seguidas, o acesso fica bloqueado por alguns minutos.
- A sessão termina quando a pessoa fecha o navegador ou depois de um período sem uso, a menos que ela marque "Mantenha-me conectado" ao entrar; nesse caso, continua conectada por até 30 dias. Ela pode sair a qualquer momento.

### 2. Solicitações

**Criar** (solicitante e administrador)
A pessoa informa título, descrição e prioridade (Baixa, Média ou Alta). O sistema preenche sozinho:

- o solicitante, que é quem está logado;
- a área do solicitante, gravada como estava no dia do pedido;
- a data;
- o status, que começa como **Aberta**.

**Consultar**
Lista com pesquisa por texto (título e descrição), filtros por status e por prioridade e ordenação por data (por padrão, os mais recentes primeiro). O solicitante vê só os próprios pedidos. Analista e administrador veem todos.

**Ações na lista** (Fase 3)
Cada pedido tem um menu de ações com visualizar, editar e excluir, que mostra só o que a pessoa pode fazer naquele pedido.

A pessoa também pode selecionar vários pedidos e excluir (solicitante e administrador) ou assumir (analista e administrador) todos de uma vez.

- Cada pedido segue as regras da ação individual (fluxos 2 e 3).
- A ação é feita nos pedidos em que vale. Os outros são ignorados, e o sistema mostra quantos foram feitos, quantos ficaram de fora e por quê.

**Ver detalhes**
Mostra todos os dados do pedido, quem está analisando, a decisão com a justificativa e o histórico de cada mudança de status.

**Editar** (o próprio solicitante ou o administrador)
Título, descrição e prioridade podem ser alterados **só enquanto o pedido está Aberto**.

**Excluir** (o próprio solicitante ou o administrador)
Também **só enquanto o pedido está Aberto**. O pedido some das telas e do painel, mas continua guardado para auditoria.

### 3. Análise e decisão

```
Aberta  →  Em Análise  →  Aprovada ou Rejeitada
```

- **Assumir:** o analista (ou o administrador) assume um pedido aberto, e o sistema registra quem assumiu e quando. A partir daí, o pedido não pode mais ser editado nem excluído.
- **Decidir:** só quem assumiu o pedido (ou o administrador) pode aprová-lo ou rejeitá-lo. A justificativa é obrigatória, e o sistema registra a data e o autor da decisão.
- Não é possível pular a etapa de análise.
- Uma decisão é definitiva e não pode ser alterada, nem pelo administrador.
- Toda mudança de status entra no histórico do pedido.

### 4. Painel

Disponível para analista e administrador. Mostra:

- o total de pedidos;
- quantos estão abertos, em análise, aprovados e rejeitados;
- a distribuição dos pedidos por prioridade.

Pedidos excluídos não entram na contagem.

### 5. Notificações

- **Discord:** o canal da equipe é avisado quando um pedido é criado e quando é decidido.
- **E-mail:** o solicitante é avisado quando o pedido é assumido e quando é decidido.
- Uma notificação nunca atrasa nem impede o uso do sistema. Se o envio falhar, o sistema tenta de novo sozinho e registra cada tentativa.

### 6. Convite e recuperação de senha (Fase 3)

**Convidar** (administrador)
O administrador informa nome, e-mail, perfil e área, e o sistema envia o convite por e-mail com o botão "Criar conta".

- Não é possível convidar um e-mail que já tem conta.
- Convidar de novo o mesmo e-mail envia um link novo, e o anterior deixa de valer.

**Criar a conta**
O botão do convite abre a tela de cadastro com nome, e-mail, perfil e área já preenchidos. A pessoa cria e confirma a senha e já entra no sistema.

- Só a senha é preenchida por ela. Os outros dados vêm do convite.
- O link vale por 7 dias e só pode ser usado uma vez. Se expirou, a pessoa pede um novo convite ao administrador.

**Recuperar a senha**
Na tela de login, "Esqueci minha senha" leva a uma tela onde a pessoa informa o e-mail e recebe um link para criar uma nova senha. Ela informa e confirma a nova senha, pode escolher desconectar dos outros dispositivos onde está conectada, e volta para o login.

- A resposta é a mesma exista ou não uma conta com aquele e-mail.
- O link vale por 60 minutos e só pode ser usado uma vez.

A senha, no cadastro e na recuperação, tem no mínimo 8 caracteres.

### 7. Gestão de usuários (Fase 3)

Disponível só para o administrador, no menu "Usuários", de onde também parte o convite (fluxo 6).

**Listar**
Lista das contas com nome, e-mail, perfil, área e situação (ativa ou desativada), com pesquisa por nome ou e-mail e filtros por perfil, área e situação.

**Editar**
O administrador altera nome, perfil e área. O e-mail não muda, porque é o login da pessoa.

- A mudança de área não altera os pedidos já criados, que guardam a área do dia em que foram abertos (fluxo 2).

**Desativar e reativar**
A pessoa desativada não consegue mais entrar, e a sessão dela termina na hora. A conta não é excluída: os pedidos e o histórico continuam com o nome dela, e o administrador decide o que tiver ficado em análise com ela. Reativar devolve o acesso com a mesma senha.

O administrador também pode selecionar várias contas e desativar ou reativar todas de uma vez, com a mesma regra das ações em massa do fluxo 2.

- O administrador não muda o próprio perfil nem desativa a própria conta.
- Um e-mail de conta desativada não pode ser convidado de novo; basta reativar a conta.

## Fases

**Fase 1: operação básica**
Acesso, solicitações, análise e decisão, e painel.

**Fase 2: comunicação**
Notificações por Discord e por e-mail.

**Fase 3: expansão**

- **Convite e recuperação de senha** (fluxo 6).
- **Gestão de usuários** (fluxo 7).
- **Ações na lista:** menu de ações por item e ações em massa (fluxos 2 e 7).
- **Disponibilização online:** até aqui, o sistema roda localmente.
- **Sugestão de prioridade ou resumo do pedido por IA**, sempre como sugestão e com a decisão final de uma pessoa.
- **Login com Google ou SSO da empresa.**
- **Indicadores de tempo:** quanto um pedido leva até ser assumido e até ser decidido.
- **Notificações em outros canais**, como Slack e Teams.

## Fora do escopo

- Cadastro aberto ao público.
- Reabrir pedidos já decididos.
- Anexos e conversas dentro do pedido.
- Exportação de relatórios.
- Aplicativo mobile. A versão web funciona no celular.
