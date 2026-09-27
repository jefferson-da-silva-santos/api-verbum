import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';
process.env.ADMIN_EMAIL = 'admin@verbum.app';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('senha-correta', 4);

// ── Fake repository, no mesmo padrão dos outros testes ──────────────

const perguntaPendente = {
  id: 1, pergunta: 'Existe vida após a morte?', resposta: null, status: 'PENDENTE',
  autorPergunta: 'Fulano', categoria: null, palavrasChave: [], referencias: [], createdAt: new Date().toISOString(),
};
const perguntaArquivada = {
  id: 2, pergunta: 'O que é o milênio?', resposta: null, status: 'ARQUIVADA',
  autorPergunta: null, categoria: null, palavrasChave: [], referencias: [], createdAt: new Date().toISOString(),
};

let banco = [];
const resetBanco = () => { banco = [{ ...perguntaPendente }, { ...perguntaArquivada }]; };
resetBanco();

const perguntaRepository = {
  getById: async (id) => banco.find((p) => p.id === Number(id)) || null,
  updateWithReferencias: async (id, data) => {
    const p = banco.find((x) => x.id === Number(id));
    Object.assign(p, data);
    return p;
  },
  listAdmin: async ({ status, q, page = 1, limit = 20 }) => {
    let data = banco;
    if (status) data = data.filter((p) => p.status === status);
    if (q) data = data.filter((p) => p.pergunta.includes(q));
    const total = data.length;
    const start = (page - 1) * limit;
    return { data: data.slice(start, start + limit), total };
  },
  updateManyStatus: async (ids, status) => {
    let count = 0;
    banco.forEach((p) => { if (ids.includes(p.id)) { p.status = status; count += 1; } });
    return { count };
  },
  deleteMany: async (ids) => {
    const antes = banco.length;
    banco = banco.filter((p) => !ids.includes(p.id));
    return { count: antes - banco.length };
  },
  getAdminDetalhe: async (id) => {
    const p = banco.find((x) => x.id === Number(id));
    if (!p) return null;
    return {
      ...p,
      comentarios: [],
      _count: { comentarios: 0, favoritos: 0, leituras: 0 },
      reacoes: { ESCLARECIDA: 0, DUVIDA: 0 },
    };
  },
  createWithReferencias: async (data) => {
    const nova = { id: 100 + banco.length, ...data, createdAt: new Date().toISOString() };
    banco.push(nova);
    return nova;
  },
};

const app = createApp({ perguntaRepository });

