import logger from '../utils/logger.js';

// Middleware global de erros. Deve ser o ÚLTIMO carregado no app.js.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${message}`);
  }

  return res.status(status).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}
