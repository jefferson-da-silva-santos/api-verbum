import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/error.js';

// Middleware de autenticação JWT. Usado pelas rotas de escrita de /perguntas
// (POST, PUT, DELETE) e por tudo em /admin (exceto o login) — ver
// routes/perguntas.routes.js e routes/admin.routes.js.
export function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) throw new ApiError(401, 'Token não informado.');

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Formato do token inválido. Use: Bearer <token>.');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(401, 'Token inválido ou expirado.'));
  }
}
