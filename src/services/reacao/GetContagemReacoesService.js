import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';

export class GetContagemReacoesService extends AbstractService {
  constructor(reacaoRepository, perguntaRepository) {
    super(reacaoRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);

    const cacheKey = `reacoes:contagem:${perguntaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return { status: 200, data: cached };

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const contagem = await this.repository.contarPorPergunta(perguntaId);
    const data = { perguntaId: Number(perguntaId), ...contagem };

    cache.set(cacheKey, data, 60);
    return { status: 200, data };
  }
}
