import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam, schemaCreateReacao } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

// Registra "Minha dúvida foi esclarecida" (ESCLARECIDA) ou "Ainda tenho dúvidas" (DUVIDA).
// Se o mesmo "identificador" já tinha reagido àquela pergunta, o voto é substituído.
export class UpsertReacaoService extends AbstractService {
  constructor(reacaoRepository, perguntaRepository) {
    super(reacaoRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);
    const { tipo, identificador } = this.validateInputs(req.body, schemaCreateReacao);

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const reacao = await this.repository.upsert({ perguntaId, tipo, identificador });

    cache.del(`reacoes:contagem:${perguntaId}`);
    logger.info(`${API_MESSAGES.REACAO_SAVED} (pergunta: ${perguntaId}, tipo: ${tipo})`);

    return { status: 200, data: reacao };
  }
}
