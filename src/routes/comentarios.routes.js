import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { CreateComentarioService } from '../services/comentario/CreateComentarioService.js';
import { ListComentariosService } from '../services/comentario/ListComentariosService.js';
import { UpdateComentarioService } from '../services/comentario/UpdateComentarioService.js';
import { DeleteComentarioService } from '../services/comentario/DeleteComentarioService.js';

// Comentários vivem "dentro" de uma pergunta (criação e listagem), mas
// update/delete são identificados pelo próprio id do comentário.
export default function comentariosRoutes(comentarioRepository, perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /perguntas/{perguntaId}/comentarios:
   *   post:
   *     summary: Adiciona um comentário a uma pergunta.
   *     tags: [Comentários]
   */
  router.post('/perguntas/:perguntaId/comentarios', (req, res, next) =>
    new GatewayController(new CreateComentarioService(comentarioRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/comentarios:
   *   get:
   *     summary: Lista os comentários de uma pergunta (paginado, mais recentes primeiro).
   *     tags: [Comentários]
   */
  router.get('/perguntas/:perguntaId/comentarios', (req, res, next) =>
    new GatewayController(new ListComentariosService(comentarioRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /comentarios/{id}:
   *   put:
   *     summary: Atualiza o texto de um comentário.
   *     tags: [Comentários]
   */
  router.put('/comentarios/:id', (req, res, next) =>
    new GatewayController(new UpdateComentarioService(comentarioRepository)).handle(req, res, next));

  /**
   * @openapi
   * /comentarios/{id}:
   *   delete:
   *     summary: Remove um comentário.
   *     tags: [Comentários]
   */
  router.delete('/comentarios/:id', (req, res, next) =>
    new GatewayController(new DeleteComentarioService(comentarioRepository)).handle(req, res, next));

  return router;
}