function tokenValido() {
  return jwt.sign({ sub: 'admin', email: process.env.ADMIN_EMAIL }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(resetBanco);

describe('POST /api/v1/admin/login', () => {
  it('devolve um token com credenciais corretas', async () => {
    const res = await request(app).post('/api/v1/admin/login').send({ email: 'admin@verbum.app', senha: 'senha-correta' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe('string');
  });

  it('rejeita senha errada', async () => {
    const res = await request(app).post('/api/v1/admin/login').send({ email: 'admin@verbum.app', senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejeita e-mail desconhecido', async () => {
    const res = await request(app).post('/api/v1/admin/login').send({ email: 'outro@verbum.app', senha: 'senha-correta' });
    expect(res.status).toBe(401);
  });

  it('422 quando falta campo obrigatório', async () => {
    const res = await request(app).post('/api/v1/admin/login').send({ email: 'admin@verbum.app' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/admin/perguntas', () => {
  it('exige token', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas');
    expect(res.status).toBe(401);
  });

  it('lista todos os status quando autenticado, sem filtro', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });

  it('filtra por status', async () => {
    const res = await request(app)
      .get('/api/v1/admin/perguntas?status=ARQUIVADA')
      .set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(2);
  });

  it('rejeita token inválido', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/admin/perguntas/:id', () => {
  it('exige token', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/1');
    expect(res.status).toBe(401);
  });

  it('devolve o detalhe de qualquer status (inclusive arquivada) com engajamento', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/2').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(2);
    expect(res.body.data.status).toBe('ARQUIVADA');
    expect(res.body.data.reacoes).toEqual({ ESCLARECIDA: 0, DUVIDA: 0 });
    expect(res.body.data._count.comentarios).toBe(0);
  });

  it('404 quando não existe', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/999').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(404);
  });

  it('422 com id inválido', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/abc').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/admin/perguntas — filtros da biblioteca', () => {
  it('aceita ?ordem=recentes e ?categoria=', async () => {
    const res = await request(app)
      .get('/api/v1/admin/perguntas?ordem=recentes&categoria=Escatologia')
      .set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
  });

  it('rejeita ordem inválida', async () => {
    const res = await request(app)
      .get('/api/v1/admin/perguntas?ordem=aleatoria')
      .set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/admin/perguntas/:id', () => {
  it('exige token', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/1');
    expect(res.status).toBe(401);
  });

  it('devolve o detalhe de qualquer status (inclusive arquivada) com engajamento', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/2').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(2);
    expect(res.body.data.status).toBe('ARQUIVADA');
    expect(res.body.data.reacoes).toEqual({ ESCLARECIDA: 0, DUVIDA: 0 });
    expect(res.body.data._count.comentarios).toBe(0);
  });

  it('404 quando não existe', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/999').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(404);
  });

  it('422 com id inválido', async () => {
    const res = await request(app).get('/api/v1/admin/perguntas/abc').set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/admin/perguntas — filtros da biblioteca', () => {
  it('aceita ?ordem=recentes e ?categoria=', async () => {
    const res = await request(app)
      .get('/api/v1/admin/perguntas?ordem=recentes&categoria=Escatologia')
      .set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(200);
  });

  it('rejeita ordem inválida', async () => {
    const res = await request(app)
      .get('/api/v1/admin/perguntas?ordem=aleatoria')
      .set('Authorization', `Bearer ${tokenValido()}`);
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/v1/admin/perguntas/arquivar', () => {
  it('arquiva em lote', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/perguntas/arquivar')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ ids: [1] });
    expect(res.status).toBe(200);
    expect(res.body.data.arquivadas).toBe(1);
    expect(banco.find((p) => p.id === 1).status).toBe('ARQUIVADA');
  });

  it('422 sem ids', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/perguntas/arquivar')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ ids: [] });
    expect(res.status).toBe(422);
  });
});

describe('DELETE /api/v1/admin/perguntas', () => {
  it('exclui em lote', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/perguntas')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ ids: [1, 2] });
    expect(res.status).toBe(200);
    expect(res.body.data.excluidas).toBe(2);
    expect(banco).toHaveLength(0);
  });
});

describe('rotas de escrita de /perguntas agora exigem token', () => {
  it('POST / sem token -> 401', async () => {
    const res = await request(app).post('/api/v1/perguntas').send({ pergunta: 'x', resposta: 'y' });
    expect(res.status).toBe(401);
  });

  it('PUT /:id sem token -> 401', async () => {
    const res = await request(app).put('/api/v1/perguntas/1').send({ resposta: 'y' });
    expect(res.status).toBe(401);
  });

  it('DELETE /:id sem token -> 401', async () => {
    const res = await request(app).delete('/api/v1/perguntas/1');
    expect(res.status).toBe(401);
  });

  it('PUT /:id com token válido funciona (é o fluxo de "responder")', async () => {
    const res = await request(app)
      .put('/api/v1/perguntas/1')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ resposta: 'Sim, conforme Jo 11.25.', status: 'PUBLICADA' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PUBLICADA');
  });
});

describe('rate limiter x painel admin', () => {
  it('requisições com token de admin válido não consomem a cota (navegar pelo painel não bloqueia)', async () => {
    const token = tokenValido();
    for (let i = 0; i < 60; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get('/api/v1/admin/perguntas/1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });
});

describe('POST /api/v1/perguntas (Nova pergunta no painel)', () => {
  it('cria já arquivada, guardando quem perguntou', async () => {
    const res = await request(app)
      .post('/api/v1/perguntas')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ pergunta: 'O que é graça comum?', resposta: 'É a bondade de Deus para com todos (Mt 5.45).', status: 'ARQUIVADA', autorPergunta: 'Ana' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ARQUIVADA');
    expect(res.body.data.autorPergunta).toBe('Ana');
  });

  it('publica por padrão', async () => {
    const res = await request(app)
      .post('/api/v1/perguntas')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ pergunta: 'O que é justificação?', resposta: 'Ser declarado justo pela fé (Rm 5.1).' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PUBLICADA');
  });

  it('422 sem resposta', async () => {
    const res = await request(app)
      .post('/api/v1/perguntas')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ pergunta: 'Pergunta sem resposta?' });
    expect(res.status).toBe(422);
  });
});
