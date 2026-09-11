import 'dotenv/config';
import { buildApp } from '../src/server.js';

// Entrypoint serverless (Vercel). Propositalmente SEM app.listen(): a própria
// Vercel invoca este módulo como um handler (req, res) a cada requisição.
//
// `buildApp()` roda uma vez por container "quente" da função (o import é
// cacheado pelo Node) e é reaproveitado entre invocações seguintes no mesmo
// container — não recriamos o app nem os repositórios a cada requisição.
const app = buildApp();

// Exportamos uma função simples que delega pro Express, em vez do app direto.
// Um app do Express já é tecnicamente uma função (req, res) => void, mas
// embrulhar assim deixa 100% inequívoco pro builder da Vercel que o default
// export é "uma função", sem depender de como ele inspeciona o objeto app.
export default function handler(req, res) {
  return app(req, res);
}

