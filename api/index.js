import 'dotenv/config';
import { buildApp } from '../src/server.js';

// Entrypoint serverless (Vercel). Propositalmente SEM app.listen(): a própria
// Vercel invoca este módulo como um handler (req, res) a cada requisição — um
// app do Express já é uma função (req, res) => void, então exportá-lo direto
// como default é suficiente para o builder @vercel/node.
//
// `buildApp()` roda uma vez por container "quente" da função (o import é
// cacheado pelo Node) e é reaproveitado entre invocações seguintes no mesmo
// container — não recriamos o app nem os repositórios a cada requisição.
const app = buildApp();

export default app;
