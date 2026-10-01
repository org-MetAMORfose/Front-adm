# MetaAmorfose Admin Panel

Painel fullstack em Next.js para visualizar conversas, gerenciar ciclos de matching, acompanhar a distribuicao de pacientes e encaminhar cadastros administrativos ao chatbot.

## Arquitetura

- `app/page.tsx`: tela principal com sidebar de conversas e area de chat.
- `app/api/admin/*`: API routes server-only para leitura no PostgreSQL, acesso ao S3 e forwarding HTTP.
- `lib/db.ts`: cliente Prisma compartilhado usando `DATABASE_URL` apenas no servidor.
- `lib/s3.ts`: cliente S3 compartilhado, usado apenas pelo backend do Next.js.
- `lib/queries.ts` e `lib/matchingQueries.ts`: consultas server-only.
- `app/distribuicao` e `app/profissionais/[professionalId]`: gestao e consulta do matching.
- `app/fluxo`: revisoes e editor visual do fluxo do chatbot, integrado por proxy server-side.
- `lib/messageSender.ts`: envio de mensagem e aprovacao via endpoints externos.
- `components/*`: componentes client com TanStack Query e polling.

## Seguranca

- `DATABASE_URL` nunca deve ser exposta no client.
- As credenciais AWS e as chaves privadas do S3 nunca sao expostas no client.
- Nao use `NEXT_PUBLIC_DATABASE_URL`.
- O painel le as tabelas operacionais e cria somente registros em `matching_cycle`.
- Cadastros de pacientes sao encaminhados ao chatbot; o painel nao escreve em `person` ou `patient`.
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
MATCHING_LAMBDA_NAME="matching"
CHATBOT_CREATE_PROFESSIONAL_URL=""
MATCHING_FOLLOWUP_TEMPLATE_URL="http://localhost:8000/whatsapp/templates/acompanhamento_emparelhamento"
CHATBOT_FLOW_API_URL="http://localhost:8000"
CHATBOT_API_KEY=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
CHATBOT_DOCKER_NETWORK="whatsapp-chatbot_chatbot_net"
```

`APPROVE_PROFESSIONAL_URL` pode ser uma URL direta ou conter `{professionalId}` para substituicao no envio.
`MATCHING_LAMBDA_NAME` identifica a função AWS que recebe um paciente ou um lote normalizado e executa o matching.
`CHATBOT_CREATE_PROFESSIONAL_URL` recebe os dados pessoais e profissionais normalizados.
`CHATBOT_FLOW_API_URL` aponta para o FastAPI que fornece `/chatbot-flow`; `CHATBOT_API_KEY` fica somente no servidor Next.js e nunca usa prefixo `NEXT_PUBLIC_`.
`MATCHING_FOLLOWUP_TEMPLATE_URL` recebe os telefones do paciente e do profissional para enviar o template de acompanhamento.
`UPLOAD_MEDIA_URL` deve apontar para o endpoint `POST /upload-media` do FastAPI.
O bucket deve ser privado e permitir `s3:GetObject` para o backend do painel no
prefixo `media/*`. Em ambientes com IAM Role, as duas variaveis de credenciais
podem ficar vazias; o SDK da AWS usa a cadeia padrao de credenciais.
Para o cadastro de pacientes, a credencial também precisa permitir `lambda:InvokeFunction` na função configurada.
Use os valores reais apenas no `.env` local.

## Fluxo de midia

- O banco armazena somente a chave privada em `message_history.media_path`.
- Imagens, videos e documentos sao solicitados pela rota interna do painel usando o ID
  da mensagem; o backend busca o objeto no S3 e transmite o conteudo ao browser.
- Videos podem ser reproduzidos na conversa ou baixados pela mesma rota privada.
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

O Compose deste repositorio gerencia somente o front e entra na rede Docker ja
criada pelo Compose do chatbot. Confirme o nome real da rede na VPS:

```bash
docker network ls
```

Defina esse nome em `CHATBOT_DOCKER_NETWORK` no `.env` e inicie o painel:

```bash
docker compose up -d --build
```

O painel ficará disponível em `http://localhost:3000/admin`.

O health check consulta o PostgreSQL e fica disponivel em:

```text
http://localhost:3000/admin/api/health
```

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
npm run lint
npm run typecheck
npm test
```

Os testes de banco usam `DATABASE_URL` e executam apenas `SELECT`.

## Prisma e migrations

O chatbot e a fonte da verdade do schema do PostgreSQL. Este repositorio contem
somente uma projecao Prisma das tabelas lidas pelo painel.

O CI e o Docker executam apenas `prisma generate`, que gera o client local. Nao
execute neste repositorio `prisma migrate`, `prisma migrate deploy` ou
`prisma db push`.

## CI/CD

O workflow de CI executa lint, verificacao de tipos, testes e um smoke test da
imagem standalone. O smoke test acessa a pagina `/admin` e nao depende do banco
do chatbot. O CI usa `npm run test:unit`; os testes `*.integration.test.ts`
nao sao carregados nem executados no GitHub Actions. Eles continuam reservados
para execucao local em ambientes que tenham acesso ao banco real e fazem
somente leitura.

O CD roda somente depois de um CI bem-sucedido causado por push na `main`. Ele
faz checkout do SHA exato testado no GitHub, envia um arquivo compactado por SCP
e extrai o codigo em `$HOME/front-adm/releases/<SHA>` na VPS. O deploy nao
depende do diretorio inicial do SSH nem exige um clone do repositorio no
servidor. Antes do build, o workflow recria o `.env` com os GitHub Secrets e
permissao `600`. Ao final, `/admin/api/health` confirma a conexao com o banco
real e o link `$HOME/front-adm/current` passa a apontar para a release ativa.

Configuracao esperada na VPS:

- usuario SSH com permissao para criar `$HOME/front-adm` e executar Docker;
- Nginx encaminhando `/admin` para `127.0.0.1:3000`.

Secrets usadas pelo workflow de CD:

- `LIGHTSAIL_HOST`;
- `LIGHTSAIL_USER`;
- `LIGHTSAIL_SSH_KEY`;
- `DATABASE_URL`;
- `SEND_MESSAGE_URL`;
- `UPLOAD_MEDIA_URL`;
- `APPROVE_PROFESSIONAL_URL` (opcional enquanto a aprovacao estiver desativada);
- `MATCHING_LAMBDA_NAME`;
- `CHATBOT_CREATE_PROFESSIONAL_URL`;
- `MATCHING_FOLLOWUP_TEMPLATE_URL`;
- `S3_BUCKET_NAME`;
- `AWS_ACCESS_KEY_ID`;
- `AWS_SECRET_ACCESS_KEY`;
- `AWS_REGION`;
- `CHATBOT_DOCKER_NETWORK`.

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
