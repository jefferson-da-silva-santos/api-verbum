import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaCreatePergunta } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

export class CreatePerguntaService extends AbstractService {
  async execute(req) {
    const data = this.validateInputs(req.body, schemaCreatePergunta);

    if (data.id !== undefined) {
      const existente = await this.repository.getById(data.id);
      if (existente) throw new ApiError(409, API_MESSAGES.PERGUNTA_ALREADY_EXISTS);
    }

    const created = await this.repository.createWithReferencias(data);

    cache.flushAll(); // qualquer listagem/busca em cache fica desatualizada
    logger.info(`${API_MESSAGES.PERGUNTA_CREATED} (id: ${created.id})`);

    return { status: 201, data: created };
  }
}
