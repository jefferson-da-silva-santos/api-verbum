import AbstractRepository from './AbstractRepository.js';

export default class FavoritoRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.favorito);
    this.prisma = prisma;
  }

  async adicionar(perguntaId, identificador) {
    // idempotente: se já existe, não duplica nem dá erro.
    return this.model.upsert({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
      update: {},
      create: { perguntaId: Number(perguntaId), identificador },
    });
  }

  async remover(perguntaId, identificador) {
    return this.model.delete({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
    });
  }

  async existe(perguntaId, identificador) {
    const f = await this.model.findUnique({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
    });
    return !!f;
  }

  // Lista as perguntas favoritadas por um identificador, paginado, mais recentes primeiro.
  async listarPerguntas(identificador, { page, limit }) {
    const skip = (page - 1) * limit;
    const where = { identificador, pergunta: { status: 'PUBLICADA' } };

    const [favoritos, total] = await this.prisma.$transaction([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { pergunta: { include: { referencias: true } } },
      }),
      this.model.count({ where }),
    ]);

    const data = favoritos.map((f) => ({ ...f.pergunta, favoritada: true }));
    return { data, total };
  }
}
