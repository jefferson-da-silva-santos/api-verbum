import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.js';
import { rateLimiter } from './middlewares/limiter.js';
import { swaggerOptions } from './config/swagger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// createApp recebe os repositórios já instanciados (injeção de dependência) e
// devolve o app do Express pronto — sem se preocupar com conexão de banco.
export function createApp(repositories) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Painel admin (arquivos estáticos — login, moderação e "Perguntas & Respostas").
  // Fica FORA de BASE_URL de propósito: a API json continua em /api/v1/...,
  // o painel (HTML/CSS/JS puro, sem build) fica em /admin. Vem ANTES do rate
  // limiter: CSS/JS do painel não devem consumir a cota de requisições (na
  // Vercel eles já são servidos direto pelo CDN, sem passar por aqui).
  app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

  app.use(rateLimiter);

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

  const BASE_URL = process.env.BASE_URL || '/api/v1';
  app.use(BASE_URL, routes(repositories));

  app.use((req, res) => res.status(404).json({ success: false, message: 'Rota não encontrada.' }));
  app.use(errorHandler);

  return app;
}
