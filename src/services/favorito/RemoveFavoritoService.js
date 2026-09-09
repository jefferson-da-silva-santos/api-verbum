import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdentificadorParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

export class RemoveFavoritoService extends AbstractService {
  async execute(req) {
    const { perguntaId, identificador } = this.validateInputs(req.params, schemaIdentificadorParam);

    const existe = await this.repository.existe(perguntaId, identificador);
    if (!existe) throw new ApiError(404, API_MESSAGES.FAVORITO_NOT_FOUND);

    await this.repository.remover(perguntaId, identificador);
    return { status: 200, data: { perguntaId: Number(perguntaId), mensagem: API_MESSAGES.FAVORITO_REMOVED } };
  }
}
