import AbstractService from '../AbstractService.js';
import { schemaCreateSugestaoPergunta } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import logger from '../../utils/logger.js';

// Endpoint público do app: o usuário só manda a pergunta. Ela nasce PENDENTE
// e sem resposta — a revisão (aprovar/responder/rejeitar) acontece fora desta
// API, por outro projeto, que edita o registro via PUT /perguntas/:id.
export class CreateSugestaoPerguntaService extends AbstractService {
  async execute(req) {
    const data = this.validateInputs(req.body, schemaCreateSugestaoPergunta);

    const pergunta = await this.repository.createSugestao(data);
    logger.info(`Pergunta enviada para revisão (id: ${pergunta.id})`);

    return { status: 201, data: { ...pergunta, mensagem: API_MESSAGES.SUGESTAO_CREATED } };
  }
}
