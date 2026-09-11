import 'dotenv/config';
import { buildApp } from './src/server.js';
import { connectDatabase } from './src/config/database.js';
import logger from './src/utils/logger.js';

// Entrypoint do servidor tradicional (uso local, ou qualquer host que rode
// `node index.js` continuamente — não é usado pela Vercel, que usa
// api/index.js). Aqui faz sentido tentar conectar e falhar rápido no boot.
async function bootstrap() {
  await connectDatabase();
  logger.info('✅ Database connected!');

  const app = buildApp();
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    logger.info(`Servidor rodando em http://localhost:${PORT}`);
    logger.info(`Documentação (Swagger) em http://localhost:${PORT}/docs`);
  });
}

bootstrap().catch((err) => {
  logger.error(`Erro ao iniciar o servidor: ${err.message}`);
  process.exit(1);
});
