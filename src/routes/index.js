import { Router } from 'express';
import perguntasRoutes from './perguntas.routes.js';
import comentariosRoutes from './comentarios.routes.js';
import reacoesRoutes from './reacoes.routes.js';
import favoritosRoutes from './favoritos.routes.js';
import leiturasRoutes from './leituras.routes.js';
import adminRoutes from './admin.routes.js';

// Agregador de rotas. Novos módulos entram aqui, cada um recebendo seu próprio
// repositório injetado a partir de `repositories` (montado em src/server.js).
export default function routes(repositories) {
  const router = Router();

  router.use('/perguntas', perguntasRoutes(repositories.perguntaRepository));

  // Comentários, Reações, Favoritos e Leitura já definem o caminho completo
  // internamente (ex: /perguntas/:perguntaId/comentarios), por isso são
  // montados na raiz.
  router.use('/', comentariosRoutes(repositories.comentarioRepository, repositories.perguntaRepository));
  router.use('/', reacoesRoutes(repositories.reacaoRepository, repositories.perguntaRepository));
  router.use('/', favoritosRoutes(repositories.favoritoRepository, repositories.perguntaRepository));
  router.use('/', leiturasRoutes(repositories.leituraRepository, repositories.perguntaRepository));

  // Painel admin (login + moderação de perguntas).
  router.use('/admin', adminRoutes(repositories.perguntaRepository));

  // Próximos módulos, por exemplo:
  // router.use('/usuarios', usuariosRoutes(repositories.usuarioRepository));

  return router;
}

