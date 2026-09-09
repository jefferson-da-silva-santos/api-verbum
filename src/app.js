import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.js';
import { rateLimiter } from './middlewares/limiter.js';
import { swaggerOptions } from './config/swagger.js';

// createApp recebe os repositórios já instanciados (injeção de dependência) e
// devolve o app do Express pronto — sem se preocupar com conexão de banco.
export function createApp(repositories) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
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
