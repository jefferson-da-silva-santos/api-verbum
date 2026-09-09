import rateLimit from 'express-rate-limit';

// Limita 55 requisições por IP a cada 15 minutos.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 55,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
