import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPerguntaIdParam, schemaIdentificadorBody } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';

export class AddFavoritoService extends AbstractService {
  constructor(favoritoRepository, perguntaRepository) {
    super(favoritoRepository);
    this.perguntaRepository = perguntaRepository;
  }

  async execute(req) {
    const { perguntaId } = this.validateInputs(req.params, schemaPerguntaIdParam);
    const { identificador } = this.validateInputs(req.body, schemaIdentificadorBody);

    const pergunta = await this.perguntaRepository.getPublicadaById(perguntaId);
    if (!pergunta) throw new ApiError(404, API_MESSAGES.PERGUNTA_NOT_FOUND);

    const favorito = await this.repository.adicionar(perguntaId, identificador);
    return { status: 200, data: { ...favorito, mensagem: API_MESSAGES.FAVORITO_ADDED } };
  }
}
