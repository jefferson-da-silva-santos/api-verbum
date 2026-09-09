import AbstractService from '../AbstractService.js';
import { schemaIdentificadorParam } from '../../utils/validations.js';

export class GetMinhaReacaoService extends AbstractService {
  async execute(req) {
    const { perguntaId, identificador } = this.validateInputs(req.params, schemaIdentificadorParam);
    const reacao = await this.repository.findByIdentificador(perguntaId, identificador);

    return { status: 200, data: { tipo: reacao?.tipo ?? null } };
  }
}
