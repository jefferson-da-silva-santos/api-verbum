import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam, schemaPaginationQuery } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

export class ListComentariosService extends AbstractService {
  constructor(comentarioRepository, perguntaRepository) {
    super(comentarioRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);
    const { page, limit } = this.validateInputs(req.query, schemaPaginationQuery);

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const { data, total } = await this.repository.listByPergunta(perguntaId, { page, limit });
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    return { status: 200, data, meta };
  }
}
