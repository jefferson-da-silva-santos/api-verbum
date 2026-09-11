# 📖 Verbum API

API do app **Verbum**, construída em **Node.js + Express**, seguindo a arquitetura do **framework Sotov** (padrão Factory + Injeção de Dependência), mas com **Prisma + Neon PostgreSQL** no lugar do Sequelize.

Este é o **módulo inicial: Perguntas & Respostas bíblicas**. Novos módulos (ex: versículos, usuários, favoritos) entram na mesma estrutura, cada um com seu próprio Repository → Service → Controller → Rotas.

---

## 📦 Instalação

```bash
npm install
```

## ⚙️ Configuração

1. Copie o `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
2. No painel da [Neon](https://neon.tech), copie a **connection string** do seu projeto/banco e cole em `DATABASE_URL` (mantenha `?sslmode=require` no final).
3. No painel da [Neon](https://neon.tech), aba **Connect**, ligue o toggle **"Connection pooling"** e copie essa URL (host termina em `-pooler`) pra `DATABASE_URL`. Copie também a versão sem pooling pra `DIRECT_URL` (mantenha `?sslmode=require` em ambas).
4. Ajuste `JWT_SECRET`, `PORT` e `BASE_URL` se quiser.

> ⚠️ **Se aparecer `Error in PostgreSQL connection: Error { kind: Closed, cause: None }`**: é a Neon derrubando uma conexão direta ociosa (o compute dela hiberna sozinho após alguns minutos sem uso — normal no plano free). A correção é usar a URL **com pooling** (`-pooler`) em `DATABASE_URL`, como acima — o pgbouncer da Neon reabre a conexão sozinho a cada request. `DIRECT_URL` continua sem pooling porque `prisma migrate`/`prisma studio` não funcionam através do pgbouncer.

## 🗄️ Banco de dados (Prisma + Neon)

```bash
# gera o client do Prisma
npm run prisma:generate

# cria as tabelas no banco (perguntas, referencias)
npm run prisma:migrate

# importa o JSON de perguntas/respostas/referências para o Postgres
npm run seed
```

O `npm run seed` lê `data/perguntas_respostas_com_referencias.json` (309 perguntas já com as referências bíblicas extraídas) e faz um `upsert` de cada uma — pode rodar quantas vezes quiser, sem duplicar.

## 💻 Rodando o servidor

```bash
npm run dev     # com reload automático (nodemon)
# ou
npm start
```

> Servidor rodando em `http://localhost:3000`
> Documentação (Swagger) em `http://localhost:3000/docs`
> ✅ Database connected!

## 🧪 Testes

```bash
npm test
```

---

## ☁️ Deploy na Vercel

A API roda na Vercel como função serverless. A estrutura já está pronta:

- **`api/index.js`** é o entrypoint que a Vercel executa — exporta o app do Express direto, sem `app.listen()` (quem cuida do ciclo de vida da requisição é a própria Vercel).
- **`index.js`** (raiz) continua existindo só para rodar localmente com `npm run dev`/`npm start` (servidor tradicional, com `app.listen()`).
- **`vercel.json`** redireciona todas as rotas (`/health`, `/docs`, `/api/v1/...`) para essa mesma função.

### Passo a passo

1. Suba o repositório no GitHub/GitLab/Bitbucket e importe o projeto na Vercel (ou rode `vercel` pela CLI a partir desta pasta).
2. Em **Project Settings → Environment Variables**, cadastre (mesmas chaves do `.env.example`):
   - `DATABASE_URL` — connection string da Neon **com pooling** (host termina em `-pooler`). Essencial: sem pooling, funções serverless esgotam as conexões do Postgres rapidinho, porque cada invocação pode abrir uma conexão nova.
   - `DIRECT_URL` — connection string da Neon **sem pooling** (usada só por `prisma migrate`, que você roda localmente ou em CI, não na Vercel).
   - `JWT_SECRET`
   - `BASE_URL` (opcional, padrão `/api/v1`)
   - `NODE_ENV=production`
3. Rode as migrations contra o banco de produção **de fora da Vercel** (localhost ou CI), usando a `DIRECT_URL`:
   ```bash
   npx prisma migrate deploy
   ```
4. Deploy. O `postinstall` do `package.json` roda `prisma generate` automaticamente a cada deploy — não precisa configurar Build Command manual.

### Limitações a ter em mente

- **Rate limit por instância**: o `express-rate-limit` guarda os contadores em memória. Em serverless, cada instância "quente" da função tem sua própria memória — sob alta concorrência, o limite de 55 req/15min é por instância, não global. Funciona bem como salvaguarda básica; se precisar de um limite realmente global, dá pra trocar o store por Redis (ex: Upstash) depois.
- **Cold start**: a primeira requisição depois de um tempo parado pode demorar um pouco mais (Prisma conectando pela primeira vez + a Neon "acordando" o compute, se estiver hibernado).

