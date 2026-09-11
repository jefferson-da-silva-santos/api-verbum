import { prisma } from './config/database.js';
import { createApp } from './app.js';
import PerguntaRepository from './repositories/PerguntaRepository.js';
import ComentarioRepository from './repositories/ComentarioRepository.js';
import ReacaoRepository from './repositories/ReacaoRepository.js';
import FavoritoRepository from './repositories/FavoritoRepository.js';
import LeituraRepository from './repositories/LeituraRepository.js';

// Monta os repositórios (injeção de dependência) e devolve o app do Express
// pronto pra uso. Usado tanto pelo servidor tradicional (index.js, local/EC2/
// container) quanto pela função serverless da Vercel (api/index.js).
//
// Não conecta no banco aqui de propósito: o Prisma Client conecta sozinho
// (lazy) na primeira query. Isso é o que faz sentido em ambiente serverless —
// forçar um $connect() explícito antes de responder a primeira requisição só
// adiciona latência a todo cold start sem necessidade.
export function buildApp() {
  const repositories = {
    perguntaRepository: new PerguntaRepository(prisma),
    comentarioRepository: new ComentarioRepository(prisma),
    reacaoRepository: new ReacaoRepository(prisma),
    favoritoRepository: new FavoritoRepository(prisma),
    leituraRepository: new LeituraRepository(prisma),
    // próximos repositórios entram aqui
  };

  return createApp(repositories);
}
