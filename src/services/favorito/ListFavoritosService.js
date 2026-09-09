import AbstractService from '../AbstractService.js';
import { ApiError } from '../../utils/error.js';
import { schemaPaginationQuery } from '../../utils/validations.js';
import Joi from 'joi';

const schemaListFavoritosQuery = schemaPaginationQuery.keys({
  identificador: Joi.string().trim().min(1).max(120).required(),
});

export class ListFavoritosService extends AbstractService {
  async execute(req) {
    const { identificador, page, limit } = this.validateInputs(req.query, schemaListFavoritosQuery);
    if (!identificador) throw new ApiError(400, 'Envie "identificador" na query.');

    const { data, total } = await this.repository.listarPerguntas(identificador, { page, limit });
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    return { status: 200, data, meta };
  }
}
