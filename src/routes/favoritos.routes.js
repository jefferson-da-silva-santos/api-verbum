import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { AddFavoritoService } from '../services/favorito/AddFavoritoService.js';
import { RemoveFavoritoService } from '../services/favorito/RemoveFavoritoService.js';
import { ListFavoritosService } from '../services/favorito/ListFavoritosService.js';

export default function favoritosRoutes(favoritoRepository, perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /perguntas/{perguntaId}/favoritos:
   *   post:
   *     summary: Adiciona a pergunta aos favoritos do identificador enviado.
   *     tags: [Favoritos]
   */
  router.post('/perguntas/:perguntaId/favoritos', (req, res, next) =>
    new GatewayController(new AddFavoritoService(favoritoRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/favoritos/{identificador}:
   *   delete:
   *     summary: Remove a pergunta dos favoritos desse identificador.
   *     tags: [Favoritos]
   */
  router.delete('/perguntas/:perguntaId/favoritos/:identificador', (req, res, next) =>
    new GatewayController(new RemoveFavoritoService(favoritoRepository)).handle(req, res, next));

  /**
   * @openapi
   * /favoritos:
   *   get:
   *     summary: Lista as perguntas favoritadas por um identificador (?identificador= obrigatório, paginado).
   *     tags: [Favoritos]
   */
  router.get('/favoritos', (req, res, next) =>
    new GatewayController(new ListFavoritosService(favoritoRepository)).handle(req, res, next));

  return router;
}
