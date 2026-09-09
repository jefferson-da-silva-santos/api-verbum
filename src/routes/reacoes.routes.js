import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { UpsertReacaoService } from '../services/reacao/UpsertReacaoService.js';
import { RemoveReacaoService } from '../services/reacao/RemoveReacaoService.js';
import { GetMinhaReacaoService } from '../services/reacao/GetMinhaReacaoService.js';
import { GetContagemReacoesService } from '../services/reacao/GetContagemReacoesService.js';
import { RankingReacoesService } from '../services/reacao/RankingReacoesService.js';

export default function reacoesRoutes(reacaoRepository, perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /perguntas/{perguntaId}/reacoes:
   *   post:
   *     summary: Registra "Minha dúvida foi esclarecida" (ESCLARECIDA) ou "Ainda tenho dúvidas" (DUVIDA). Troca o voto se o identificador já reagiu.
   *     tags: [Reações]
   */
  router.post('/perguntas/:perguntaId/reacoes', (req, res, next) =>
    new GatewayController(new UpsertReacaoService(reacaoRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/reacoes:
   *   get:
   *     summary: Contagem de reações (esclarecida x dúvida) de uma pergunta.
   *     tags: [Reações]
   */
  router.get('/perguntas/:perguntaId/reacoes', (req, res, next) =>
    new GatewayController(new GetContagemReacoesService(reacaoRepository, perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/reacoes/{identificador}:
   *   get:
   *     summary: Consulta a reação atual de um identificador (para marcar o botão certo na UI).
   *     tags: [Reações]
   */
  router.get('/perguntas/:perguntaId/reacoes/:identificador', (req, res, next) =>
    new GatewayController(new GetMinhaReacaoService(reacaoRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{perguntaId}/reacoes/{identificador}:
   *   delete:
   *     summary: Remove o voto de um identificador (desfazer reação).
   *     tags: [Reações]
   */
  router.delete('/perguntas/:perguntaId/reacoes/:identificador', (req, res, next) =>
    new GatewayController(new RemoveReacaoService(reacaoRepository)).handle(req, res, next));

  /**
   * @openapi
   * /reacoes/ranking/esclarecidas:
   *   get:
   *     summary: Perguntas com mais reações "Minha dúvida foi esclarecida" (mais likes).
   *     tags: [Reações]
   */
  router.get('/reacoes/ranking/esclarecidas', (req, res, next) =>
    new GatewayController(new RankingReacoesService(reacaoRepository, 'ESCLARECIDA')).handle(req, res, next));

  /**
   * @openapi
   * /reacoes/ranking/duvidas:
   *   get:
   *     summary: Perguntas com mais reações "Ainda tenho dúvidas" (mais deslikes).
   *     tags: [Reações]
   */
  router.get('/reacoes/ranking/duvidas', (req, res, next) =>
    new GatewayController(new RankingReacoesService(reacaoRepository, 'DUVIDA')).handle(req, res, next));

  return router;
}
