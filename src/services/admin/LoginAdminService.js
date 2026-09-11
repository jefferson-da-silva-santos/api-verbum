import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaAdminLogin } from '../../utils/validations.js';
import { API_MESSAGES } from '../../utils/constant.js';
import { getAdminConfig, isAdminLoginConfigured } from '../../config/admin.js';
import logger from '../../utils/logger.js';

// Não recebe repositório (não há tabela de admin ainda — ver src/config/admin.js).
export class LoginAdminService extends AbstractService {
  async execute(req) {
    const { email, senha } = this.validateInputs(req.body, schemaAdminLogin);

    if (!isAdminLoginConfigured()) {
      throw new ApiError(500, API_MESSAGES.ADMIN_LOGIN_NOT_CONFIGURED);
    }

    const adminConfig = getAdminConfig();

    if (email !== adminConfig.email.toLowerCase()) {
      throw new ApiError(401, API_MESSAGES.ADMIN_LOGIN_INVALID);
    }

    const senhaConfere = await bcrypt.compare(senha, adminConfig.passwordHash);
    if (!senhaConfere) {
      throw new ApiError(401, API_MESSAGES.ADMIN_LOGIN_INVALID);
    }

    const token = jwt.sign({ sub: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '12h' });

    logger.info(`Login de admin (${email}) realizado com sucesso.`);

    return { status: 200, data: { token, expiresIn: '12h' } };
  }
}
