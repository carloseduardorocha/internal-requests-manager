# Desenvolvimento

Detalhes do ambiente local, das notificações, dos logs e dos comandos. A subida rápida está no [README](../README.md#guia-rápido).

## Ambiente

A cada subida, a API prepara o ambiente: na primeira, cria o `backend/.env` a partir do `backend/.env.example` (se ele ainda não existir) e gera a chave; em todas, roda as migrations e o seed. O seed recria os usuários e os pedidos de exemplo que estiverem faltando, inclusive os que você editar ou excluir. A API está pronta quando `/up` responde. O front-end roda em modo de desenvolvimento, então o primeiro acesso a cada página leva alguns segundos para compilar.

- Parar: `docker compose down`. Zerar o banco: `docker compose down -v`.
- Se alguma porta já estiver em uso, copie o `.env.example` da raiz para `.env` e troque as portas.
- O `worker` não recarrega o código: depois de mudar um job ou uma notificação, rode `docker compose restart worker`. A `api` não relê o `backend/.env`: depois de mudá-lo, rode `docker compose restart api worker`.
- O MySQL fica em `localhost:3306`, com banco, usuário e senha no `docker-compose.yml`.

## Notificações

As notificações saem por uma fila no banco, processada pelo serviço `worker` ([ADR 0005](adr/0005-database-queue-and-retries.md)). Por isso, a ação de quem usa nunca espera o envio. Se um envio falhar, o sistema tenta de novo até 3 vezes, com espera de 1, 5 e 15 minutos, num total de 4 tentativas. Cada tentativa fica em `notification_logs`, e o job que esgota as tentativas vai para `failed_jobs`. Para reenviar o que falhou:

```bash
docker compose exec -u "$(id -u):$(id -g)" api php artisan queue:retry all
```

Os segredos das notificações ficam no `backend/.env`, que está fora do Git. Depois de mudá-lo, rode `docker compose restart api worker`.

### Discord

O canal da equipe recebe uma mensagem quando um pedido é criado e quando é decidido, com o número, o título, a prioridade, o solicitante, a área e um link para o pedido. Na decisão, entram também o resultado, quem decidiu e a justificativa.

Para ligar, preencha `DISCORD_WEBHOOK_URL` no `backend/.env` com a URL do webhook do canal e rode `docker compose restart api worker`. Vazia (o padrão), nada vai ao Discord, e o resto do produto funciona normalmente. A URL é um segredo, porque quem a tem consegue postar no canal: ela não vai para o Git e não é gravada nos jobs nem nos logs.

### E-mail

O solicitante recebe um e-mail quando o pedido dele é assumido e quando é decidido, com o título, o novo status, quem assumiu ou decidiu, a justificativa (na decisão) e o botão "Ver pedido". O convite de conta e o link de recuperação de senha também saem por aqui, pela mesma fila. O link do convite vale por `INVITATION_EXPIRE_DAYS` dias (padrão 7).

Sem configurar nada, os e-mails caem no Mailpit, que não os entrega a ninguém: http://localhost:8025.

Para enviar de verdade, preencha as variáveis `MAIL_*` no `backend/.env` (o `backend/.env.example` tem um bloco comentado com as do Gmail) e rode `docker compose restart api worker`. Trocar de servidor SMTP é só configuração, sem mudar o código ([ADR 0007](adr/0007-discord-webhook-and-smtp.md)). Se o SMTP estiver errado ou fora do ar, assumir e decidir continuam funcionando, e os envios falham no `worker`, com novas tentativas e registro de cada uma.
