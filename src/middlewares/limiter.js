import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// Requisições com token de admin VÁLIDO não entram na conta: navegar pelo
// painel (lista → resposta → lista...) faz várias chamadas por tela e
// estourava o limite em poucos minutos. O token é verificado de verdade aqui,
// então um header forjado continua sendo limitado normalmente.
function isAdminAutenticado(req) {
  const header = req.headers.authorization;
  if (!header || !process.env.JWT_SECRET) return false;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// Limita 55 requisições por IP a cada 15 minutos (app público).
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 55,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isAdminAutenticado,
  message: { success: false, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
