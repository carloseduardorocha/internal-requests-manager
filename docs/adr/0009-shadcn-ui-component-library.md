# 0009. shadcn/ui como biblioteca de componentes

**Status:** Aceito
**Data:** 04/10/2026

## Contexto

A interface segue a identidade visual do [design system](../design-system.md), com acessibilidade (teclado, foco, leitor de tela) e tema claro e escuro.

## Decisão

- shadcn/ui: os componentes são copiados para `frontend/src/components/ui/` e passam a ser código nosso, sobre Radix e Tailwind. Usamos o comportamento e sobrescrevemos o visual com os tokens do design system.
- Sonner para toasts e AlertDialog para confirmações.
- Lucide para ícones.
- next-themes para o tema claro e escuro, com o do sistema como padrão.

Alternativa descartada: biblioteca fechada (MUI, Chakra e similares), difícil de levar à identidade visual sem brigar com o estilo padrão dela.

## Consequências

- Positivas: controle total do visual e do código; acessibilidade vinda do Radix.
- Custos: atualizar um componente é manual; é preciso conferir o resultado contra o mockup, porque o visual padrão da biblioteca não é o nosso.
