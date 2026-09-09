// Repositório base com as operações CRUD genéricas via Prisma.
// Todo repositório novo deve estender esta classe e injetar seu "model" do Prisma
// (ex: prisma.pergunta) via super(model).
export default class AbstractRepository {
  constructor(model) {
    this.model = model; // delegate do Prisma Client (ex: prisma.pergunta)
  }

  async create(data) {
    return this.model.create({ data });
  }

  async findAll({ where = {}, include, orderBy, skip, take } = {}) {
    return this.model.findMany({ where, include, orderBy, skip, take });
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async getOne(where, include) {
    return this.model.findFirst({ where, include });
  }

  async getById(id, include) {
    return this.model.findUnique({ where: { id: Number(id) }, include });
  }

  async update(id, data) {
    return this.model.update({ where: { id: Number(id) }, data });
  }

  async delete(id) {
    return this.model.delete({ where: { id: Number(id) } });
  }
}
