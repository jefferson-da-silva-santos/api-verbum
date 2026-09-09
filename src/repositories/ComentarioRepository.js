import AbstractRepository from './AbstractRepository.js';

export default class ComentarioRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.comentario);
    this.prisma = prisma;
  }

  async create({ perguntaId, texto, autor }) {
    return this.model.create({
      data: { perguntaId: Number(perguntaId), texto, autor: autor || null },
    });
  }

  async listByPergunta(perguntaId, { page, limit }) {
    const skip = (page - 1) * limit;
    const where = { perguntaId: Number(perguntaId) };

    const [data, total] = await this.prisma.$transaction([
      this.model.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }

  async update(id, { texto }) {
    return this.model.update({ where: { id: Number(id) }, data: { texto } });
  }
}
