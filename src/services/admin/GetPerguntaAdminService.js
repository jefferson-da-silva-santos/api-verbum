import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaIdParam } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

// Detalhe de uma pergunta para o painel admin. Diferente do GET /perguntas/:id
// público, enxerga qualquer status (pendente, arquivada...) e já traz o
// engajamento: contagens, reações por tipo e os comentários mais recentes.
// Sem cache: o admin precisa ver o estado atual logo depois de editar.
export class GetPerguntaAdminService extends AbstractService {
  async execute(req) {
    const { id } = this.validateInputs(req.params, schemaIdParam);

    const pergunta = await this.repository.getAdminDetalhe(id);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    return { status: 200, data: pergunta };
  }
}
