import AbstractRepository from './AbstractRepository.js';

// Repositório do módulo de Perguntas. Além do CRUD herdado de AbstractRepository,
// concentra aqui a lógica de persistência específica: criar/atualizar já lidando
// com as referências bíblicas (tabela filha) e a busca textual.
export default class PerguntaRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.pergunta);
    this.prisma = prisma;
  }

  async createWithReferencias({ id, pergunta, resposta, referencias = [], status }) {
    return this.model.create({
      data: {
        ...(id !== undefined ? { id } : {}),
        pergunta,
        resposta,
        status,
        referencias: {
          create: referencias.map((r) => ({
            display: r.display,
            bookSlug: r.bookSlug,
            chapter: r.chapter,
            verse: r.verse ?? null,
          })),
        },
      },
      include: { referencias: true },
    });
  }

  // Envio público: só a pergunta, sempre nasce PENDENTE e sem resposta.
  async createSugestao({ pergunta, autorPergunta }) {
    return this.model.create({
      data: {
        pergunta,
        autorPergunta: autorPergunta || null,
        status: 'PENDENTE',
      },
    });
  }

  // Se `referencias` vier no payload, TODAS as antigas são substituídas pelas novas
  // (dentro de uma transação, para não deixar o registro em estado inconsistente).
  async updateWithReferencias(id, { pergunta, resposta, referencias }) {
    return this.prisma.$transaction(async (tx) => {
      if (referencias) {
        await tx.referencia.deleteMany({ where: { perguntaId: Number(id) } });
      }

      return tx.pergunta.update({
        where: { id: Number(id) },
        data: {
          ...(pergunta !== undefined ? { pergunta } : {}),
          ...(resposta !== undefined ? { resposta } : {}),
          ...(referencias
            ? {
                referencias: {
                  create: referencias.map((r) => ({
                    display: r.display,
                    bookSlug: r.bookSlug,
                    chapter: r.chapter,
                    verse: r.verse ?? null,
                  })),
                },
              }
            : {}),
        },
        include: { referencias: true },
      });
    });
  }

  async getById(id, include = { referencias: true }) {
    return this.model.findUnique({ where: { id: Number(id) }, include });
  }

  // Usado pelas rotas públicas (perguntas, comentários, reações): só enxerga
  // perguntas já aprovadas — pendente/rejeitada não aparece no app.
  async getPublicadaById(id, include = { referencias: true }) {
    return this.model.findFirst({ where: { id: Number(id), status: 'PUBLICADA' }, include });
  }

  // Busca com paginação. `q` pesquisa em pergunta/resposta; `bookSlug` filtra
  // perguntas que citam um livro bíblico específico (ex: "mt"). Só retorna PUBLICADA.
  async search({ q, bookSlug, page, limit }) {
    const where = { status: 'PUBLICADA' };

    if (q) {
      where.OR = [
        { pergunta: { contains: q, mode: 'insensitive' } },
        { resposta: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (bookSlug) {
      where.referencias = { some: { bookSlug } };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // mais recentes primeiro
        include: { referencias: true },
      }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }
}
