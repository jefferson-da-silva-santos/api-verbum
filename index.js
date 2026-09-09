import 'dotenv/config';
import { createApp } from './src/app.js';
import { prisma, connectDatabase } from './src/config/database.js';
import PerguntaRepository from './src/repositories/PerguntaRepository.js';
import ComentarioRepository from './src/repositories/ComentarioRepository.js';
import ReacaoRepository from './src/repositories/ReacaoRepository.js';
import FavoritoRepository from './src/repositories/FavoritoRepository.js';
import LeituraRepository from './src/repositories/LeituraRepository.js';
import logger from './src/utils/logger.js';

async function bootstrap() {
  await connectDatabase();
  logger.info('✅ Database connected!');

  // Injeção de dependência: cada repositório recebe o client do Prisma.
  const perguntaRepository = new PerguntaRepository(prisma);
  const comentarioRepository = new ComentarioRepository(prisma);
  const reacaoRepository = new ReacaoRepository(prisma);
  const favoritoRepository = new FavoritoRepository(prisma);
  const leituraRepository = new LeituraRepository(prisma);

  const repositories = {
    perguntaRepository,
    comentarioRepository,
    reacaoRepository,
    favoritoRepository,
    leituraRepository,
    // próximos repositórios entram aqui
  };

  const app = createApp(repositories);
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