---

## 📂 Estrutura de diretórios


| Diretório | Descrição |
| :--- | :--- |
| `prisma/` | `schema.prisma` (models) e `seed.js` (importação do JSON) |
| `data/` | JSON de origem usado pelo seed |
| `src/config` | Conexão com o banco (`database.js`) e Swagger |
| `src/controllers` | `GatewayController` — padroniza toda resposta HTTP |
| `src/middlewares` | `auth` (JWT), `error` (handler global), `limiter` (rate limit) |
| `src/repositories` | `AbstractRepository` (CRUD genérico via Prisma) + repositórios de cada módulo |
| `src/services` | `AbstractService` + lógica de negócio de cada módulo (ex: `services/pergunta`) |
| `src/routes` | Um arquivo de rotas por módulo + `index.js` agregador |
| `src/utils` | `ApiError`, `logger` (winston), `cache` (node-cache), `validations` (Joi), `constant` |
| `test/` | Testes (Jest + Supertest) |
| `app.js` | Monta o Express (middlewares globais, Swagger, rotas, error handler) |
| `src/server.js` | Monta os repositórios (DI) e devolve o app pronto — usado por `index.js` e por `api/index.js` |
| `index.js` | Entrypoint do servidor tradicional (local): conecta no banco, sobe o app com `app.listen()` |
| `api/index.js` | Entrypoint serverless da **Vercel**: exporta o app direto, sem `app.listen()` |

### 🧠 Injeção de dependência

```javascript
// src/server.js
const perguntaRepository = new PerguntaRepository(prisma);
const app = createApp({ perguntaRepository }); // injetado até as rotas
```

---

## 🔌 Rotas — módulo Favoritos

Sem login ainda, então favoritos também são por **`identificador`** (o mesmo id local usado em reações/leitura).

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/perguntas/:perguntaId/favoritos` | favorita — body: `{ "identificador": "..." }` |
| `DELETE` | `/perguntas/:perguntaId/favoritos/:identificador` | desfavorita |
| `GET` | `/favoritos?identificador=...` | lista os favoritos desse identificador, paginado, mais recentes primeiro |

## 🔌 Rotas — módulo Leitura ("Já vi")

Marcar uma pergunta como lida não é público — só afeta a ordem que **aquele
identificador** vê nas listagens: perguntas lidas vão pro final (sem sumir,
só perdem prioridade), o que acontece automaticamente quando `GET /perguntas`
é chamado com `?identificador=`.

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/perguntas/:perguntaId/leitura` | marca como lida — body: `{ "identificador": "..." }` |
| `DELETE` | `/perguntas/:perguntaId/leitura/:identificador` | desmarca (volta a aparecer na posição normal) |

## 🔌 Rotas — módulo Comentários

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/perguntas/:perguntaId/comentarios` | adiciona um comentário à pergunta |
| `GET` | `/perguntas/:perguntaId/comentarios` | lista comentários (paginado, mais recentes primeiro) |
| `PUT` | `/comentarios/:id` | atualiza o texto de um comentário |
| `DELETE` | `/comentarios/:id` | remove um comentário |

```bash
curl -X POST http://localhost:3000/api/v1/perguntas/1/comentarios \
  -H "Content-Type: application/json" \
  -d '{ "texto": "Esse estudo me ajudou muito!", "autor": "Jefferson" }'
```

## 🔌 Rotas — módulo Reações (like / deslike)

"Minha dúvida foi esclarecida" = `ESCLARECIDA` (like) · "Ainda tenho dúvidas" = `DUVIDA` (deslike).

Como ainda não existe módulo de usuários/login, cada voto é identificado por um
**`identificador`** enviado pelo cliente (ex: um id de dispositivo/sessão gerado no app).
Isso permite trocar o voto depois, sem duplicar reações.

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/perguntas/:perguntaId/reacoes` | registra/troca o voto — body: `{ "tipo": "ESCLARECIDA" \| "DUVIDA", "identificador": "..." }` |
| `GET` | `/perguntas/:perguntaId/reacoes` | contagem `{ esclarecida, duvida }` da pergunta |
| `GET` | `/perguntas/:perguntaId/reacoes/:identificador` | qual foi a reação desse identificador (`{ tipo: "ESCLARECIDA" \| "DUVIDA" \| null }`) — útil pra marcar o botão certo na UI |
| `DELETE` | `/perguntas/:perguntaId/reacoes/:identificador` | desfaz o voto daquele identificador |
| `GET` | `/reacoes/ranking/esclarecidas` | perguntas com **mais likes** (mais "esclarecida"), paginado |
| `GET` | `/reacoes/ranking/duvidas` | perguntas com **mais deslikes** (mais "dúvida"), paginado |

