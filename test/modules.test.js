import request from 'supertest';
import { createApp } from '../src/app.js';

// ── Fakes em memória, só para exercitar as rotas sem precisar de banco real ──

const perguntaExemplo = { id: 1, pergunta: 'Existe?', resposta: 'Sim.', status: 'PUBLICADA', referencias: [] };
const perguntaPendente = { id: 2, pergunta: 'Pendente?', resposta: null, status: 'PENDENTE', referencias: [] };

let sugestoesCriadas = [];
const perguntaRepository = {
  getById: async (id) => [perguntaExemplo, perguntaPendente].find((p) => p.id === Number(id)) || null,
  getPublicadaById: async (id) => (Number(id) === 1 ? perguntaExemplo : null),
  search: async () => ({ data: [perguntaExemplo], total: 1 }),
  createSugestao: async ({ pergunta, autorPergunta }) => {
    const p = { id: 100 + sugestoesCriadas.length, pergunta, autorPergunta: autorPergunta || null, status: 'PENDENTE', resposta: null };
    sugestoesCriadas.push(p);
    return p;
  },
};

let comentarios = [];
let nextComentarioId = 1;
const comentarioRepository = {
  create: async ({ perguntaId, texto, autor }) => {
    const c = { id: nextComentarioId++, perguntaId: Number(perguntaId), texto, autor: autor || null };
    comentarios.push(c);
    return c;
  },
  listByPergunta: async (perguntaId) => {
    const data = comentarios.filter((c) => c.perguntaId === Number(perguntaId));
    return { data, total: data.length };
  },
  getById: async (id) => comentarios.find((c) => c.id === Number(id)) || null,
  update: async (id, { texto }) => {
    const c = comentarios.find((x) => x.id === Number(id));
    c.texto = texto;
    return c;
  },
  delete: async (id) => {
    comentarios = comentarios.filter((c) => c.id !== Number(id));
  },
};

let reacoes = [];
const reacaoRepository = {
  upsert: async ({ perguntaId, tipo, identificador }) => {
    const existente = reacoes.find((r) => r.perguntaId === Number(perguntaId) && r.identificador === identificador);
    if (existente) {
      existente.tipo = tipo;
      return existente;
    }
    const r = { id: reacoes.length + 1, perguntaId: Number(perguntaId), tipo, identificador };
    reacoes.push(r);
    return r;
  },
  contarPorPergunta: async (perguntaId) => ({
    esclarecida: reacoes.filter((r) => r.perguntaId === Number(perguntaId) && r.tipo === 'ESCLARECIDA').length,
    duvida: reacoes.filter((r) => r.perguntaId === Number(perguntaId) && r.tipo === 'DUVIDA').length,
  }),
  findByIdentificador: async (perguntaId, identificador) =>
    reacoes.find((r) => r.perguntaId === Number(perguntaId) && r.identificador === identificador) || null,
  remove: async (perguntaId, identificador) => {
    reacoes = reacoes.filter((r) => !(r.perguntaId === Number(perguntaId) && r.identificador === identificador));
  },
  ranking: async (tipo) => {
    const total = reacoes.filter((r) => r.tipo === tipo && r.perguntaId === 1).length;
    return total > 0 ? { data: [{ ...perguntaExemplo, totalReacoes: total }], total: 1 } : { data: [], total: 0 };
  },
};

const app = createApp({ perguntaRepository, comentarioRepository, reacaoRepository });

describe('Módulo de Comentários', () => {
  it('cria e lista um comentário de uma pergunta existente', async () => {
    const create = await request(app)
      .post('/api/v1/perguntas/1/comentarios')
      .send({ texto: 'Muito bom esse estudo!', autor: 'Jefferson' });
    expect(create.status).toBe(201);
    expect(create.body.data.texto).toBe('Muito bom esse estudo!');

    const list = await request(app).get('/api/v1/perguntas/1/comentarios');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
  });

  it('retorna 404 ao comentar em pergunta inexistente', async () => {
    const res = await request(app).post('/api/v1/perguntas/999/comentarios').send({ texto: 'oi' });
    expect(res.status).toBe(404);
  });
});

describe('Envio público de pergunta (sugestão)', () => {
  it('cria a pergunta como PENDENTE, sem resposta', async () => {
    const res = await request(app)
      .post('/api/v1/perguntas/sugestoes')
      .send({ pergunta: 'Posso orar em qualquer lugar?', autorPergunta: 'Jefferson' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDENTE');
    expect(res.body.data.resposta).toBeNull();
  });

  it('não deixa comentar/reagir em pergunta ainda não publicada', async () => {
    const comentar = await request(app).post('/api/v1/perguntas/2/comentarios').send({ texto: 'oi' });
    expect(comentar.status).toBe(404);

    const reagir = await request(app)
      .post('/api/v1/perguntas/2/reacoes')
      .send({ tipo: 'ESCLARECIDA', identificador: 'x' });
    expect(reagir.status).toBe(404);
  });
});

describe('Módulo de Reações', () => {
  it('registra uma reação ESCLARECIDA e conta corretamente', async () => {
    const reagir = await request(app)
      .post('/api/v1/perguntas/1/reacoes')
      .send({ tipo: 'ESCLARECIDA', identificador: 'dispositivo-abc' });
    expect(reagir.status).toBe(200);

    const contagem = await request(app).get('/api/v1/perguntas/1/reacoes');
    expect(contagem.body.data).toEqual({ perguntaId: 1, esclarecida: 1, duvida: 0 });
  });

  it('troca o voto quando o mesmo identificador reage de novo', async () => {
    await request(app)
      .post('/api/v1/perguntas/1/reacoes')
      .send({ tipo: 'DUVIDA', identificador: 'dispositivo-abc' });

    const contagem = await request(app).get('/api/v1/perguntas/1/reacoes');
    expect(contagem.body.data).toEqual({ perguntaId: 1, esclarecida: 0, duvida: 1 });
  });

  it('retorna a pergunta no ranking de mais dúvidas', async () => {
    const res = await request(app).get('/api/v1/reacoes/ranking/duvidas');
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe(1);
    expect(res.body.data[0].totalReacoes).toBe(1);
  });

  it('consulta a reação atual de um identificador', async () => {
    const res = await request(app).get('/api/v1/perguntas/1/reacoes/dispositivo-abc');
    expect(res.status).toBe(200);
    expect(res.body.data.tipo).toBe('DUVIDA');
  });

  it('rejeita tipo de reação inválido', async () => {
    const res = await request(app)
      .post('/api/v1/perguntas/1/reacoes')
      .send({ tipo: 'MAISOMENOS', identificador: 'x' });
    expect(res.status).toBe(422);
  });
});
