// Erro customizado para padronizar exceções de negócio e o status HTTP retornado ao cliente.
export class ApiError extends Error {
  constructor(status = 500, message = 'Erro interno do servidor', details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    if (Error.captureStackTrace) Error.captureStackTrace(this, ApiError);
  }
}
