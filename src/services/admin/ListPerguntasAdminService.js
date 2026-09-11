import AbstractService from '../AbstractService.js';
import { schemaAdminListQuery } from '../../utils/validations.js';

export class ListPerguntasAdminService extends AbstractService {
  async execute(req) {
    const query = this.validateInputs(req.query, schemaAdminListQuery);
    const { page, limit } = query;

    const { data, total } = await this.repository.listAdmin(query);
    const meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };

    return { status: 200, data, meta };
  }
}
