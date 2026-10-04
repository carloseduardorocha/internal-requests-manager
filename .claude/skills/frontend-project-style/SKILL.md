---
name: frontend-project-style
description: Design system do front-end deste projeto e geração de mockups HTML para validar telas antes do código. Use SEMPRE que for criar, editar ou planejar qualquer tela, página, componente ou layout em `frontend/` (Next.js), em qualquer tarefa de UI/UX, e quando o usuário pedir "mockup", "protótipo", "opções de design", "me mostra antes" ou "quero ver como fica".
---

# Design system e mockups

Garante que todo código de front-end siga o design system do projeto e que as telas novas sejam validadas num mockup antes do código real.

| O quê | Onde |
|---|---|
| Design system (cores, tipografia, tokens, componentes do domínio) | `docs/design-system.md` |
| Mockups aprovados | `docs/mockups/<feature>.html` |
| Escolhas técnicas (biblioteca de componentes, ícones, animações) | ADR em `docs/adr/` |

## Passo 1: carregar o design system

Leia `docs/design-system.md`. Se ele existir, siga as definições e vá para o Passo 3. Se não existir, faça o Passo 2.

## Passo 2: criar o design system (primeira vez)

Não faça um questionário. Muita coisa já está decidida no `AGENTS.md` e na PRD: o nome do produto, o público (pessoas da empresa que pedem, analisam e acompanham pedidos internos), Next.js com TypeScript e a interface em português do Brasil.

1. Monte uma **proposta completa** com o modelo do Passo 2a. Para cada item em aberto (paleta, fontes, tema, arredondamento, densidade, biblioteca de componentes, ícones), escolha um valor recomendado e o motivo em poucas palavras. Prefira o simples: um produto interno, sóbrio e legível, que funcione no celular.
2. Mostre a proposta e pergunte o que o usuário quer mudar. Se for preciso perguntar algo, pergunte uma coisa por vez.
3. Com a aprovação, salve em `docs/design-system.md`. As escolhas de biblioteca (componentes, ícones, animações) também viram ADR, porque são decisões técnicas.

### Passo 2a: modelo do `docs/design-system.md`

```markdown
# Design system

Tokens e padrões visuais da interface. As escolhas de biblioteca estão nos ADRs.

## Produto
name: Gestão de Solicitações Internas
tone: [tom/personalidade]

## Stack
framework: Next.js
typescript: sim
component_library: [Shadcn/ui / nenhuma / outra] — ver ADR
icons: [Lucide / outra]
animations: [CSS / nenhuma]

## Cores
primary: "#XXXXXX"
primary_hover: "#XXXXXX"
background: "#XXXXXX"
surface: "#XXXXXX"
border: "#XXXXXX"
text_primary: "#XXXXXX"
text_secondary: "#XXXXXX"
accent: "#XXXXXX"
success: "#10b981"
error: "#ef4444"
warning: "#f59e0b"

## Status e prioridade
# Cor de cada status (Aberta, Em Análise, Aprovada, Rejeitada) e de cada prioridade (Baixa, Média, Alta).

## Tema
dark_mode: [light_only / dark_only / both]
# Se "both": dark_background, dark_surface, dark_border, dark_text_primary, dark_text_secondary

## Tipografia
font_heading: "[nome] — [origem]"
font_body: "[nome] — [origem]"
font_mono: "JetBrains Mono — Google Fonts"

## Layout e tokens
# Arredondamento: none | subtle (4-6px) | modern (8-12px) | rounded (16px+)
border_radius: modern
# Densidade: compact | balanced | spacious
density: balanced

## Componentes do domínio
# - RequestCard / linha da lista: título, prioridade, status, solicitante, área, data
# - StatusBadge e PriorityBadge
# - Linha do tempo do histórico de status
```

## Passo 3: aplicar o design system

### Cores
- Use tokens com nomes semânticos (CSS variables ou tema do Tailwind): `primary`, `surface`, `border` etc. Nunca use hex direto no componente.

### Tipografia

| Token | Tailwind | Uso |
|---|---|---|
| xs | text-xs | labels, legendas, badges |
| sm | text-sm | texto secundário, metadados |
| base | text-base | texto principal |
| lg/xl | text-lg/xl | subtítulos |
| 2xl–4xl | text-2xl+ | títulos de seção |

### Arredondamento por `border_radius`

| Config | Botões | Cards | Badges | Avatares |
|---|---|---|---|---|
| none | rounded-none | rounded-none | rounded-none | rounded-none |
| subtle | rounded | rounded-md | rounded-md | rounded-full |
| modern | rounded-lg | rounded-xl | rounded-full | rounded-full |
| rounded | rounded-xl | rounded-2xl | rounded-full | rounded-full |

### Densidade por `density`

| Config | Padding de cards | Gap de listas | Padding de botões |
|---|---|---|---|
| compact | p-3 | gap-2 | px-3 py-1.5 |
| balanced | p-4 / p-6 | gap-3/4 | px-4 py-2 |
| spacious | p-6 / p-8 | gap-6 | px-6 py-3 |

### Padrões de componente

**Botão primário**
```tsx
<button className="bg-primary hover:bg-primary-hover text-white font-medium
  transition-colors [border-radius] [padding]">
```

**Card**
```tsx
<div className="bg-surface border border-border shadow-sm hover:shadow-md
  transition-shadow [border-radius] [padding]">
```

