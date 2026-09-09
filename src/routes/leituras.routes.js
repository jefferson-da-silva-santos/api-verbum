import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { MarcarLidaService } from '../services/leitura/MarcarLidaService.js';
import { DesmarcarLidaService } from '../services/leitura/DesmarcarLidaService.js';

export default function leiturasRoutes(leituraRepository, perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /perguntas/{perguntaId}/leitura:
   *   post:
   *     summary: Marca a pergunta como lida pra esse identificador (ela passa a aparecer por último nas listagens dele).
   *     tags: [Leitura]
   */
  router.post('/perguntas/:perguntaId/leitura', (req, res, next) =>
    new GatewayController(new MarcarLidaService(leituraRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/leitura/{identificador}:
   *   delete:
   *     summary: Desmarca a pergunta como lida.
   *     tags: [Leitura]
   */
  router.delete('/perguntas/:perguntaId/leitura/:identificador', (req, res, next) =>
    new GatewayController(new DesmarcarLidaService(leituraRepository)).handle(req, res, next));

  return router;
}
