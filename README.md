# MetaAmorfose Admin Panel

Painel fullstack em Next.js para visualizar conversas do chatbot, enviar mensagens manuais, consultar midias/documentos recebidos e solicitar aprovacao de profissionais por endpoint HTTP.

## Arquitetura

- `app/page.tsx`: tela principal com sidebar de conversas e area de chat.
- `app/api/admin/*`: API routes server-only para leitura no PostgreSQL, acesso ao S3 e forwarding HTTP.
- `lib/db.ts`: cliente Prisma compartilhado usando `DATABASE_URL` apenas no servidor.
- `lib/s3.ts`: cliente S3 compartilhado, usado apenas pelo backend do Next.js.
- `lib/queries.ts`: consultas somente leitura (`SELECT`).
- `lib/messageSender.ts`: envio de mensagem e aprovacao via endpoints externos.
- `components/*`: componentes client com TanStack Query e polling.

## Seguranca

- `DATABASE_URL` nunca deve ser exposta no client.
- As credenciais AWS e as chaves privadas do S3 nunca sao expostas no client.
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
S3_BUCKET_NAME=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
```

`APPROVE_PROFESSIONAL_URL` pode ser uma URL direta ou conter `{professionalId}` para substituicao no envio.
`UPLOAD_MEDIA_URL` deve apontar para o endpoint `POST /upload-media` do FastAPI.
O bucket deve ser privado e permitir `s3:GetObject` para o backend do painel no
prefixo `media/*`. Em ambientes com IAM Role, as duas variaveis de credenciais
podem ficar vazias; o SDK da AWS usa a cadeia padrao de credenciais.
Use os valores reais apenas no `.env` local.

## Fluxo de midia

- O banco armazena somente a chave privada em `message_history.media_path`.
- Imagens e documentos sao solicitados pela rota interna do painel usando o ID
  da mensagem; o backend busca o objeto no S3 e transmite o conteudo ao browser.
- Para enviar uma imagem, o painel envia o arquivo para `POST /upload-media` e
  encaminha o campo `media` retornado para `POST /send`.

## Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000/admin`.

## Build

```bash
npm run build
```

## Rodar com Docker

Com o arquivo `.env` configurado com as variáveis necessárias, crie a imagem e inicie o container:

```bash
docker build -t metaamorfose-admin-panel .
docker run -d --rm -p 3000:3000 --env-file .env metaamorfose-admin-panel
```

O painel ficará disponível em `http://localhost:3000/admin`.

Em produção, o Nginx deve preservar `/admin` ao encaminhar a requisição:

```nginx
location = /admin {
    return 301 /admin/;
}

location /admin/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

O `proxy_pass` não deve terminar com `/`, pois isso removeria o prefixo
`/admin` antes de a requisição chegar ao Next.js.

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
