import AbstractService from '../AbstractService.js';
import { schemaPaginationQuery } from '../../utils/validations.js';
import { cache } from '../../utils/cache.js';

// Um único Service serve os dois rankings — o "tipo" (ESCLARECIDA ou DUVIDA)
// é definido na hora em que a rota instancia o Service (não vem do request).
export class RankingReacoesService extends AbstractService {
  constructor(reacaoRepository, tipo) {
    super(reacaoRepository);
    this.tipo = tipo;
  }

  async execute(req) {
    const { page, limit } = this.validateInputs(req.query, schemaPaginationQuery);

    const cacheKey = `reacoes:ranking:${this.tipo}:${page}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return { status: 200, data: cached.data, meta: cached.meta };

    const { data, total } = await this.repository.ranking(this.tipo, { page, limit });
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    cache.set(cacheKey, { data, meta }, 60);
    return { status: 200, data, meta };
  }
}
