import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam, schemaGetPerguntaQuery } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';

export class GetPerguntaService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);
    const { identificador } = this.validateInputs(req.query, schemaGetPerguntaQuery);

    // só cacheia a versão "anônima" (sem favorito/lida de ninguém específico)
    if (!identificador) {
      const cacheKey = `pergunta:${id}`;
      const cached = cache.get(cacheKey);
      if (cached) return { status: 200, data: cached };

      const pergunta = await this.repository.getPublicadaById(id);
      if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

      cache.set(cacheKey, pergunta, 300);
      return { status: 200, data: pergunta };
    }

    const pergunta = await this.repository.getPublicadaById(id);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const enriquecida = await this.repository.anotarEstadoDoUsuario(pergunta, identificador);
    return { status: 200, data: enriquecida };
  }
}
