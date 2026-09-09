import { Router } from 'express';
import perguntasRoutes from './perguntas.routes.js';
import comentariosRoutes from './comentarios.routes.js';
import reacoesRoutes from './reacoes.routes.js';

// Agregador de rotas. Novos módulos entram aqui, cada um recebendo seu próprio
// repositório injetado a partir de `repositories` (montado no index.js raiz).
export default function routes(repositories) {
  const router = Router();

  router.use('/perguntas', perguntasRoutes(repositories.perguntaRepository));

  // Comentários e Reações já definem o caminho completo internamente
  // (ex: /perguntas/:perguntaId/comentarios), por isso são montados na raiz.
  router.use('/', comentariosRoutes(repositories.comentarioRepository, repositories.perguntaRepository));
  router.use('/', reacoesRoutes(repositories.reacaoRepository, repositories.perguntaRepository));

  // Próximos módulos, por exemplo:
  // router.use('/usuarios', usuariosRoutes(repositories.usuarioRepository));

  return router;
}
