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
  createWithReferencias: async () => { throw new Error('não usado neste teste'); },
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
