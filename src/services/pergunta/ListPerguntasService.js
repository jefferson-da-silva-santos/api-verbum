import AbstractService from '../AbstractService.js';
import { schemaListQuery } from '../../utils/validations.js';
import { cache } from '../../utils/cache.js';

export class ListPerguntasService extends AbstractService {
  async execute(req) {
    const query = this.validateInputs(req.query, schemaListQuery);
    const { page, limit } = query;

    const cacheKey = `perguntas:list:${JSON.stringify(query)}`;
    const cached = cache.get(cacheKey);
    if (cached) return { status: 200, data: cached.data, meta: cached.meta };

    const { data, total } = await this.repository.search(query);
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    cache.set(cacheKey, { data, meta }, 60); // cache curto de 1 minuto para listagens/buscas
    return { status: 200, data, meta };
  }
}
