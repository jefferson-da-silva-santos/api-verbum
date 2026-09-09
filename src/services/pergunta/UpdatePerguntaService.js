import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam, schemaUpdatePergunta } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

export class UpdatePerguntaService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);
    const data = this.validateInputs(req.body, schemaUpdatePergunta);

    const existente = await this.repository.getById(id);
    if (!existente) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const updated = await this.repository.updateWithReferencias(id, data);

    cache.flushAll();
    logger.info(`${API_MESSAGES.PERGUNTA_UPDATED} (id: ${id})`);

    return { status: 200, data: updated };
  }
}
