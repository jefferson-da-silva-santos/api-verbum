import AbstractRepository from './AbstractRepository.js';

export default class ReacaoRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.reacao);
    this.prisma = prisma;
  }

  // Cria a reação, ou troca o voto se esse "identificador" já reagiu antes
  // (um device/sessão só conta um voto por pergunta).
  async upsert({ perguntaId, tipo, identificador }) {
    return this.model.upsert({
      where: {
        perguntaId_identificador: { perguntaId: Number(perguntaId), identificador },
      },
      update: { tipo },
      create: { perguntaId: Number(perguntaId), tipo, identificador },
    });
  }

  async remove(perguntaId, identificador) {
    return this.model.delete({
      where: {
        perguntaId_identificador: { perguntaId: Number(perguntaId), identificador },
      },
    });
  }

  async findByIdentificador(perguntaId, identificador) {
    return this.model.findUnique({
      where: {
        perguntaId_identificador: { perguntaId: Number(perguntaId), identificador },
      },
    });
  }

  // Contagem de cada tipo de reação para uma pergunta específica.
  async contarPorPergunta(perguntaId) {
    const [esclarecida, duvida] = await this.prisma.$transaction([
      this.model.count({ where: { perguntaId: Number(perguntaId), tipo: 'ESCLARECIDA' } }),
      this.model.count({ where: { perguntaId: Number(perguntaId), tipo: 'DUVIDA' } }),
    ]);
    return { esclarecida, duvida };
  }

  // Ranking: perguntas com mais reações de um tipo (ESCLARECIDA ou DUVIDA), paginado.
  async ranking(tipo, { page, limit }) {
    const skip = (page - 1) * limit;

    const grupos = await this.model.groupBy({
      by: ['perguntaId'],
      where: { tipo },
      _count: { perguntaId: true },
      orderBy: { _count: { perguntaId: 'desc' } },
    });

    const total = grupos.length;
    const pagina = grupos.slice(skip, skip + limit);
    const ids = pagina.map((g) => g.perguntaId);

    if (ids.length === 0) return { data: [], total };

    const perguntas = await this.prisma.pergunta.findMany({
      where: { id: { in: ids }, status: 'PUBLICADA' },
      include: { referencias: true },
    });
    const porId = new Map(perguntas.map((p) => [p.id, p]));

    // reaplica a ordem do ranking (findMany com "in" não garante ordem)
    const data = pagina.map((g) => ({
      ...porId.get(g.perguntaId),
      totalReacoes: g._count.perguntaId,
    }));

    return { data, total };
  }
}
