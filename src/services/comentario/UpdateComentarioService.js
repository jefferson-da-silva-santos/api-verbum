import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam, schemaUpdateComentario } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import logger from '../../utils/logger.js';

export class UpdateComentarioService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);
    const data = this.validateInputs(req.body, schemaUpdateComentario);

    const existente = await this.repository.getById(id);
    if (!existente) throw new ApiError(404, API_MESSAGES.COMENTARIO_NOT_FOUND);

    const updated = await this.repository.update(id, data);
    logger.info(`${API_MESSAGES.COMENTARIO_UPDATED} (id: ${id})`);

    return { status: 200, data: updated };
  }
}
