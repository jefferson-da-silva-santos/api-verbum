import AbstractService from '../AbstractService.js';
import { schemaBulkIds } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

// Descartar = excluir de verdade (a confirmação de "tem certeza?" acontece no
// painel, antes de chamar esta rota — aqui já executa direto).
export class DeletarPerguntasService extends AbstractService {
  async execute(req) {
    const { ids } = this.validateInputs(req.body, schemaBulkIds);

    const resultado = await this.repository.deleteMany(ids);

    cache.flushAll();
    logger.info(`${API_MESSAGES.ADMIN_PERGUNTAS_DELETED} (ids: ${ids.join(', ')})`);

    return { status: 200, data: { excluidas: resultado.count } };
  }
}
