import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import logger from '../../utils/logger.js';

export class DeleteComentarioService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);

    const existente = await this.repository.getById(id);
    if (!existente) throw new ApiError(404, API_MESSAGES.COMENTARIO_NOT_FOUND);

    await this.repository.delete(id);
    logger.info(`${API_MESSAGES.COMENTARIO_DELETED} (id: ${id})`);

    return { status: 200, data: { id: Number(id) } };
  }
}
