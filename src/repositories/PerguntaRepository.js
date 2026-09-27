import AbstractRepository from './AbstractRepository.js';

// Repositório do módulo de Perguntas. Além do CRUD herdado de AbstractRepository,
// concentra aqui a lógica de persistência específica: criar/atualizar já lidando
// com as referências bíblicas (tabela filha), a busca textual/categoria/palavra-chave,
// e o enriquecimento com favorito/leitura de um identificador específico.
export default class PerguntaRepository extends AbstractRepository {
  constructor(prisma) {
    super(prisma.pergunta);
    this.prisma = prisma;
  }

  async createWithReferencias({ id, pergunta, resposta, categoria, palavrasChave = [], referencias = [], status, autorPergunta }) {
    return this.model.create({
      data: {
        ...(id !== undefined ? { id } : {}),
        pergunta,
        resposta,
        autorPergunta: autorPergunta || null,
        categoria: categoria || null,
        palavrasChave,
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
  async updateWithReferencias(id, { pergunta, resposta, categoria, palavrasChave, referencias, status }) {
    return this.prisma.$transaction(async (tx) => {
      if (referencias) {
        await tx.referencia.deleteMany({ where: { perguntaId: Number(id) } });
      }

      return tx.pergunta.update({
        where: { id: Number(id) },
        data: {
          ...(pergunta !== undefined ? { pergunta } : {}),
          ...(resposta !== undefined ? { resposta } : {}),
          ...(categoria !== undefined ? { categoria: categoria || null } : {}),
          ...(palavrasChave !== undefined ? { palavrasChave } : {}),
          ...(status !== undefined ? { status } : {}),
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

  // Enriquece uma pergunta já carregada com `favoritada`/`lida` para um identificador.
  async anotarEstadoDoUsuario(pergunta, identificador) {
    if (!pergunta || !identificador) return pergunta;
    const [favorito, leitura] = await this.prisma.$transaction([
      this.prisma.favorito.findUnique({ where: { perguntaId_identificador: { perguntaId: pergunta.id, identificador } } }),
      this.prisma.leitura.findUnique({ where: { perguntaId_identificador: { perguntaId: pergunta.id, identificador } } }),
    ]);
    return { ...pergunta, favoritada: !!favorito, lida: !!leitura };
  }

  // ── Admin ──────────────────────────────────────────────────────────
  // Ao contrário de `search` (pública, só vê PUBLICADA), esta enxerga todos os
  // status — usada pelo painel de moderação. Sem `status`, lista todas.
  // Ordena da mais antiga pra mais nova (fila: quem perguntou primeiro é
  // respondido primeiro).
  //
  // `categoria` e `ordem` são opcionais e servem à tela "Perguntas & Respostas"
  // (biblioteca): ordem 'recentes' inverte a fila; 'antigas' é o padrão.
  async listAdmin({ status, q, categoria, ordem = 'antigas', page, limit }) {
    const where = {};
    if (status) where.status = status;
    if (categoria) where.categoria = { equals: categoria, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { pergunta: { contains: q, mode: 'insensitive' } },
        { resposta: { contains: q, mode: 'insensitive' } },
      ];
    }

    const total = await this.model.count({ where });
    const skip = (page - 1) * limit;
    const data = await this.model.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: ordem === 'recentes' ? 'desc' : 'asc' }, { id: 'asc' }],
      include: {
        referencias: true,
        _count: { select: { comentarios: true, favoritos: true } },
      },
    });

    return { data, total };
  }

  // Detalhe completo pro painel (qualquer status): referências, contagens de
  // engajamento, reações separadas por tipo e os comentários mais recentes.
  async getAdminDetalhe(id, { comentariosLimit = 20 } = {}) {
    const perguntaId = Number(id);
    const pergunta = await this.model.findUnique({
      where: { id: perguntaId },
      include: {
        referencias: { orderBy: { id: 'asc' } },
        comentarios: { orderBy: { createdAt: 'desc' }, take: comentariosLimit },
        _count: { select: { comentarios: true, favoritos: true, leituras: true } },
      },
    });
    if (!pergunta) return null;

    const grupos = await this.prisma.reacao.groupBy({
      by: ['tipo'],
      where: { perguntaId },
      _count: { tipo: true },
    });
    const reacoes = { ESCLARECIDA: 0, DUVIDA: 0 };
    grupos.forEach((g) => { reacoes[g.tipo] = g._count.tipo; });

    return { ...pergunta, reacoes };
  }

  // Muda o status de várias perguntas de uma vez (ex: arquivar as selecionadas
  // na lista). Retorna quantas foram afetadas.
  async updateManyStatus(ids, status) {
    return this.model.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: { status },
    });
  }

  // Exclui várias perguntas de uma vez (referências saem em cascata).
  async deleteMany(ids) {
    return this.model.deleteMany({ where: { id: { in: ids.map(Number) } } });
  }

  // Todas as categorias em uso (só entre perguntas PUBLICADA), com contagem —
  // serve pra montar os chips de filtro por categoria na UI.
  async listCategorias() {
    const grupos = await this.model.groupBy({
      by: ['categoria'],
      where: { status: 'PUBLICADA', categoria: { not: null } },
      _count: { categoria: true },
      orderBy: { categoria: 'asc' },
    });
    return grupos.map((g) => ({ categoria: g.categoria, total: g._count.categoria }));
  }

  // Busca com paginação. `q` pesquisa em pergunta/resposta; `bookSlug` filtra por
  // livro citado; `categoria` filtra por categoria exata; `keyword` filtra por uma
  // palavra-chave exata. Só retorna PUBLICADA.
  //
  // Quando `identificador` é enviado, perguntas que esse identificador já marcou
  // como "lida" vão para o final da lista (sem quebrar a paginação: calculamos
  // em qual das duas partições — não lidas / lidas — cada página cai).
  async search({ q, bookSlug, categoria, keyword, identificador, page, limit }) {
    const where = { status: 'PUBLICADA' };

    if (q) {
      where.OR = [
        { pergunta: { contains: q, mode: 'insensitive' } },
        { resposta: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (bookSlug) where.referencias = { some: { bookSlug } };
    if (categoria) where.categoria = { equals: categoria, mode: 'insensitive' };
    if (keyword) where.palavrasChave = { has: keyword };

    const total = await this.model.count({ where });
    const skip = (page - 1) * limit;
    const orderBy = { createdAt: 'desc' };
    const include = { referencias: true };

    let data;

    if (!identificador) {
      data = await this.model.findMany({ where, skip, take: limit, orderBy, include });
      return { data, total };
    }

    // ids que esse identificador já leu, dentro do conjunto filtrado
    const lidasIds = (
      await this.prisma.leitura.findMany({
        where: { identificador, pergunta: where },
        select: { perguntaId: true },
      })
    ).map((l) => l.perguntaId);

    const whereNaoLidas = lidasIds.length ? { ...where, id: { notIn: lidasIds } } : where;
    const whereLidas = { ...where, id: { in: lidasIds } };
    const totalNaoLidas = lidasIds.length ? await this.model.count({ where: whereNaoLidas }) : total;

    let naoLidas = [];
    let lidas = [];

    if (skip < totalNaoLidas) {
      naoLidas = await this.model.findMany({ where: whereNaoLidas, skip, take: limit, orderBy, include });
      const faltam = limit - naoLidas.length;
      if (faltam > 0 && lidasIds.length) {
        lidas = await this.model.findMany({ where: whereLidas, skip: 0, take: faltam, orderBy, include });
      }
    } else if (lidasIds.length) {
      lidas = await this.model.findMany({ where: whereLidas, skip: skip - totalNaoLidas, take: limit, orderBy, include });
    }

    // marca a flag `lida` em cada item (já sabemos de qual partição veio, sem custo extra)
    data = [
      ...naoLidas.map((p) => ({ ...p, lida: false })),
      ...lidas.map((p) => ({ ...p, lida: true })),
    ];

    // enriquece com `favoritada` pro identificador, numa query só pros ids da página
    if (data.length) {
      const favoritos = await this.prisma.favorito.findMany({
        where: { identificador, perguntaId: { in: data.map((p) => p.id) } },
        select: { perguntaId: true },
      });
      const favoritaIds = new Set(favoritos.map((f) => f.perguntaId));
      data = data.map((p) => ({ ...p, favoritada: favoritaIds.has(p.id) }));
    }

    return { data, total };
  }
}
