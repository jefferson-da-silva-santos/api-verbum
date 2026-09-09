import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdentificadorParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

export class RemoveReacaoService extends AbstractService {
  async execute(req) {
    const { perguntaId, identificador } = this.validateInputs(req.params, schemaIdentificadorParam);

    const existente = await this.repository.findByIdentificador(perguntaId, identificador);
    if (!existente) throw new ApiError(404, API_MESSAGES.REACAO_NOT_FOUND);

    await this.repository.remove(perguntaId, identificador);

    cache.del(`reacoes:contagem:${perguntaId}`);
    logger.info(`${API_MESSAGES.REACAO_REMOVED} (pergunta: ${perguntaId})`);

    return { status: 200, data: { perguntaId: Number(perguntaId) } };
  }
}
