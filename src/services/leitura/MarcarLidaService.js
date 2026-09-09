import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam, schemaIdentificadorBody } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

export class MarcarLidaService extends AbstractService {
  constructor(leituraRepository, perguntaRepository) {
    super(leituraRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);
    const { identificador } = this.validateInputs(req.body, schemaIdentificadorBody);

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    await this.repository.marcar(perguntaId, identificador);
    return { status: 200, data: { perguntaId: Number(perguntaId), mensagem: API_MESSAGES.LEITURA_MARKED } };
  }
}
