import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam, schemaCreateComentario } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import logger from '../../utils/logger.js';

// Recebe o repositório de comentários E o de perguntas (para checar se a pergunta existe).
export class CreateComentarioService extends AbstractService {
  constructor(comentarioRepository, perguntaRepository) {
    super(comentarioRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);
    const data = this.validateInputs(req.body, schemaCreateComentario);

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const comentario = await this.repository.create({ perguntaId, ...data });
    logger.info(`${API_MESSAGES.COMENTARIO_CREATED} (pergunta: ${perguntaId}, comentario: ${comentario.id})`);

    return { status: 201, data: comentario };
  }
}
