import AbstractService from '../AbstractService.js';
import { schemaBulkIds } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { cache } from '../../utils/cache.js';
import logger from '../../utils/logger.js';

// Arquivar = "separar para responder depois" — não aparece no app enquanto
// arquivada, mas continua existindo e pode ser respondida a qualquer momento
// (a partir da mesma tela, reabrindo o editor).
export class ArquivarPerguntasService extends AbstractService {
  async execute(req) {
    const { ids } = this.validateInputs(req.body, schemaBulkIds);

    const resultado = await this.repository.updateManyStatus(ids, 'ARQUIVADA');

    cache.flushAll();
    logger.info(`${API_MESSAGES.ADMIN_PERGUNTAS_ARCHIVED} (ids: ${ids.join(', ')})`);

    return { status: 200, data: { arquivadas: resultado.count } };
  }
}