**Input**
```tsx
<input className="border border-border bg-background text-text-primary
  placeholder:text-text-secondary focus:ring-2 focus:ring-primary
  focus:border-transparent [border-radius] [padding]">
```

### Regras de qualidade
- TypeScript estrito, sem `any`.
- Props desestruturadas no parâmetro da função.
- Eventos nomeados `handleNomeDoEvento`.
- Mobile-first: base para celular, depois `md:` e `lg:`.
- Alvos de toque com pelo menos 44×44px.
- Imagens com `next/image`.
- Listas com `key` de ID único, nunca o índice do array.
- Carregamento com skeleton (`animate-pulse`) ou spinner (`Loader2 animate-spin`).
- Estado vazio sempre com ícone e mensagem, nunca um `null` silencioso.
- Dark mode com o prefixo `dark:` quando `dark_mode: both`.

### Proibido
- `style={{ }}` inline: use Tailwind.
- `!important`.
- IDs para estilização.
- Componentes com mais de 200 linhas sem quebrar em subcomponentes.

## Passo 4: mockups

Valida o visual de uma tela antes do código real. São HTML estático descartável; o código de produção vem depois, no Next.js.

**Quando fazer:**
- no `/plan-issue` de uma issue de `frontend/` que cria telas novas ou muda bastante uma tela existente;
- sempre que o usuário pedir ("mockup", "protótipo", "opções de design", "me mostra antes", "quero ver como fica").

Fora desses casos, vá direto para o código.

### Como funciona

O viewer (`assets/harness.html`) é fixo e não deve ser reescrito. Ele mostra uma galeria que alterna entre as versões (`[v1][v2]` ou `[A][B][C]`) e um seletor de tamanho (**375 · 768 · 100%**), tudo por iframe.

Uma pasta por feature em `/tmp/fps-mockups/<feature>/`:

```
/tmp/fps-mockups/solicitacoes/
├── manifest.json     ← lista as versões (você gera e atualiza)
├── v1.html           ← mockups (você gera)
├── v2.html
└── index.html        ← viewer, copiado pelo script (não edite)
```

`manifest.json`:

```json
{
  "feature": "Solicitações",
  "entries": [
    { "id": "v1", "label": "V1 — tabela", "file": "v1.html" },
    { "id": "v2", "label": "V2 — cards", "file": "v2.html" }
  ]
}
```

O viewer abre na **última** versão, em 100%.

### Fluxo: uma versão por vez

1. Carregue o design system (Passos 1 a 3).
2. Crie `/tmp/fps-mockups/<feature>/` e gere **um** mockup (`v1.html`): mobile-first, com conteúdo real do domínio (pedidos, status, prioridades, áreas), nunca lorem ipsum, e os tokens do design system.
3. Escreva o `manifest.json` com a entrada `v1`.
4. Suba o servidor e passe a URL ao usuário:
   ```bash
   .claude/skills/frontend-project-style/scripts/serve_mockups.sh start /tmp/fps-mockups/<feature>
   ```
   O script escolhe uma porta livre a partir de 8420 e roda em segundo plano. No WSL2, a URL `localhost` abre normalmente no navegador do Windows. A URL de celular só funciona com o WSL em modo de rede espelhado; se não abrir, avise o usuário.
5. A cada rodada de feedback, gere `v2.html`, `v3.html` e assim por diante, e **acrescente** cada uma ao manifest, mantendo as anteriores para comparar. Rodar `start` de novo na mesma pasta reaproveita o servidor: basta o usuário atualizar a página.
6. **Quando o usuário aprovar:**
   - copie a versão aprovada para `docs/mockups/<feature>.html` (ela é a referência de quem implementa, e o `/tmp` não sobrevive);
   - registre o caminho no plano da issue;
   - encerre o servidor:
     ```bash
     .claude/skills/frontend-project-style/scripts/serve_mockups.sh stop /tmp/fps-mockups/<feature>
     ```

### Atalho: várias opções de uma vez

Se o usuário pedir "me dá 2 ou 3 opções", gere `A.html`, `B.html` e `C.html` como entradas do mesmo manifest (por exemplo, `id: "A"`, `label: "A — minimalista"`). Depois siga o fluxo iterativo sobre a opção escolhida.

### Regras dos mockups

- Autocontidos: sem `<script src>`, `<link>` externo ou fonte de CDN. Use uma fonte de sistema próxima e avise que a real entra no código.
- Responsivos de verdade: a versão em 375px precisa ficar boa.
- Tokens do design system em `:root { --primary: ... }`, sem valores aleatórios.
- Interface em português do Brasil.
- Tema claro, a menos que o design system diga outra coisa.

## Fidelidade ao mockup aprovado

Ao implementar uma tela que tem mockup em `docs/mockups/`, ele é a especificação visual. Bibliotecas de componentes induzem a aceitar o visual padrão delas (arredondamento, maiúsculas, paddings, sombras). Resista a isso:

- use o componente da biblioteca pelo **comportamento** (dialog, select, menu, input) e sobrescreva o visual;
- use markup simples quando o componente só traria enfeite;
- copie os valores do mockup literalmente (cores, arredondamento, fontes, paddings, espaçamentos);
- compare a tela pronta com o mockup em 375, 768 e 1280px antes de entregar.

## Atualizar o design system

Se o usuário pedir uma mudança no design system, leia `docs/design-system.md`, aplique a mudança e diga o que foi alterado. Se a mudança trocar uma biblioteca, atualize ou substitua o ADR correspondente.
