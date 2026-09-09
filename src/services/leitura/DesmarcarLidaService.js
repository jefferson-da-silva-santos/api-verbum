import AbstractService from '../AbstractService.js';
import { schemaIdentificadorParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

export class DesmarcarLidaService extends AbstractService {
  async execute(req) {
    const { perguntaId, identificador } = this.validateInputs(req.params, schemaIdentificadorParam);

    const existe = await this.repository.existe(perguntaId, identificador);
    if (!existe) return { status: 200, data: { perguntaId: Number(perguntaId), mensagem: API_MESSAGES.LEITURA_UNMARKED } };

    await this.repository.desmarcar(perguntaId, identificador);
    return { status: 200, data: { perguntaId: Number(perguntaId), mensagem: API_MESSAGES.LEITURA_UNMARKED } };
  }
}
