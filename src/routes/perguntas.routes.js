import { Router } from 'express';
import GatewayController from '../controllers/GatewayController.js';
import { CreatePerguntaService } from '../services/pergunta/CreatePerguntaService.js';
import { CreateSugestaoPerguntaService } from '../services/pergunta/CreateSugestaoPerguntaService.js';
import { ListPerguntasService } from '../services/pergunta/ListPerguntasService.js';
import { GetCategoriasService } from '../services/pergunta/GetCategoriasService.js';
import { GetPerguntaService } from '../services/pergunta/GetPerguntaService.js';
import { UpdatePerguntaService } from '../services/pergunta/UpdatePerguntaService.js';
import { DeletePerguntaService } from '../services/pergunta/DeletePerguntaService.js';
import { auth } from '../middlewares/auth.js'; // agora existe login (ver routes/admin.routes.js)

// Módulo de rotas recebe o repositório por injeção de dependência (padrão Sotov).
export default function perguntasRoutes(perguntaRepository) {
  const router = Router();

  /**
   * @openapi
   * /perguntas/sugestoes:
   *   post:
   *     summary: Envio público (dentro do app) — o usuário manda só a pergunta, que fica PENDENTE até ser revisada fora desta API.
   *     tags: [Perguntas]
   */
  router.post('/sugestoes', (req, res, next) =>
    new GatewayController(new CreateSugestaoPerguntaService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas:
   *   post:
   *     summary: Cadastro completo (admin/importação) — pergunta, resposta e referências, já publicado por padrão. Requer login de admin.
   *     tags: [Perguntas]
   */
  router.post('/', auth, (req, res, next) =>
    new GatewayController(new CreatePerguntaService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas:
   *   get:
   *     summary: Lista/busca perguntas. Suporta ?q=, ?bookSlug=, ?categoria=, ?keyword=, ?identificador= (lidas vão pro final), ?page= e ?limit=.
   *     tags: [Perguntas]
   */
  router.get('/', (req, res, next) =>
    new GatewayController(new ListPerguntasService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/categorias:
   *   get:
   *     summary: Lista as categorias em uso (com contagem) — para montar filtros na UI.
   *     tags: [Perguntas]
   */
  router.get('/categorias', (req, res, next) =>
    new GatewayController(new GetCategoriasService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{id}:
   *   get:
   *     summary: Busca uma única pergunta por id, com referências. Com ?identificador=, inclui favoritada/lida.
   *     tags: [Perguntas]
   */
  router.get('/:id', (req, res, next) =>
    new GatewayController(new GetPerguntaService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{id}:
   *   put:
   *     summary: Atualiza pergunta/resposta/referencias (é o que o painel admin usa pra "responder" — muda status pra PUBLICADA). Se "referencias" vier no corpo, substitui todas. Requer login de admin.
   *     tags: [Perguntas]
   */
  router.put('/:id', auth, (req, res, next) =>
    new GatewayController(new UpdatePerguntaService(perguntaRepository)).handle(req, res, next));

  /**
   * @openapi
   * /perguntas/{id}:
   *   delete:
   *     summary: Remove uma pergunta (e suas referências, em cascata). Requer login de admin.
   *     tags: [Perguntas]
   */
  router.delete('/:id', auth, (req, res, next) =>
    new GatewayController(new DeletePerguntaService(perguntaRepository)).handle(req, res, next));

  return router;
}
