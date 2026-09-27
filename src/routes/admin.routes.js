import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { LoginAdminService } from '../services/admin/LoginAdminService.js';
import { ListPerguntasAdminService } from '../services/admin/ListPerguntasAdminService.js';
import { ArquivarPerguntasService } from '../services/admin/ArquivarPerguntasService.js';
import { DeletarPerguntasService } from '../services/admin/DeletarPerguntasService.js';
import { GetPerguntaAdminService } from '../services/admin/GetPerguntaAdminService.js';
import { auth } from '../middlewares/auth.js';

// Rotas do painel admin. Responder/aceitar uma pergunta pendente continua
// sendo o PUT /perguntas/:id de sempre (agora atrás de `auth` também) — aqui
// só ficam login e as ações que só fazem sentido no contexto do painel:
// listar todos os status e agir em lote sobre várias perguntas selecionadas.
export default function adminRoutes(perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /admin/login:
   *   post:
   *     summary: Login do admin (e-mail + senha configurados via ADMIN_EMAIL/ADMIN_PASSWORD_HASH). Devolve um token JWT.
   *     tags: [Admin]
   */
  router.post('/login', (req, res, next) =>
    new GatewayController(new LoginAdminService(null)).handle(req, res, next));

  // Tudo abaixo daqui exige `Authorization: Bearer <token>`.
  router.use(auth);

  /**
   * @openapi
   * /admin/perguntas:
   *   get:
   *     summary: Lista perguntas de TODOS os status (painel de moderação e biblioteca). Suporta ?status=, ?q=, ?categoria=, ?ordem=antigas|recentes, ?page=, ?limit=.
   *     tags: [Admin]
   */
  router.get('/perguntas', (req, res, next) =>
    new GatewayController(new ListPerguntasAdminService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /admin/perguntas/{id}:
   *   get:
   *     summary: Detalhe de uma pergunta (qualquer status) com referências, contagens de engajamento, reações por tipo e últimos comentários.
   *     tags: [Admin]
   */
  router.get('/perguntas/:id', (req, res, next) =>
    new GatewayController(new GetPerguntaAdminService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /admin/perguntas/arquivar:
   *   patch:
   *     summary: Arquiva em lote (separa pra responder depois). Corpo — ids (array de números).
   *     tags: [Admin]
   */
  router.patch('/perguntas/arquivar', (req, res, next) =>
    new GatewayController(new ArquivarPerguntasService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /admin/perguntas:
   *   delete:
   *     summary: Exclui em lote (descartar). Corpo — ids (array de números). Requer confirmação no painel antes de chamar.
   *     tags: [Admin]
   */
  router.delete('/perguntas', (req, res, next) =>
    new GatewayController(new DeletarPerguntasService(perguntaRepository)).handle(req, res, next));

  return router;
}
