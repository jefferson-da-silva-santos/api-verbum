import AbstractService from '../AbstractService.js';

export class GetCategoriasService extends AbstractService {
  async execute() {
    const categorias = await this.repository.listCategorias();
    return { status: 200, data: categorias };
  }
}
