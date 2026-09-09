import { ApiError } from '../utils/error.js';

// Service base: todo Service deve estender esta classe e implementar execute(req).
// O construtor recebe o Repository (Injeção de Dependência), assim a lógica de
// negócio nunca fala diretamente com o Prisma.
export default class AbstractService {
  constructor(repository) {
    this.repository = repository;
  }

  // Valida um payload contra um schema Joi e já lança ApiError(422) em caso de falha.
  validateInputs(payload, schema) {
    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message);
      throw new ApiError(422, details.join(' | '), details);
    }

    return value;
  }

  async execute() {
    throw new ApiError(501, 'Método execute() não implementado neste Service.');
  }
}
