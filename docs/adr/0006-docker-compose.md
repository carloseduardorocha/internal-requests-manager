# 0006. Ambiente com Docker Compose

**Status:** Aceito
**Data:** 03/10/2026

## Contexto

O produto tem várias peças (front-end, API, worker, banco e servidor de e-mail de desenvolvimento) e precisa subir igual em qualquer máquina. A visão das peças está em [containers.md](../architecture/containers.md).

## Decisão

Docker Compose com cinco serviços: `frontend`, `api`, `worker`, `mysql` e `mailpit`. É um ambiente de desenvolvimento: o código entra por bind mount e os containers rodam como o dono do código, para não criar arquivos de root. O passo a passo fica no `README.md`.

## Consequências

- Positivas: ambiente reproduzível com um comando; o e-mail é visível no Mailpit sem enviar nada de verdade.
- Custos: exige Docker instalado e consome mais recursos que rodar as aplicações direto.
