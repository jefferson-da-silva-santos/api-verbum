import request from 'supertest';
import { createApp } from '../src/app.js';

// Repositório "fake" só para o app conseguir subir sem depender de um banco real.
const fakeRepository = {
  search: async () => ({ data: [], total: 0 }),
};

const app = createApp({ perguntaRepository: fakeRepository });

describe('GET /health', () => {
  it('deve responder 200 com status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/perguntas', () => {
  it('deve responder 200 com lista vazia (repositório fake)', async () => {
    const res = await request(app).get('/api/v1/perguntas');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
