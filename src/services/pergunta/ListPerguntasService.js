import AbstractService from '../AbstractService.js';
import { schemaListQuery } from '../../utils/validations.js';
import { cache } from '../../utils/cache.js';

export class ListPerguntasService extends AbstractService {
  async execute(req) {
    const query = this.validateInputs(req.query, schemaListQuery);
    const { page, limit } = query;

    // listagens "personalizadas" (com identificador — favorito/lida) não vão pro
    // cache compartilhado, senão um usuário veria o estado de leitura de outro.
    const cacheKey = query.identificador ? null : `perguntas:list:${JSON.stringify(query)}`;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return { status: 200, data: cached.data, meta: cached.meta };
    }

    const { data, total } = await this.repository.search(query);
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    if (cacheKey) cache.set(cacheKey, { data, meta }, 60);
    return { status: 200, data, meta };
  }
}
