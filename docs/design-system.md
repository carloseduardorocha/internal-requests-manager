# Design system

Tokens e padrões visuais da interface. Referência visual: [mockups/design-system.html](mockups/design-system.html). Valores em código: `frontend/src/app/globals.css`. Bibliotecas: [ADR 0009](adr/0009-shadcn-ui-component-library.md).

## Produto
name: Gestão de Solicitações Internas
tone: sóbrio, legível e acolhedor, com a identidade verde da marca

## Stack
framework: Next.js
typescript: sim
component_library: shadcn/ui, com o visual sobrescrito por este documento (ADR 0009)
icons: Lucide
animations: CSS

## Cores (tema claro)
primary: "#33820d"
primary_hover: "#26610a"
background: "#f8f9f7"
surface: "#ffffff"
border: "#e1e6e1" (forte: "#cdd3cd")
text_primary: "#323c32"
text_secondary: "#5a645a"
accent: "#ecf6e7" (texto "#26610a")
ring: "#33820d"
success: "#047857"
error: "#b91c1c" (hover "#991b1b")
warning: "#b45309"
brand: "#3fa110" (escuro "#0a4b1e")

## Tema escuro
dark_mode: both (padrão: o do sistema; alternável na interface)
dark_background: "#0c0e0c"
dark_surface: "#161a16"
dark_border: "#262c26" (forte: "#343c34")
dark_text_primary: "#e1e6e1"
dark_text_secondary: "#a0aaa0"
dark_primary: "#64c832" (hover "#a0dc8c", texto sobre ele "#0c0e0c")
dark_error: "#f87171"

## Status e prioridade

| Status | Claro (fundo / texto) | Escuro (fundo / texto) |
|---|---|---|
| Aberta | `#eff6ff` / `#1d4ed8` | `#172554` / `#93c5fd` |
| Em Análise | `#fffbeb` / `#b45309` | `#3b2a0a` / `#fcd34d` |
| Aprovada | `#ecf6e7` / `#26610a` | `#1a2a16` / `#a0dc8c` |
| Rejeitada | `#fef2f2` / `#b91c1c` | `#3a1212` / `#fca5a5` |

| Prioridade | Seta | Claro | Escuro |
|---|---|---|---|
| Baixa | para baixo | `#5a645a` | `#a0aaa0` |
| Média | para a direita | `#c2410c` | `#fdba74` |
| Alta | para cima | `#b91c1c` | `#fca5a5` |

## Tipografia
font_heading: "Exo 2 — Google Fonts (via next/font)"
font_body: "Nunito — Google Fonts (via next/font)"
font_mono: "JetBrains Mono — Google Fonts (via next/font), para identificadores como #128"
base: 15px, entrelinha 1.5

## Layout e tokens
border_radius: modern (8px; botões, campos e cards)
density: balanced
botões e campos: altura mínima de 48px (alvo de toque acima dos 44px)

## Regras de interface

- Botões: todo botão tem hover, foco visível e estado desabilitado.
- Foco: outline de 2px em `--ring`, com offset de 2px.
- Foco ao fechar: um modal, menu ou ação que desabilita o próprio botão devolve o foco ao controle que o abriu; um erro sem campo leva o foco a um ponto dentro do formulário.
- Ações em massa: a seleção vale para a página; a barra flutua no rodapé; o resultado parcial aparece num aviso acima da lista. Referência: [mockups/request-list-actions.html](mockups/request-list-actions.html).
- Status: cor, ícone e texto juntos; nunca só a cor.
- Prioridade: seta e texto, sem fundo.
- Navegação (só a do desktop): item ativo com texto `primary` e traço de 2px sob o rótulo, sem fundo. O hover do inativo só muda o texto para `primary`, sem traço; o do ativo passa texto e traço para `primary-hover`.
- Acessibilidade: o nome acessível de um controle contém o texto visível dele.
- Itálico: recurso pontual para dar dinamismo. O guia da marca para interfaces digitais substitui o ângulo de 8° por itálico.
- Favicon: neutro (`src/app/icon.svg`) até haver o arquivo "Símbolo" oficial.

## Logo Sicredi

- Só os arquivos originais em `frontend/public/brand/`, sem alterar proporção, cor ou forma (componente `BrandLogo`).
- Versão positiva no tema claro e negativa no escuro; a positiva nunca vai sobre fundo escuro.
- Respeitar a área de reserva ao redor do logo.

## Componentes do domínio
- RequestCard / linha da lista: título, prioridade, status, solicitante, área, data
- StatusBadge e PriorityBadge
- Linha do tempo do histórico de status
