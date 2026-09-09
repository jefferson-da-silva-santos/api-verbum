import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

export class DeletePerguntaService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);

    const existente = await this.repository.getById(id);
    if (!existente) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    await this.repository.delete(id);

    cache.flushAll();
    logger.info(`${API_MESSAGES.PERGUNTA_DELETED} (id: ${id})`);

    return { status: 200, data: { id: Number(id) } };
  }
}
