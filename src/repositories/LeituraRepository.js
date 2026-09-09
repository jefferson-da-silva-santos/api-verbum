import AbstractRepository from './AbstractRepository.js';

export default class LeituraRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.leitura);
    this.prisma = prisma;
  }

  async marcar(perguntaId, identificador) {
    return this.model.upsert({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
      update: {},
      create: { perguntaId: Number(perguntaId), identificador },
    });
  }

  async desmarcar(perguntaId, identificador) {
    return this.model.delete({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
    });
  }

  async existe(perguntaId, identificador) {
    const l = await this.model.findUnique({
      where: { perguntaId_identificador: { perguntaId: Number(perguntaId), identificador } },
    });
    return !!l;
  }
}