```bash
curl -X POST http://localhost:3000/api/v1/perguntas/1/reacoes \
  -H "Content-Type: application/json" \
  -d '{ "tipo": "ESCLARECIDA", "identificador": "device-123" }'

curl "http://localhost:3000/api/v1/reacoes/ranking/esclarecidas?page=1&limit=10"
curl "http://localhost:3000/api/v1/reacoes/ranking/duvidas"
```

## 🔌 Rotas — módulo Perguntas

Prefixo padrão: `/api/v1` (configurável via `BASE_URL` no `.env`)

Toda pergunta tem um `status`: **PENDENTE** (enviada pelo app, aguardando revisão — não aparece pra ninguém), **PUBLICADA** (aprovada, visível no app) ou **REJEITADA** (descartada). As rotas públicas (`GET /perguntas`, `GET /perguntas/:id`, comentários e reações) só enxergam perguntas `PUBLICADA`. A revisão (aprovar, responder, rejeitar) acontece **fora desta API**, em outro projeto, que atualiza o registro via `PUT /perguntas/:id` (mandando `resposta`, `referencias` e `status: "PUBLICADA"`, por exemplo).

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/perguntas/sugestoes` | **envio público** — usuário manda só `{ pergunta, autorPergunta? }`; nasce `PENDENTE`, sem resposta |
| `POST` | `/perguntas` | cadastro completo (admin/importação) — pergunta + resposta + referências + categoria + palavrasChave, nasce `PUBLICADA` por padrão |
| `GET` | `/perguntas` | lista/busca (só `PUBLICADA`) — `?q=`, `?bookSlug=`, `?categoria=`, `?keyword=`, `?identificador=` (perguntas já lidas por ele vão pro final), `?page=`, `?limit=`, mais recentes primeiro |
| `GET` | `/perguntas/categorias` | categorias em uso, com contagem — pra montar filtros na UI |
| `GET` | `/perguntas/:id` | busca uma pergunta (só `PUBLICADA`). Com `?identificador=`, inclui `favoritada`/`lida` |
| `PUT` | `/perguntas/:id` | atualiza pergunta/resposta/categoria/palavrasChave/referencias/**status** — é assim que a revisão externa aprova/rejeita |
| `DELETE` | `/perguntas/:id` | remove uma pergunta |

### Exemplo — filtrar por categoria e palavra-chave

```bash
curl "http://localhost:3000/api/v1/perguntas?categoria=Escatologia"
curl "http://localhost:3000/api/v1/perguntas?keyword=jejum"
curl "http://localhost:3000/api/v1/perguntas/categorias"
```

### Exemplo — usuário envia uma pergunta pelo app

```bash
curl -X POST http://localhost:3000/api/v1/perguntas/sugestoes \
  -H "Content-Type: application/json" \
  -d '{ "pergunta": "Posso orar em qualquer lugar?", "autorPergunta": "Jefferson" }'
# -> { "success": true, "data": { "id": 310, "status": "PENDENTE", "resposta": null, ... } }
```

### Exemplo — criar

```bash
curl -X POST http://localhost:3000/api/v1/perguntas \
  -H "Content-Type: application/json" \
  -d '{
    "pergunta": "O que é a graça de Deus?",
    "resposta": "A graça é o favor imerecido de Deus para com o homem (Ef 2.8,9).",
    "referencias": [
      { "display": "Ef 2.8,9", "bookSlug": "ef", "chapter": 2, "verse": 8 }
    ]
  }'
```

### Exemplo — buscar por texto e por livro citado

```bash
curl "http://localhost:3000/api/v1/perguntas?q=graça&page=1&limit=10"
curl "http://localhost:3000/api/v1/perguntas?bookSlug=jo"
```

### Formato de resposta (padrão em todas as rotas)

```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": { "page": 1, "limit": 20, "total": 309, "totalPages": 16 }
}
```

Erros seguem o mesmo padrão, trocando `data`/`meta` por `message`:

```json
{ "success": false, "message": "Pergunta não encontrada." }
```

---

## 🧭 Como adicionar um novo módulo

Siga o mesmo caminho do módulo de perguntas:

1. **`prisma/schema.prisma`** — adicione o novo `model` e rode `prisma migrate dev`.
2. **Repository** — crie `src/repositories/NovoRepository.js` estendendo `AbstractRepository`.
3. **Services** — crie `src/services/novo/*.js` estendendo `AbstractService`.
4. **Rotas** — crie `src/routes/novo.routes.js` recebendo o repositório por parâmetro.
5. **Integração** — registre em `src/routes/index.js`:
   ```javascript
   router.use('/novo', novoRoutes(repositories.novoRepository));
   ```
   E injete o repositório em `src/server.js`, junto de `perguntaRepository`.

---

## 📝 Licença



  
MIT

---

Feito com 💪, precisão de mira e café forte ☕ — arquitetura inspirada no [Sotov Framework](https://www.npmjs.com/package/sotov), de **Jefferson Dev**.
