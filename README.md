# MetaAmorfose Admin Panel

Painel fullstack em Next.js para visualizar conversas do chatbot, enviar mensagens manuais, consultar midias/documentos recebidos e solicitar aprovacao de profissionais por endpoint HTTP.

## Arquitetura

- `app/page.tsx`: tela principal com sidebar de conversas e area de chat.
- `app/api/admin/*`: API routes server-only para leitura no PostgreSQL e forwarding HTTP.
- `lib/db.ts`: pool `pg` usando `DATABASE_URL` apenas no servidor.
- `lib/queries.ts`: consultas somente leitura (`SELECT`).
- `lib/messageSender.ts`: envio de mensagem e aprovacao via endpoints externos.
- `components/*`: componentes client com TanStack Query e polling.

## Seguranca

- `DATABASE_URL` nunca deve ser exposta no client.
- Nao use `NEXT_PUBLIC_DATABASE_URL`.
- O banco e tratado como somente leitura.
- Nao ha `INSERT`, `UPDATE` ou `DELETE` no codigo.
- Envio de mensagem e aprovacao sao feitos por HTTP externo.
- Nao commite `.env` real.

## Instalacao

```bash
npm install
```

## Variaveis de ambiente

Crie um `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

Exemplo:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
SEND_MESSAGE_URL="https://HOST/send"
UPLOAD_MEDIA_URL="https://HOST/upload-media"
APPROVE_PROFESSIONAL_URL=""
```

`APPROVE_PROFESSIONAL_URL` pode ser uma URL direta ou conter `{professionalId}` para substituicao no envio.
Use os valores reais apenas no `.env` local.

## Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Build

```bash
npm run build
```

## Testes

```bash
npm test
```

Os testes de banco usam `DATABASE_URL` e executam apenas `SELECT`.

## Teste real de envio

O teste real de envio fica desativado por padrao. Para rodar:

```bash
npm run test:send-message
```

Ele envia:

```json
{
  "phone_number": "5511974527717",
  "content": "Mensagem de teste automatizado"
}
```

## Polling

- Conversas: a cada 5 segundos.
- Mensagens da conversa selecionada: a cada 3 segundos.
- WebSocket nao foi implementado nesta versao.
